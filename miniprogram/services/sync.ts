/**
 * SyncService - 云数据同步抽象层 (Phase 3.1)
 *
 * 设计原则：
 * 1. 离线优先（Offline-First）：本地操作立即生效，后台异步同步到云端
 * 2. 冲突解决：Last-Write-Wins (LWW) 基于 updatedAt 时间戳
 * 3. 增量同步：只同步有变更的记录，减少网络开销
 * 4. 透明切换：不影响现有 StorageService 使用方式，通过适配层桥接
 *
 * 架构：
 *   StorageService (本地缓存) ←→ SyncService ←→ CloudBase (远程)
 *
 * SDK：使用微信原生 wx.cloud API（零依赖，内置于微信运行时）
 *
 * 当前状态：
 * - ✅ 同步抽象层完整设计
 * - ✅ 本地变更日志 (Change Log)
 * - ✅ 离线优先 + 冲突解决
 * - ✅ 统一使用 wx.cloud
 */

import { nowISO } from './storage';
import eventBus, { Events } from '../utils/event-bus';

// ============ 类型定义 ============

/** 同步状态 */
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

/** 变更操作类型 */
export type ChangeOperation = 'create' | 'update' | 'delete';

/** 变更日志条目 */
export interface ChangeLogEntry {
  id: string;
  /** 数据集合名（如 'feeding_records'） */
  collection: string;
  /** 记录 ID */
  recordId: string;
  /** 操作类型 */
  operation: ChangeOperation;
  /** 变更数据快照 */
  data?: any;
  /** 变更时间 */
  timestamp: string;
  /** 是否已同步到云端 */
  synced: boolean;
  /** 同步失败次数 */
  retryCount: number;
}

/** 云端数据模型 */
export interface CloudRecord {
  _id: string; // 云端 ID
  localId: string; // 本地 ID（映射关系）
  collection: string; // 所属集合
  data: any; // 业务数据
  userId: string; // 用户 openId
  familyId?: string; // 家庭组 ID（Phase 3.2）
  createdAt: string;
  updatedAt: string;
  deletedAt?: string; // 软删除标记
  version: number; // 乐观锁版本号
}

/** 同步配置 */
export interface SyncConfig {
  /** 云开发环境 ID */
  envId: string;
  /** 是否启用自动同步 */
  autoSync: boolean;
  /** 自动同步间隔（毫秒） */
  syncInterval: number;
  /** 最大重试次数 */
  maxRetry: number;
  /** 需要同步的集合列表 */
  collections: string[];
}

/** 同步结果 */
export interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  conflicts: number;
  errors: string[];
  timestamp: string;
}

/** 实时监听变更回调参数 */
export interface WatchSnapshot {
  docChanges: Array<{
    dataType: 'init' | 'update' | 'replace' | 'add' | 'remove';
    doc: any;
    docId: string;
    updatedFields?: Record<string, any>;
  }>;
  docs: any[];
  type: string;
  id: number;
}

/** 实时监听句柄 */
export interface WatcherHandle {
  close: () => void;
}

// ============ 默认配置 ============

const DEFAULT_CONFIG: SyncConfig = {
  envId: '', // 需要用户配置
  autoSync: false,
  syncInterval: 5 * 60 * 1000, // 5 分钟
  maxRetry: 3,
  collections: [
    'baby_info',
    'feeding_records',
    'sleep_records',
    'diaper_records',
    'health_records',
    'growth_records',
    'vaccine_records',
    'milestone_records',
    'reminder_settings',
  ],
};

/** 变更日志存储 key */
const CHANGE_LOG_KEY = 'sync_change_log';
/** 同步配置存储 key */
const SYNC_CONFIG_KEY = 'sync_config';
/** 上次同步时间 key */
const LAST_SYNC_KEY = 'sync_last_timestamp';

// ============ 同步服务 ============

class SyncService {
  private config: SyncConfig;
  private status: SyncStatus = 'idle';
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isCloudReady: boolean = false;
  /** 实时监听句柄 Map（集合名 → watcher） */
  private watchers: Map<string, WatcherHandle> = new Map();
  /** 是否正在实时监听 */
  private _isWatching: boolean = false;

  constructor() {
    this.config = this._loadConfig();
  }

  // ============ 配置管理 ============

  /**
   * 获取当前同步状态
   */
  getStatus(): SyncStatus {
    return this.status;
  }

  /**
   * 获取同步配置
   */
  getConfig(): SyncConfig {
    return { ...this.config };
  }

  /**
   * 更新同步配置
   */
  updateConfig(updates: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...updates };
    this._saveConfig();

