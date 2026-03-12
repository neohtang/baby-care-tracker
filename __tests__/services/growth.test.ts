/**
 * GrowthService 单元测试
 * 覆盖生长记录 CRUD、月龄计算、最新记录
 */
import { clearMockStorage } from '../setup';
import { growthService } from '../../miniprogram/services/growth';
import { babyService } from '../../miniprogram/services/baby';
import { growthStorage, babyStorage } from '../../miniprogram/services/storage';
import eventBus, { Events } from '../../miniprogram/utils/event-bus';

describe('GrowthService', () => {
  beforeEach(() => {
    clearMockStorage();
    babyStorage.invalidateCache();
    growthStorage.invalidateCache();
    eventBus.clear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-15T10:00:00.000Z'));

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
    it('添加有体重的记录成功', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = growthService.addRecord({
        babyId,
        date: '2025-06-15',
        weight: 7.5,
        ageInMonths: 5,
        ageInDays: 165,
      });
      expect(record).not.toBeNull();
      expect(record?.weight).toBe(7.5);
    });

    it('添加多项测量数据成功', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = growthService.addRecord({
        babyId,
        date: '2025-06-15',
        weight: 7.5,
        height: 66.0,
        headCircumference: 42.5,
        ageInMonths: 5,
        ageInDays: 165,
      });
      expect(record).not.toBeNull();
      expect(record?.height).toBe(66.0);
      expect(record?.headCircumference).toBe(42.5);
    });

    it('至少需要一项数据否则校验失败', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = growthService.addRecord({
        babyId,
        date: '2025-06-15',
        ageInMonths: 5,
        ageInDays: 165,
      });
      expect(record).toBeNull();
    });

    it('添加成功触发 GROWTH_CHANGED 事件', () => {
      const handler = jest.fn();
      eventBus.on(Events.GROWTH_CHANGED, handler);
      const babyId = babyService.getCurrentBabyId()!;
      growthService.addRecord({
        babyId, date: '2025-06-15', weight: 7.5,
        ageInMonths: 5, ageInDays: 165,
      });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ========== getLatestRecord ==========
  describe('getLatestRecord', () => {
    it('无记录返回 null', () => {
      expect(growthService.getLatestRecord()).toBeNull();
    });

    it('有记录返回最新的', () => {
      const babyId = babyService.getCurrentBabyId()!;
      growthService.addRecord({
        babyId, date: '2025-05-01', weight: 6.5,
        ageInMonths: 4, ageInDays: 120,
      });
      growthService.addRecord({
        babyId, date: '2025-06-01', weight: 7.0,
        ageInMonths: 5, ageInDays: 151,
      });
      const latest = growthService.getLatestRecord();
      // getAllRecords 按日期降序排列，最新在前
      expect(latest?.weight).toBe(7.0);
    });
  });

  // ========== computeAge ==========
  describe('computeAge', () => {
    it('根据当前宝宝计算月龄', () => {
      const age = growthService.computeAge('2025-06-15');
      expect(age.ageInMonths).toBe(5);
      expect(age.ageInDays).toBe(165);
    });

    it('无当前宝宝返回 0', () => {
      clearMockStorage();
      babyStorage.invalidateCache();
      const age = growthService.computeAge('2025-06-15');
      expect(age.ageInMonths).toBe(0);
      expect(age.ageInDays).toBe(0);
    });
  });

  // ========== formatRecordForDisplay ==========
  describe('formatRecordForDisplay', () => {
    it('格式化记录显示正确信息', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = growthService.addRecord({
        babyId, date: '2025-06-15', weight: 7.5, height: 66.0,
        ageInMonths: 5, ageInDays: 165,
      });
      const display = growthService.formatRecordForDisplay(record!);
      expect(display.weight).toBe('7.5');
      expect(display.height).toBe('66.0');
      expect(display.headCircumference).toBe('--');
      expect(display.hasWeight).toBe(true);
      expect(display.hasHeight).toBe(true);
      expect(display.hasHead).toBe(false);
      expect(display.ageText).toBe('5个月');
    });
  });

  // ========== updateRecord / removeRecord ==========
  describe('updateRecord / removeRecord', () => {
    it('更新记录成功', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = growthService.addRecord({
        babyId, date: '2025-06-15', weight: 7.5,
        ageInMonths: 5, ageInDays: 165,
      });
      const updated = growthService.updateRecord(record!.id, { weight: 7.8 });
      expect(updated?.weight).toBe(7.8);
    });

    it('删除记录成功', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = growthService.addRecord({
        babyId, date: '2025-06-15', weight: 7.5,
        ageInMonths: 5, ageInDays: 165,
      });
      expect(growthService.removeRecord(record!.id)).toBe(true);
      expect(growthService.getLatestRecord()).toBeNull();
    });
  });
});
