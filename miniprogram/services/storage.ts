/**
 * StorageService - 通用本地存储服务
 * 封装微信小程序 wx.setStorageSync / wx.getStorageSync
 * 提供类型安全的 CRUD 操作、数据校验、版本管理
 */

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

/**
 * 通用存储服务类
 * 泛型 T 为存储的记录类型，必须包含 id 字段
 */
class StorageService<T extends { id: string }> {
  private storageKey: string;
  private cache: T[] | null = null;

  constructor(storageKey: string) {
    this.storageKey = storageKey;
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
    return all.find(item => item.id === id);
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
    return this.query(item => {
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
    return item;
  }

  /**
   * 批量添加记录
   */
  addBatch(items: T[]): T[] {
    const all = this.getAll();
    all.unshift(...items);
    this.saveToStorage(all);
    return items;
  }

  /**
   * 更新一条记录
   * @returns 更新后的记录，如果未找到则返回 undefined
   */
  update(id: string, updates: Partial<T>): T | undefined {
    const all = this.getAll();
    const index = all.findIndex(item => item.id === id);

    if (index === -1) {
      console.warn(`[StorageService] Record not found: ${id}`);
      return undefined;
    }

    // 不允许修改 id
    const { id: _ignoreId, ...safeUpdates } = updates as any;
    all[index] = { ...all[index], ...safeUpdates };
    this.saveToStorage(all);
    return all[index];
  }

  /**
   * 删除一条记录
   * @returns 是否删除成功
   */
  remove(id: string): boolean {
    const all = this.getAll();
    const index = all.findIndex(item => item.id === id);

    if (index === -1) {
      console.warn(`[StorageService] Record not found for deletion: ${id}`);
      return false;
    }

    all.splice(index, 1);
    this.saveToStorage(all);
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
    const filtered = all.filter(item => !idSet.has(item.id));
    this.saveToStorage(filtered);
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
  paginate(page: number = 1, pageSize: number = 20, predicate?: (item: T) => boolean): {
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
   * 内部方法：保存到 Storage 并更新缓存
   */
  private saveToStorage(data: T[]): void {
    this.cache = data;
    const wrapper: StorageData<T> = {
      version: STORAGE_VERSION,
      data,
      lastUpdated: nowISO(),
    };

    try {
      wx.setStorageSync(this.storageKey, wrapper);
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
export const babyStorage = new StorageService<any>('baby_info');

/** 喂养记录存储 */
export const feedingStorage = new StorageService<any>('feeding_records');

/** 睡眠记录存储 */
export const sleepStorage = new StorageService<any>('sleep_records');

/** 排便记录存储 */
export const diaperStorage = new StorageService<any>('diaper_records');

/** 健康记录存储 */
export const healthStorage = new StorageService<any>('health_records');

/** 生长记录存储 */
export const growthStorage = new StorageService<any>('growth_records');

/** 疫苗接种记录存储 */
export const vaccineStorage = new StorageService<any>('vaccine_records');

/** 里程碑记录存储 */
export const milestoneStorage = new StorageService<any>('milestone_records');

/**
 * 创建自定义存储实例
 * 用于需要特殊存储 key 的场景
 */
export function createStorage<T extends { id: string }>(key: string): StorageService<T> {
  return new StorageService<T>(key);
}

/**
 * 获取所有存储实例（用于批量导出/备份）
 */
export function getAllStorageInstances() {
  return {
    baby: babyStorage,
    feeding: feedingStorage,
    sleep: sleepStorage,
    diaper: diaperStorage,
    health: healthStorage,
    growth: growthStorage,
    vaccine: vaccineStorage,
    milestone: milestoneStorage,
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
