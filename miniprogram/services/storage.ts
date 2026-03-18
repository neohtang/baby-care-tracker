/**
 * StorageService - 通用本地存储服务
 * 封装微信小程序 wx.setStorageSync / wx.getStorageSync
 * 提供类型安全的 CRUD 操作、数据校验、版本管理
 */

import type {
  BabyInfo,
  FeedingRecord,
  SleepRecord,
  DiaperRecord,
  HealthRecord,
  GrowthRecord,
  VaccinationRecord,
  MilestoneRecord,
  ReminderSettings,
} from '../types/index';

/**
 * 延迟导入 syncService，避免循环依赖
 * sync.ts 导入了 storage.ts 的 nowISO，所以这里用懒加载模式
 */
let _syncService: any = null;
function getSyncService() {
  if (!_syncService) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      _syncService = require('./sync').syncService;
    } catch {
      // 首次加载可能模块还未就绪，静默忽略
    }
  }
  return _syncService;
}

/** 存储数据包装器 */
interface StorageData<T> {
  version: number;
  data: T[];
  lastUpdated: string;
}

/** 当前存储数据版本 */
const STORAGE_VERSION = 1;

/**
 * 生成唯一 ID
 * 使用时间戳 + 随机数的组合确保唯一性
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${random}`;
}

/**
 * 获取当前 ISO 时间字符串
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/** 默认防抖延迟（毫秒） */
const DEFAULT_DEBOUNCE_MS = 300;

/**
 * 通用存储服务类
 * 泛型 T 为存储的记录类型，必须包含 id 字段
 *
 * 性能优化：
 * - 内存缓存优先，避免频繁读取 Storage
 * - 写入操作支持防抖（debounce），高频操作自动合并为一次 I/O
 *
 * 云同步桥接：
 * - 当 syncCollection 非空时，add/update/remove 会自动调用
 *   SyncService.logChange() 记录变更日志，实现离线优先的增量同步
 */
class StorageService<T extends { id: string }> {
  private storageKey: string;
  private cache: T[] | null = null;
  private dirty: boolean = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private debounceMs: number;
  /** 云同步集合名。非空时自动桥接 SyncService */
  private syncCollection: string;

  constructor(
    storageKey: string,
    debounceMs: number = DEFAULT_DEBOUNCE_MS,
    syncCollection: string = '',
  ) {
    this.storageKey = storageKey;
    this.debounceMs = debounceMs;
    this.syncCollection = syncCollection || storageKey; // 默认用 storageKey 作为集合名
  }

  /**
   * 向 SyncService 写入变更日志（如果可用）
   */
  private _logSync(operation: 'create' | 'update' | 'delete', recordId: string, data?: any): void {
    if (!this.syncCollection) return;
    try {
      const sync = getSyncService();
      if (sync) {
        sync.logChange(this.syncCollection, recordId, operation, data);
      }
    } catch {
      // 同步服务不可用时静默忽略，不影响本地操作
    }
  }

  /**
   * 获取存储中的全部数据
   * 优先从内存缓存读取，避免频繁读取 Storage
   */
  getAll(): T[] {
    if (this.cache !== null) {
      return this.cache;
    }

    try {
      const raw = wx.getStorageSync(this.storageKey);
      if (!raw) {
        this.cache = [];
        return [];
      }

      const wrapper: StorageData<T> = typeof raw === 'string' ? JSON.parse(raw) : raw;

      // 版本兼容：如果是旧格式（直接数组），自动包装
      if (Array.isArray(raw)) {
        this.cache = raw as T[];
        this.saveToStorage(this.cache);
        return this.cache;
      }

      if (wrapper && Array.isArray(wrapper.data)) {
        this.cache = wrapper.data;
        return this.cache;
      }

      this.cache = [];
      return [];
    } catch (e) {
      console.error(`[StorageService] Failed to read ${this.storageKey}:`, e);
      this.cache = [];
      return [];
    }
  }

  /**
   * 根据 ID 获取单条记录
   */
  getById(id: string): T | undefined {
    const all = this.getAll();
    return all.find((item) => item.id === id);
  }

