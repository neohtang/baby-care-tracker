/**
 * StorageService 单元测试
 * 覆盖泛型 CRUD、缓存、分页、备份恢复
 */
import { clearMockStorage, setMockStorageData } from '../setup';
import {
  babyStorage,
  feedingStorage,
  generateId,
  nowISO,
  createStorage,
  getAllStorageInstances,
  getStorageInfo,
} from '../../miniprogram/services/storage';

describe('StorageService', () => {
  beforeEach(() => {
    clearMockStorage();
    // 确保缓存失效，从 storage 重新读取
    babyStorage.invalidateCache();
    feedingStorage.invalidateCache();
  });

  // ========== generateId / nowISO ==========
  describe('generateId', () => {
    it('应返回非空字符串', () => {
      const id = generateId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
    });

    it('连续调用应生成不同 ID', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('nowISO', () => {
    it('应返回 ISO 格式字符串', () => {
      const iso = nowISO();
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ========== getAll ==========
  describe('getAll', () => {
    it('空存储返回空数组', () => {
      expect(babyStorage.getAll()).toEqual([]);
    });

    it('有数据时返回正确数据', () => {
      const item = { id: '1', name: '小明' };
      babyStorage.add(item);
      const all = babyStorage.getAll();
      expect(all).toHaveLength(1);
      expect(all[0]).toMatchObject(item);
    });

    it('缓存命中时不再调用 wx.getStorageSync', () => {
      babyStorage.getAll(); // 第一次读取
      (wx.getStorageSync as jest.Mock).mockClear();
      babyStorage.getAll(); // 第二次应命中缓存
      expect(wx.getStorageSync).not.toHaveBeenCalled();
    });
  });

  // ========== getById ==========
  describe('getById', () => {
    it('存在的 ID 返回对应记录', () => {
      babyStorage.add({ id: 'a', name: 'A' });
      babyStorage.add({ id: 'b', name: 'B' });
      expect(babyStorage.getById('a')?.name).toBe('A');
    });

    it('不存在的 ID 返回 undefined', () => {
      expect(babyStorage.getById('nonexistent')).toBeUndefined();
    });
  });

  // ========== query ==========
  describe('query', () => {
    it('按条件筛选', () => {
      babyStorage.add({ id: '1', gender: 'male' });
      babyStorage.add({ id: '2', gender: 'female' });
      babyStorage.add({ id: '3', gender: 'male' });
      const males = babyStorage.query((item: any) => item.gender === 'male');
      expect(males).toHaveLength(2);
    });
  });

  // ========== queryByDateRange ==========
  describe('queryByDateRange', () => {
    it('按日期范围查询', () => {
      feedingStorage.add({ id: '1', startTime: '2025-06-10T08:00:00' });
      feedingStorage.add({ id: '2', startTime: '2025-06-15T08:00:00' });
      feedingStorage.add({ id: '3', startTime: '2025-06-20T08:00:00' });

      const results = feedingStorage.queryByDateRange('startTime' as any, '2025-06-10', '2025-06-15');
      expect(results).toHaveLength(2);
    });
  });

  // ========== add ==========
  describe('add', () => {
    it('新记录插入到头部', () => {
      babyStorage.add({ id: '1', name: 'First' });
      babyStorage.add({ id: '2', name: 'Second' });
      const all = babyStorage.getAll();
      expect(all[0].id).toBe('2'); // 后插入的在头部
      expect(all[1].id).toBe('1');
    });

    it('add 返回插入的记录', () => {
      const item = { id: '1', name: 'Test' };
      const returned = babyStorage.add(item);
      expect(returned).toEqual(item);
    });
  });

  // ========== addBatch ==========
  describe('addBatch', () => {
    it('批量添加到头部', () => {
      babyStorage.add({ id: '0', name: 'Existing' });
      babyStorage.addBatch([
        { id: '1', name: 'Batch1' },
        { id: '2', name: 'Batch2' },
      ]);
      const all = babyStorage.getAll();
      expect(all).toHaveLength(3);
      expect(all[0].id).toBe('1'); // batch 在头部
    });
  });

  // ========== update ==========
  describe('update', () => {
    it('正常更新返回更新后的记录', () => {
      babyStorage.add({ id: '1', name: 'Old' });
      const updated = babyStorage.update('1', { name: 'New' } as any);
      expect(updated?.name).toBe('New');
    });

    it('不存在的 ID 返回 undefined', () => {
      const result = babyStorage.update('nonexistent', { name: 'Test' } as any);
      expect(result).toBeUndefined();
    });

    it('不允许修改 id', () => {
      babyStorage.add({ id: '1', name: 'Original' });
      babyStorage.update('1', { id: 'changed', name: 'Updated' } as any);
      const item = babyStorage.getById('1');
      expect(item?.id).toBe('1'); // ID 不变
      expect(item?.name).toBe('Updated');
    });
  });

  // ========== remove ==========
  describe('remove', () => {
    it('存在的记录删除成功返回 true', () => {
      babyStorage.add({ id: '1', name: 'Test' });
      expect(babyStorage.remove('1')).toBe(true);
      expect(babyStorage.getAll()).toHaveLength(0);
    });

    it('不存在的记录返回 false', () => {
      expect(babyStorage.remove('nonexistent')).toBe(false);
    });
  });

  // ========== removeBatch ==========
  describe('removeBatch', () => {
    it('批量删除返回删除数量', () => {
      babyStorage.add({ id: '1', name: 'A' });
      babyStorage.add({ id: '2', name: 'B' });
      babyStorage.add({ id: '3', name: 'C' });
      const count = babyStorage.removeBatch(['1', '3']);
      expect(count).toBe(2);
      expect(babyStorage.getAll()).toHaveLength(1);
      expect(babyStorage.getById('2')).toBeDefined();
    });
  });

  // ========== clear ==========
  describe('clear', () => {
    it('清空所有数据', () => {
      babyStorage.add({ id: '1', name: 'A' });
      babyStorage.add({ id: '2', name: 'B' });
      babyStorage.clear();
      expect(babyStorage.getAll()).toHaveLength(0);
    });
  });

  // ========== count ==========
  describe('count', () => {
    it('正确返回记录数量', () => {
      expect(babyStorage.count()).toBe(0);
      babyStorage.add({ id: '1', name: 'A' });
      expect(babyStorage.count()).toBe(1);
    });
  });

  // ========== paginate ==========
  describe('paginate', () => {
    beforeEach(() => {
      for (let i = 1; i <= 25; i++) {
        babyStorage.add({ id: `${i}`, name: `Baby${i}` });
      }
    });

    it('默认分页返回前20条', () => {
      const result = babyStorage.paginate();
      expect(result.items).toHaveLength(20);
      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
      expect(result.hasMore).toBe(true);
    });

    it('第二页返回剩余记录', () => {
      const result = babyStorage.paginate(2, 20);
      expect(result.items).toHaveLength(5);
      expect(result.hasMore).toBe(false);
    });

    it('带过滤条件的分页', () => {
      const result = babyStorage.paginate(1, 10, (item: any) => parseInt(item.id) <= 5);
      expect(result.total).toBe(5);
      expect(result.items.length).toBeLessThanOrEqual(5);
    });
  });

  // ========== invalidateCache ==========
  describe('invalidateCache', () => {
    it('失效缓存后下次读取从 Storage 加载', () => {
      babyStorage.getAll(); // 建立缓存
      (wx.getStorageSync as jest.Mock).mockClear();

      babyStorage.invalidateCache();
      babyStorage.getAll();

      expect(wx.getStorageSync).toHaveBeenCalled();
    });
  });

  // ========== getRawData / restoreFromBackup ==========
  describe('getRawData / restoreFromBackup', () => {
    it('getRawData 返回带版本号的包装数据', () => {
      babyStorage.add({ id: '1', name: 'Test' });
      const raw = babyStorage.getRawData();
      expect(raw.version).toBe(1);
      expect(raw.data).toHaveLength(1);
      expect(raw.lastUpdated).toBeTruthy();
    });

    it('restoreFromBackup 恢复数据', () => {
      const backup = {
        version: 1,
        data: [{ id: '1', name: 'Restored' }, { id: '2', name: 'Restored2' }],
        lastUpdated: '2025-06-15T00:00:00.000Z',
      };
      babyStorage.restoreFromBackup(backup);
      expect(babyStorage.getAll()).toHaveLength(2);
      expect(babyStorage.getById('1')?.name).toBe('Restored');
    });

    it('无效备份数据抛异常', () => {
      expect(() => babyStorage.restoreFromBackup(null as any)).toThrow('Invalid backup data format');
      expect(() => babyStorage.restoreFromBackup({} as any)).toThrow('Invalid backup data format');
    });
  });

  // ========== 版本兼容（旧数组格式） ==========
  describe('旧数组格式兼容', () => {
    it('直接数组格式自动包装', () => {
      const storage = createStorage<any>('test_compat');
      // 直接设置旧格式数据（纯数组）
      setMockStorageData('test_compat', [{ id: '1', name: 'Old' }]);

      const all = storage.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].name).toBe('Old');
    });
  });

  // ========== Storage 异常处理 ==========
  describe('Storage 异常处理', () => {
    it('读取异常返回空数组', () => {
      (wx.getStorageSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      const storage = createStorage<any>('test_error');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const all = storage.getAll();
      expect(all).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('写入异常调用 showToast', () => {
      (wx.setStorageSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Storage full');
      });

      const storage = createStorage<any>('test_write_error');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      storage.add({ id: '1', name: 'Test' });
      expect(wx.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('保存失败') })
      );
      consoleSpy.mockRestore();
    });
  });

  // ========== createStorage / getAllStorageInstances ==========
  describe('createStorage / getAllStorageInstances', () => {
    it('createStorage 创建新的存储实例', () => {
      const custom = createStorage<any>('custom_key');
      custom.add({ id: '1', name: 'Custom' });
      expect(custom.count()).toBe(1);
    });

    it('getAllStorageInstances 返回所有预定义实例', () => {
      const instances = getAllStorageInstances();
      expect(instances.baby).toBeDefined();
      expect(instances.feeding).toBeDefined();
      expect(instances.sleep).toBeDefined();
      expect(instances.diaper).toBeDefined();
      expect(instances.health).toBeDefined();
      expect(instances.growth).toBeDefined();
      expect(instances.vaccine).toBeDefined();
      expect(instances.milestone).toBeDefined();
    });
  });

  // ========== getStorageInfo ==========
  describe('getStorageInfo', () => {
    it('返回存储信息', async () => {
      const info = await getStorageInfo();
      expect(info).toBeDefined();
      expect(Array.isArray(info.keys)).toBe(true);
    });
  });
});