    // 自动同步开关
    if (updates.autoSync !== undefined) {
      if (updates.autoSync) {
        this.startAutoSync();
      } else {
        this.stopAutoSync();
      }
    }
  }

  /**
   * 检查云开发是否已初始化
   */
  isCloudEnabled(): boolean {
    return this.isCloudReady && !!this.config.envId;
  }

  /**
   * 初始化云开发连接
   * @param envId 云开发环境 ID（由 app.ts 在 wx.cloud.init 成功后直接传入，避免 getApp() 时序问题）
   */
  async initCloud(envId?: string): Promise<boolean> {
    try {
      // 优先使用直接传入的 envId，避免 onLaunch 期间 getApp().globalData 的时序问题
      const resolvedEnvId =
        envId ||
        (() => {
          try {
            const app = getApp<any>();
            return app?.globalData?.cloudEnvId || '';
          } catch {
            return '';
          }
        })();

      // 直接检测 wx.cloud 是否可用（而非依赖 getApp().globalData.cloudReady）
      if (!wx.cloud) {
        console.warn('[SyncService] wx.cloud 尚未初始化');
        return false;
      }

      if (resolvedEnvId && !this.config.envId) {
        this.config.envId = resolvedEnvId;
        this._saveConfig();
      }

      this.isCloudReady = true;
      console.log('[SyncService] wx.cloud 连接成功，env:', resolvedEnvId);
      return true;
    } catch (err) {
      console.error('[SyncService] wx.cloud 连接失败:', err);
      this.isCloudReady = false;
      return false;
    }
  }

  /**
   * 获取微信云开发数据库实例
   */
  private _getDatabase(): any {
    if (!this.isCloudReady || !wx.cloud) return null;
    return wx.cloud.database();
  }

  // ============ 变更日志（离线优先核心） ============

  /**
   * 记录一条本地变更（由 StorageService 的 CRUD 触发）
   */
  logChange(collection: string, recordId: string, operation: ChangeOperation, data?: any): void {
    const log = this._getChangeLog();
    const entry: ChangeLogEntry = {
      id: `cl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      collection,
      recordId,
      operation,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined,
      timestamp: nowISO(),
      synced: false,
      retryCount: 0,
    };

    log.push(entry);
    this._saveChangeLog(log);
  }

  /**
   * 获取待同步的变更数量
   */
  getPendingCount(): number {
    return this._getChangeLog().filter((e) => !e.synced).length;
  }

  /**
   * 获取上次同步时间
   */
  getLastSyncTime(): string | null {
    try {
      return wx.getStorageSync(LAST_SYNC_KEY) || null;
    } catch {
      return null;
    }
  }

  // ============ 同步执行 ============

  /**
   * 执行一次完整同步
   * 1. 上传本地变更到云端
   * 2. 从云端拉取新数据
   * 3. 处理冲突
   */
  async sync(): Promise<SyncResult> {
    if (this.status === 'syncing') {
      return {
        success: false,
        uploaded: 0,
        downloaded: 0,
        conflicts: 0,
        errors: ['同步正在进行中'],
        timestamp: nowISO(),
      };
    }

    if (!this.isCloudEnabled()) {
      this.status = 'offline';
      return {
        success: false,
        uploaded: 0,
        downloaded: 0,
        conflicts: 0,
        errors: ['云开发未初始化'],
        timestamp: nowISO(),
      };
    }

    this.status = 'syncing';
    const result: SyncResult = {
      success: true,
      uploaded: 0,
      downloaded: 0,
      conflicts: 0,
      errors: [],
      timestamp: nowISO(),
    };

    try {
      // Step 1: 上传本地变更
      const uploadResult = await this._uploadChanges();
      result.uploaded = uploadResult.count;
      result.errors.push(...uploadResult.errors);

      // Step 2: 下载云端变更
      const downloadResult = await this._downloadChanges();
      result.downloaded = downloadResult.count;
      result.conflicts = downloadResult.conflicts;
      result.errors.push(...downloadResult.errors);

      // 记录同步时间
      wx.setStorageSync(LAST_SYNC_KEY, nowISO());

      this.status = result.errors.length > 0 ? 'error' : 'success';
    } catch (err: any) {
      console.error('[SyncService] 同步失败:', err);
      result.success = false;
      result.errors.push(err?.message || '同步出错');
      this.status = 'error';
    }

    return result;
  }

  /**
   * 获取当前用户 ID（用于写入云端记录实现数据隔离）
   */
  private _getCurrentUserId(): string {
    try {
      return wx.getStorageSync('user_openid') || '';
    } catch {
      return '';
    }
  }

  /**
   * 上传本地变更到云端
   */
  private async _uploadChanges(): Promise<{ count: number; errors: string[] }> {
    const log = this._getChangeLog();
    const pending = log.filter((e) => !e.synced && e.retryCount < this.config.maxRetry);
    const errors: string[] = [];
    let count = 0;

    const db = this._getDatabase();
    if (!db) {
      return { count: 0, errors: ['数据库实例不可用'] };
    }

    const _ = db.command;
    const userId = this._getCurrentUserId();

    for (const entry of pending) {
      try {
        switch (entry.operation) {
          case 'create':
            await db.collection(entry.collection).add({
              localId: entry.recordId,
              data: entry.data,
              userId,
              updatedAt: entry.timestamp,
              createdAt: entry.timestamp,
              version: 1,
            });
            break;

          case 'update': {
            // 先查找云端对应记录并递增 version（乐观锁）
            const updateRes = await db
              .collection(entry.collection)
              .where({ localId: entry.recordId })
              .update({
                data: entry.data,
                userId,
                updatedAt: entry.timestamp,
                version: _.inc(1),
              });
            if (updateRes.updated === 0) {
              // 云端没有该记录，转为 create
              await db.collection(entry.collection).add({
                localId: entry.recordId,
                data: entry.data,
                userId,
                updatedAt: entry.timestamp,
                createdAt: entry.timestamp,
                version: 1,
              });
            }
            break;
          }

          case 'delete':
            // 软删除，同时递增 version
            await db
              .collection(entry.collection)
              .where({ localId: entry.recordId })
              .update({
                deletedAt: entry.timestamp,
                updatedAt: entry.timestamp,
                version: _.inc(1),
              });
            break;
        }

        entry.synced = true;
        count++;
      } catch (err: any) {
        entry.retryCount++;
        errors.push(
          `上传失败[${entry.collection}/${entry.recordId}]: ${err?.message || '未知错误'}`,
        );
      }
    }

    this._saveChangeLog(log);

    // 清理已同步且超过 7 天的日志
    this._cleanOldLogs();

    return { count, errors };
  }

  /**
   * 从云端下载变更
   * 使用 Last-Write-Wins (LWW) 冲突解决策略
   */
  private async _downloadChanges(): Promise<{
    count: number;
    conflicts: number;
    errors: string[];
  }> {
    const lastSync = this.getLastSyncTime();
    const errors: string[] = [];
    let count = 0;
    let conflicts = 0;

    const db = this._getDatabase();
    if (!db) {
      return { count: 0, conflicts: 0, errors: ['数据库实例不可用'] };
    }

    const _ = db.command;

    for (const collection of this.config.collections) {
      try {
        // 查询上次同步后的变更
        const query = db
          .collection(collection)
          .where(lastSync ? { updatedAt: _.gt(lastSync) } : { updatedAt: _.exists(true) });

        const res = await query.limit(1000).get();

        for (const cloudDoc of res.data) {
          const localId = cloudDoc.localId;
          if (!localId) continue;

          // 检查本地是否有更新的版本
          const localLog = this._getChangeLog().find(
            (e) => e.collection === collection && e.recordId === localId && !e.synced,
          );

          if (localLog && localLog.timestamp > cloudDoc.updatedAt) {
            // 本地更新更新，保留本地版本（LWW）
            conflicts++;
            continue;
          }

          // 云端版本更新，应用到本地
          if (!cloudDoc.deletedAt) {
            this._applyCloudUpdate(collection, localId, cloudDoc.data);
            count++;
          } else {
            this._applyCloudDelete(collection, localId);
            count++;
          }
        }
      } catch (err: any) {
        errors.push(`下载失败[${collection}]: ${err?.message || '未知错误'}`);
      }
    }

    return { count, conflicts, errors };
  }

  /**
   * 应用云端更新到本地存储
   */
  private _applyCloudUpdate(collection: string, localId: string, data: any): void {
    try {
      const raw = wx.getStorageSync(collection);
      if (!raw) return;

      const wrapper = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const items = Array.isArray(wrapper) ? wrapper : wrapper.data || [];

      const index = items.findIndex((item: any) => item.id === localId);
      if (index >= 0) {
        items[index] = { ...items[index], ...data };
      } else {
        items.unshift({ id: localId, ...data });
      }

      wx.setStorageSync(collection, {
        version: 1,
        data: items,
        lastUpdated: nowISO(),
      });
    } catch (err) {
      console.error(`[SyncService] 应用云端更新失败[${collection}/${localId}]:`, err);
    }
  }

  /**
   * 应用云端删除到本地存储
   */
  private _applyCloudDelete(collection: string, localId: string): void {
    try {
      const raw = wx.getStorageSync(collection);
      if (!raw) return;

      const wrapper = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const items = Array.isArray(wrapper) ? wrapper : wrapper.data || [];

      const filtered = items.filter((item: any) => item.id !== localId);

      wx.setStorageSync(collection, {
        version: 1,
        data: filtered,
        lastUpdated: nowISO(),
      });
    } catch (err) {
      console.error(`[SyncService] 应用云端删除失败[${collection}/${localId}]:`, err);
    }
  }

  // ============ 自动同步 ============

  /**
   * 启动自动同步定时器
   */
  startAutoSync(): void {
    this.stopAutoSync();

    if (!this.config.autoSync || !this.isCloudEnabled()) return;

    this.syncTimer = setInterval(() => {
      if (this.getPendingCount() > 0) {
        this.sync();
      }
    }, this.config.syncInterval);

    console.log(`[SyncService] 自动同步已启动，间隔 ${this.config.syncInterval / 1000}s`);
  }

  /**
   * 停止自动同步
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // ============ 实时数据监听 (Watch) ============

  /**
   * 是否正在实时监听
   */
  isWatching(): boolean {
    return this._isWatching;
  }

  /**
   * 启动实时数据监听
   * 对所有配置的集合建立 CloudBase watch 监听
   * 当云端数据变更时，自动应用到本地并通过 EventBus 通知 UI
   */
  startWatch(): void {
    if (this._isWatching) {
      console.log('[SyncService] 实时监听已在运行');
      return;
    }

    if (!this.isCloudEnabled()) {
      console.warn('[SyncService] 云开发未就绪，无法启动实时监听');
      return;
    }

    const db = this._getDatabase();
    if (!db) {
      console.warn('[SyncService] 数据库实例不可用，无法启动实时监听');
      return;
    }

    const userId = this._getCurrentUserId();
    if (!userId) {
      console.warn('[SyncService] 用户 ID 未就绪，延迟启动实时监听');
      return;
    }

    // 对每个需要同步的集合建立 watch
    for (const collection of this.config.collections) {
      this._watchCollection(db, collection, userId);
    }

    // 同时监听 family_groups 集合
    this._watchCollection(db, 'family_groups', userId);

    this._isWatching = true;
    console.log(`[SyncService] 实时监听已启动，监听 ${this.watchers.size} 个集合`);
  }

  /**
   * 停止所有实时监听
   */
  stopWatch(): void {
    if (!this._isWatching) return;

    for (const [name, watcher] of this.watchers.entries()) {
      try {
        watcher.close();
        console.log(`[SyncService] 停止监听集合: ${name}`);
      } catch (err) {
        console.warn(`[SyncService] 关闭监听失败[${name}]:`, err);
      }
    }

    this.watchers.clear();
    this._isWatching = false;
    console.log('[SyncService] 实时监听已全部停止');
  }

  /**
   * 对单个集合建立 watch 监听
   */
  private _watchCollection(db: any, collection: string, userId: string): void {
    try {
      // 监听属于当前用户的数据（通过 userId 隔离）
      const watcher = db
        .collection(collection)
        .where({ userId })
        .watch({
          onChange: (snapshot: WatchSnapshot) => {
            this._handleWatchChange(collection, snapshot);
          },
          onError: (err: any) => {
            console.error(`[SyncService] 实时监听错误[${collection}]:`, err);
            // 自动移除失败的 watcher
            this.watchers.delete(collection);
            // 尝试重连（3秒延迟）
            setTimeout(() => {
              if (this._isWatching && this.isCloudEnabled()) {
                console.log(`[SyncService] 尝试重连监听[${collection}]...`);
                const newDb = this._getDatabase();
                if (newDb) {
                  this._watchCollection(newDb, collection, userId);
                }
              }
            }, 3000);
          },
        });

      this.watchers.set(collection, watcher);
    } catch (err) {
      console.error(`[SyncService] 建立监听失败[${collection}]:`, err);
    }
  }

  /**
   * 处理 watch 变更回调
   * 将云端变更应用到本地存储并通过 EventBus 通知 UI 刷新
   */
  private _handleWatchChange(collection: string, snapshot: WatchSnapshot): void {
    if (!snapshot.docChanges || snapshot.docChanges.length === 0) return;

    let hasChanges = false;

    for (const change of snapshot.docChanges) {
      // 跳过初始化快照（init 类型是首次加载时的全量数据）
      if (change.dataType === 'init') continue;

      const doc = change.doc;
      const localId = doc?.localId;
      if (!localId) continue;

      // 检查是否是自己刚上传的变更（通过 change log 判断，避免回环）
      const recentLog = this._getChangeLog().find(
        (e) =>
          e.collection === collection &&
          e.recordId === localId &&
          e.synced &&
          Date.now() - new Date(e.timestamp).getTime() < 5000,
      );
      if (recentLog) {
        // 5秒内自己同步的数据，跳过回环处理
        continue;
      }

      switch (change.dataType) {
        case 'add':
        case 'update':
        case 'replace':
          if (!doc.deletedAt) {
            this._applyCloudUpdate(collection, localId, doc.data);
            hasChanges = true;
          } else {
            this._applyCloudDelete(collection, localId);
            hasChanges = true;
          }
          break;

        case 'remove':
          this._applyCloudDelete(collection, localId);
          hasChanges = true;
          break;
      }
    }

    // 有实际变更时，通过 EventBus 通知 UI 刷新
    if (hasChanges) {
      const eventName = this._collectionToEvent(collection);
      if (eventName) {
        eventBus.emit(eventName);
        console.log(`[SyncService] 实时更新[${collection}] → 触发 ${eventName}`);
      }
    }
  }

  /**
   * 将集合名映射到 EventBus 事件名
   */
  private _collectionToEvent(collection: string): string | null {
    const mapping: Record<string, string> = {
      feeding_records: Events.FEEDING_CHANGED,
      sleep_records: Events.SLEEP_CHANGED,
      diaper_records: Events.DIAPER_CHANGED,
      health_records: Events.HEALTH_CHANGED,
      growth_records: Events.GROWTH_CHANGED,
      vaccine_records: Events.VACCINE_CHANGED,
      milestone_records: Events.MILESTONE_CHANGED,
      baby_info: Events.BABY_CHANGED,
      reminder_settings: Events.REMINDER_SETTINGS_CHANGED,
      family_groups: Events.DATA_RESTORED, // 家庭数据变更触发全量刷新
    };
    return mapping[collection] || null;
  }

  // ============ 数据迁移 ============

  /**
   * 将全部本地数据迁移到云端（首次同步/全量上传）
   */
  async migrateToCloud(): Promise<SyncResult> {
    if (!this.isCloudEnabled()) {
      return {
        success: false,
        uploaded: 0,
        downloaded: 0,
        conflicts: 0,
        errors: ['云开发未初始化'],
        timestamp: nowISO(),
      };
    }

    const result: SyncResult = {
      success: true,
      uploaded: 0,
      downloaded: 0,
      conflicts: 0,
      errors: [],
      timestamp: nowISO(),
    };

    for (const collection of this.config.collections) {
      try {
        const raw = wx.getStorageSync(collection);
        if (!raw) continue;

        const wrapper = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const items = Array.isArray(wrapper) ? wrapper : wrapper.data || [];

        for (const item of items) {
          this.logChange(collection, item.id, 'create', item);
          result.uploaded++;
        }
      } catch (err: any) {
        result.errors.push(`迁移失败[${collection}]: ${err?.message || '未知错误'}`);
      }
    }

    // 执行实际上传
    if (result.uploaded > 0) {
      const syncResult = await this.sync();
      result.errors.push(...syncResult.errors);
      result.success = syncResult.success;
    }

    return result;
  }

  // ============ 内部方法 ============

  private _getChangeLog(): ChangeLogEntry[] {
    try {
      const raw = wx.getStorageSync(CHANGE_LOG_KEY);
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  private _saveChangeLog(log: ChangeLogEntry[]): void {
    try {
      wx.setStorageSync(CHANGE_LOG_KEY, log);
    } catch (err) {
      console.error('[SyncService] 保存变更日志失败:', err);
    }
  }

  private _cleanOldLogs(): void {
    const log = this._getChangeLog();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const cleaned = log.filter((e) => !e.synced || e.timestamp > sevenDaysAgo);
    if (cleaned.length !== log.length) {
      this._saveChangeLog(cleaned);
    }
  }

  private _loadConfig(): SyncConfig {
    try {
      const raw = wx.getStorageSync(SYNC_CONFIG_KEY);
      return raw ? { ...DEFAULT_CONFIG, ...raw } : { ...DEFAULT_CONFIG };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  private _saveConfig(): void {
    try {
      wx.setStorageSync(SYNC_CONFIG_KEY, this.config);
    } catch (err) {
      console.error('[SyncService] 保存同步配置失败:', err);
    }
  }
}

export const syncService = new SyncService();
export default syncService;