  /**
   * 根据条件筛选记录
   */
  query(predicate: (item: T) => boolean): T[] {
    const all = this.getAll();
    return all.filter(predicate);
  }

  /**
   * 按日期范围查询（需要记录包含时间字段）
   * @param dateField 用于比较的日期字段名
   * @param startDate 起始日期 YYYY-MM-DD
   * @param endDate 结束日期 YYYY-MM-DD
   */
  queryByDateRange(dateField: keyof T, startDate: string, endDate: string): T[] {
    return this.query((item) => {
      const dateValue = String(item[dateField]);
      const dateStr = dateValue.substring(0, 10); // 取 YYYY-MM-DD 部分
      return dateStr >= startDate && dateStr <= endDate;
    });
  }

  /**
   * 添加一条记录
   */
  add(item: T): T {
    const all = this.getAll();
    all.unshift(item); // 新记录插入到头部
    this.saveToStorage(all);
    this._logSync('create', item.id, item);
    return item;
  }

  /**
   * 批量添加记录
   */
  addBatch(items: T[]): T[] {
    const all = this.getAll();
    all.unshift(...items);
    this.saveToStorage(all);
    for (const item of items) {
      this._logSync('create', item.id, item);
    }
    return items;
  }

  /**
   * 更新一条记录
   * @returns 更新后的记录，如果未找到则返回 undefined
   */
  update(id: string, updates: Partial<T>): T | undefined {
    const all = this.getAll();
    const index = all.findIndex((item) => item.id === id);

    if (index === -1) {
      console.warn(`[StorageService] Record not found: ${id}`);
      return undefined;
    }

    // 不允许修改 id
    const { id: _ignoreId, ...safeUpdates } = updates as any;
    all[index] = { ...all[index], ...safeUpdates };
    this.saveToStorage(all);
    this._logSync('update', id, all[index]);
    return all[index];
  }

  /**
   * 删除一条记录
   * @returns 是否删除成功
   */
  remove(id: string): boolean {
    const all = this.getAll();
    const index = all.findIndex((item) => item.id === id);

    if (index === -1) {
      console.warn(`[StorageService] Record not found for deletion: ${id}`);
      return false;
    }

    all.splice(index, 1);
    this.saveToStorage(all);
    this._logSync('delete', id);
    return true;
  }

  /**
   * 批量删除记录
   * @returns 成功删除的数量
   */
  removeBatch(ids: string[]): number {
    const all = this.getAll();
    const idSet = new Set(ids);
    const originalLength = all.length;
    const filtered = all.filter((item) => !idSet.has(item.id));
    this.saveToStorage(filtered);
    for (const id of ids) {
      this._logSync('delete', id);
    }
    return originalLength - filtered.length;
  }

  /**
   * 清空该 key 下的所有数据
   */
  clear(): void {
    this.saveToStorage([]);
  }

  /**
   * 获取记录总数
   */
  count(): number {
    return this.getAll().length;
  }

  /**
   * 分页查询
   */
  paginate(
    page: number = 1,
    pageSize: number = 20,
    predicate?: (item: T) => boolean,
  ): {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  } {
    let data = this.getAll();
    if (predicate) {
      data = data.filter(predicate);
    }

    const total = data.length;
    const start = (page - 1) * pageSize;
    const items = data.slice(start, start + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      hasMore: start + pageSize < total,
    };
  }

  /**
   * 使缓存失效，下次读取时重新从 Storage 加载
   */
  invalidateCache(): void {
    this.cache = null;
  }

  /**
   * 获取原始存储数据（用于导出备份）
   */
  getRawData(): StorageData<T> {
    return {
      version: STORAGE_VERSION,
      data: this.getAll(),
      lastUpdated: nowISO(),
    };
  }

  /**
   * 从备份数据恢复
   */
  restoreFromBackup(backup: StorageData<T>): void {
    if (!backup || !Array.isArray(backup.data)) {
      throw new Error('Invalid backup data format');
    }
    this.saveToStorage(backup.data);
  }

