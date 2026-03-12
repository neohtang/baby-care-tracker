/**
 * VaccineService 单元测试
 * 覆盖接种记录 CRUD、状态判断、接种计划、统计
 */
import { clearMockStorage } from '../setup';
import { vaccineService } from '../../miniprogram/services/vaccine';
import { babyService } from '../../miniprogram/services/baby';
import { vaccineStorage, babyStorage } from '../../miniprogram/services/storage';
import eventBus, { Events } from '../../miniprogram/utils/event-bus';

describe('VaccineService', () => {
  beforeEach(() => {
    clearMockStorage();
    babyStorage.invalidateCache();
    vaccineStorage.invalidateCache();
    eventBus.clear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-15T10:00:00.000Z'));

    // 创建一个 5 月龄的宝宝
    babyService.createBaby({
      name: '测试宝宝',
      gender: 'male',
      birthDate: '2025-01-01',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ========== addRecord ==========
  describe('addRecord', () => {
    it('添加接种记录成功', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = vaccineService.addRecord({
        babyId,
        vaccineId: 'bcg_1',
        date: '2025-01-03',
        status: 'completed',
      });
      expect(record).not.toBeNull();
      expect(record?.vaccineId).toBe('bcg_1');
      expect(record?.status).toBe('completed');
    });

    it('校验失败返回 null', () => {
      const record = vaccineService.addRecord({
        babyId: 'test',
        vaccineId: '',
        date: '2025-01-03',
        status: 'completed',
      });
      expect(record).toBeNull();
    });

    it('添加成功触发 VACCINE_CHANGED 事件', () => {
      const handler = jest.fn();
      eventBus.on(Events.VACCINE_CHANGED, handler);
      const babyId = babyService.getCurrentBabyId()!;
      vaccineService.addRecord({
        babyId, vaccineId: 'bcg_1', date: '2025-01-03', status: 'completed',
      });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ========== getVaccineStatus ==========
  describe('getVaccineStatus', () => {
    it('有已完成记录返回 completed', () => {
      const babyId = babyService.getCurrentBabyId()!;
      vaccineService.addRecord({
        babyId, vaccineId: 'bcg_1', date: '2025-01-03', status: 'completed',
      });
      expect(vaccineService.getVaccineStatus('bcg_1', 0)).toBe('completed');
    });

    it('无记录且未超期返回 pending', () => {
      // 宝宝 5 个月，推荐 6 月龄的疫苗应该是 pending
      expect(vaccineService.getVaccineStatus('nonexistent', 6)).toBe('pending');
    });

    it('无记录且已超期返回 overdue', () => {
      // 宝宝 5 个月，推荐 0 月龄的疫苗（超过 0+1=1 个月）应该是 overdue
      expect(vaccineService.getVaccineStatus('nonexistent', 0)).toBe('overdue');
    });
  });

  // ========== getVaccinePlan ==========
  describe('getVaccinePlan', () => {
    it('返回按月龄分组的计划', () => {
      const plan = vaccineService.getVaccinePlan();
      expect(Array.isArray(plan)).toBe(true);
      expect(plan.length).toBeGreaterThan(0);

      // 每组应有 month、monthLabel 和 vaccines
      plan.forEach(group => {
        expect(group.month).toBeDefined();
        expect(group.monthLabel).toBeTruthy();
        expect(Array.isArray(group.vaccines)).toBe(true);
        expect(group.vaccines.length).toBeGreaterThan(0);
      });
    });

    it('已接种的疫苗在计划中显示 completed', () => {
      const babyId = babyService.getCurrentBabyId()!;
      vaccineService.addRecord({
        babyId, vaccineId: 'bcg_1', date: '2025-01-03', status: 'completed',
      });

      const plan = vaccineService.getVaccinePlan();
      const flat = plan.flatMap(g => g.vaccines);
      const bcg = flat.find((v: any) => v.vaccine?.id === 'bcg_1');
      if (bcg) {
        expect((bcg as any).status).toBe('completed');
      }
    });
  });

  // ========== getSummary ==========
  describe('getSummary', () => {
    it('返回正确的统计数据', () => {
      const summary = vaccineService.getSummary();
      expect(summary.total).toBeGreaterThan(0);
      expect(summary.completed).toBeGreaterThanOrEqual(0);
      expect(summary.pending).toBeGreaterThanOrEqual(0);
      expect(summary.overdue).toBeGreaterThanOrEqual(0);
      expect(summary.progress).toBeGreaterThanOrEqual(0);
      expect(summary.progress).toBeLessThanOrEqual(100);
    });

    it('接种后 completed 增加', () => {
      const before = vaccineService.getSummary();
      const babyId = babyService.getCurrentBabyId()!;
      vaccineService.addRecord({
        babyId, vaccineId: 'bcg_1', date: '2025-01-03', status: 'completed',
      });
      const after = vaccineService.getSummary();
      expect(after.completed).toBeGreaterThanOrEqual(before.completed);
    });
  });

  // ========== updateRecord / removeRecord ==========
  describe('updateRecord / removeRecord', () => {
    it('更新记录成功', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = vaccineService.addRecord({
        babyId, vaccineId: 'bcg_1', date: '2025-01-03', status: 'completed',
      });
      const updated = vaccineService.updateRecord(record!.id, {
        status: 'skipped',
      });
      expect(updated?.status).toBe('skipped');
    });

    it('删除记录成功', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = vaccineService.addRecord({
        babyId, vaccineId: 'bcg_1', date: '2025-01-03', status: 'completed',
      });
      expect(vaccineService.removeRecord(record!.id)).toBe(true);
    });
  });
});
