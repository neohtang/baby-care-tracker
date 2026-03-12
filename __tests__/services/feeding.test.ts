/**
 * FeedingService 单元测试
 * 覆盖三种喂养类型的添加、校验、日统计、格式化
 */
import { clearMockStorage } from '../setup';
import { feedingService } from '../../miniprogram/services/feeding';
import { babyService } from '../../miniprogram/services/baby';
import { feedingStorage, babyStorage } from '../../miniprogram/services/storage';
import eventBus, { Events } from '../../miniprogram/utils/event-bus';

describe('FeedingService', () => {
  const FIXED_NOW = new Date('2025-06-15T10:00:00.000Z');

  beforeEach(() => {
    clearMockStorage();
    babyStorage.invalidateCache();
    feedingStorage.invalidateCache();
    eventBus.clear();
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);

    // 创建测试宝宝
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
    it('添加母乳记录成功', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = feedingService.addRecord({
        babyId,
        type: 'breast',
        startTime: '2025-06-15T08:00:00',
        side: 'left',
        duration: 20,
      });
      expect(record).not.toBeNull();
      expect(record?.type).toBe('breast');
      expect(record?.id).toBeTruthy();
    });

    it('添加配方奶记录成功', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = feedingService.addRecord({
        babyId,
        type: 'formula',
        startTime: '2025-06-15T08:00:00',
        amount: 120,
      });
      expect(record).not.toBeNull();
      expect(record?.type).toBe('formula');
      expect(record?.amount).toBe(120);
    });

    it('添加辅食记录成功', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = feedingService.addRecord({
        babyId,
        type: 'solid',
        startTime: '2025-06-15T12:00:00',
        amount: 50,
        solidFood: '米糊',
      });
      expect(record).not.toBeNull();
      expect(record?.solidFood).toBe('米糊');
    });

    it('母乳记录自动计算时长', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = feedingService.addRecord({
        babyId,
        type: 'breast',
        startTime: '2025-06-15T08:00:00',
        endTime: '2025-06-15T08:25:00',
        side: 'left',
      });
      expect(record?.duration).toBe(25);
    });

    it('校验失败返回 null', () => {
      const record = feedingService.addRecord({
        babyId: 'test',
        type: 'formula' as any,
        startTime: '2025-06-15T08:00:00',
        // 缺少 amount (配方奶必填)
      });
      expect(record).toBeNull();
      expect(wx.showToast).toHaveBeenCalled();
    });

    it('添加成功触发 FEEDING_CHANGED 事件', () => {
      const handler = jest.fn();
      eventBus.on(Events.FEEDING_CHANGED, handler);
      const babyId = babyService.getCurrentBabyId()!;
      feedingService.addRecord({
        babyId,
        type: 'breast',
        startTime: '2025-06-15T08:00:00',
        duration: 15,
      });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ========== getDailySummary ==========
  describe('getDailySummary', () => {
    it('空记录返回全零统计', () => {
      const summary = feedingService.getDailySummary('2025-06-15');
      expect(summary.totalCount).toBe(0);
      expect(summary.breastCount).toBe(0);
      expect(summary.formulaCount).toBe(0);
      expect(summary.solidCount).toBe(0);
    });

    it('正确统计各类型', () => {
      const babyId = babyService.getCurrentBabyId()!;

      feedingService.addRecord({
        babyId, type: 'breast',
        startTime: '2025-06-15T06:00:00', duration: 20,
      });
      feedingService.addRecord({
        babyId, type: 'breast',
        startTime: '2025-06-15T09:00:00', duration: 15,
      });
      feedingService.addRecord({
        babyId, type: 'formula',
        startTime: '2025-06-15T12:00:00', amount: 120,
      });
      feedingService.addRecord({
        babyId, type: 'solid',
        startTime: '2025-06-15T18:00:00', amount: 50,
      });

      const summary = feedingService.getDailySummary('2025-06-15');
      expect(summary.totalCount).toBe(4);
      expect(summary.breastCount).toBe(2);
      expect(summary.totalBreastDuration).toBe(35);
      expect(summary.formulaCount).toBe(1);
      expect(summary.totalFormulaAmount).toBe(120);
      expect(summary.solidCount).toBe(1);
      expect(summary.totalSolidAmount).toBe(50);
    });
  });

  // ========== formatRecordForDisplay ==========
  describe('formatRecordForDisplay', () => {
    it('母乳记录格式化', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = feedingService.addRecord({
        babyId, type: 'breast',
        startTime: '2025-06-15T08:00:00', duration: 20, side: 'left',
      });
      const display = feedingService.formatRecordForDisplay(record!);
      expect(display.typeName).toBe('母乳');
      expect(display.icon).toBe('🤱');
      expect(display.tags.some(t => t.text === '左侧')).toBe(true);
    });

    it('配方奶记录格式化', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = feedingService.addRecord({
        babyId, type: 'formula',
        startTime: '2025-06-15T08:00:00', amount: 120,
      });
      const display = feedingService.formatRecordForDisplay(record!);
      expect(display.typeName).toBe('配方奶');
      expect(display.detail).toContain('120ml');
    });
  });

  // ========== removeRecord ==========
  describe('removeRecord', () => {
    it('删除成功返回 true', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = feedingService.addRecord({
        babyId, type: 'breast',
        startTime: '2025-06-15T08:00:00', duration: 15,
      });
      expect(feedingService.removeRecord(record!.id)).toBe(true);
    });
  });

  // ========== getAllRecords ==========
  describe('getAllRecords', () => {
    it('无当前宝宝返回空数组', () => {
      clearMockStorage();
      babyStorage.invalidateCache();
      feedingStorage.invalidateCache();
      expect(feedingService.getAllRecords()).toEqual([]);
    });
  });
});