  /**
   * 内部方法：标记数据已变更，延迟写入 Storage
   * 如果 debounceMs 为 0，则立即写入（兼容旧行为）
   */
  private saveToStorage(data: T[]): void {
    this.cache = data;
    this.dirty = true;

    if (this.debounceMs <= 0) {
      this.flushToStorage();
      return;
    }

    // 清除上一次的定时器，重新计时
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.flushToStorage();
    }, this.debounceMs);
  }

  /**
   * 立即将缓存数据写入 Storage
   * 外部可调用此方法在页面 onHide/onUnload 时确保数据持久化
   */
  flush(): void {
    if (this.dirty) {
      this.flushToStorage();
    }
  }

  /**
   * 内部方法：执行实际的 Storage 写入
   */
  private flushToStorage(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    const data = this.cache || [];
    const wrapper: StorageData<T> = {
      version: STORAGE_VERSION,
      data,
      lastUpdated: nowISO(),
    };

    try {
      wx.setStorageSync(this.storageKey, wrapper);
      this.dirty = false;
    } catch (e) {
      console.error(`[StorageService] Failed to save ${this.storageKey}:`, e);
      // 存储可能已满，尝试提示用户
      wx.showToast({
        title: '数据保存失败，存储空间可能不足',
        icon: 'none',
        duration: 2000,
      });
    }
  }
}

// ============ 按模块导出存储实例 ============

/** 宝宝信息存储 */
export const babyStorage = new StorageService<BabyInfo>('baby_info');

/** 喂养记录存储 */
export const feedingStorage = new StorageService<FeedingRecord>('feeding_records');

/** 睡眠记录存储 */
export const sleepStorage = new StorageService<SleepRecord>('sleep_records');

/** 排便记录存储 */
export const diaperStorage = new StorageService<DiaperRecord>('diaper_records');

/** 健康记录存储 */
export const healthStorage = new StorageService<HealthRecord>('health_records');

/** 生长记录存储 */
export const growthStorage = new StorageService<GrowthRecord>('growth_records');

/** 疫苗接种记录存储 */
export const vaccineStorage = new StorageService<VaccinationRecord>('vaccine_records');

/** 里程碑记录存储 */
export const milestoneStorage = new StorageService<MilestoneRecord>('milestone_records');

/** 提醒设置存储 */
export const reminderStorage = new StorageService<ReminderSettings>('reminder_settings');

/**
 * 创建自定义存储实例
 * 用于需要特殊存储 key 的场景
 * @param syncCollection 云同步集合名，传空字符串禁用同步
 */
export function createStorage<T extends { id: string }>(
  key: string,
  syncCollection?: string,
): StorageService<T> {
  return new StorageService<T>(key, DEFAULT_DEBOUNCE_MS, syncCollection);
}

/**
 * 获取所有存储实例（用于批量导出/备份）
 */
export function getAllStorageInstances(): {
  baby: StorageService<BabyInfo>;
  feeding: StorageService<FeedingRecord>;
  sleep: StorageService<SleepRecord>;
  diaper: StorageService<DiaperRecord>;
  health: StorageService<HealthRecord>;
  growth: StorageService<GrowthRecord>;
  vaccine: StorageService<VaccinationRecord>;
  milestone: StorageService<MilestoneRecord>;
  reminder: StorageService<ReminderSettings>;
} {
  return {
    baby: babyStorage,
    feeding: feedingStorage,
    sleep: sleepStorage,
    diaper: diaperStorage,
    health: healthStorage,
    growth: growthStorage,
    vaccine: vaccineStorage,
    milestone: milestoneStorage,
    reminder: reminderStorage,
  };
}

/**
 * 获取当前存储使用量信息
 */
export function getStorageInfo(): Promise<WechatMiniprogram.GetStorageInfoSyncOption> {
  return new Promise((resolve) => {
    try {
      const info = wx.getStorageInfoSync();
      resolve(info);
    } catch (e) {
      resolve({ keys: [], currentSize: 0, limitSize: 0 });
    }
  });
}

export default StorageService;
