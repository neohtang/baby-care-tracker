/**
 * SleepService 单元测试
 * 覆盖睡眠记录 CRUD、计时器、日/夜分类统计
 */
import { clearMockStorage } from '../setup';
import { sleepService } from '../../miniprogram/services/sleep';
import { babyService } from '../../miniprogram/services/baby';
import { sleepStorage, babyStorage } from '../../miniprogram/services/storage';
import eventBus, { Events } from '../../miniprogram/utils/event-bus';

describe('SleepService', () => {
  beforeEach(() => {
    clearMockStorage();
    babyStorage.invalidateCache();
    sleepStorage.invalidateCache();
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
    it('添加睡眠记录成功', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = sleepService.addRecord({
        babyId,
        startTime: '2025-06-15T10:00:00',
        endTime: '2025-06-15T11:30:00',
        type: 'nap',
      });
      expect(record).not.toBeNull();
      expect(record?.type).toBe('nap');
    });

    it('自动计算时长', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = sleepService.addRecord({
        babyId,
        startTime: '2025-06-15T10:00:00',
        endTime: '2025-06-15T12:00:00',
        type: 'nap',
      });
      expect(record?.duration).toBe(120);
    });

    it('添加成功触发 SLEEP_CHANGED 事件', () => {
      const handler = jest.fn();
      eventBus.on(Events.SLEEP_CHANGED, handler);
      const babyId = babyService.getCurrentBabyId()!;
      sleepService.addRecord({
        babyId,
        startTime: '2025-06-15T10:00:00',
        type: 'nap',
      });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('校验失败返回 null', () => {
      const record = sleepService.addRecord({
        babyId: 'test',
        startTime: '2025-06-15T21:00:00',
        endTime: '2025-06-15T20:00:00', // 结束时间早于开始时间
        type: 'night',
      });
      expect(record).toBeNull();
    });
  });

  // ========== 计时器 startSleep / endSleep ==========
  describe('startSleep / endSleep', () => {
    it('startSleep 日间时间返回 nap 类型', () => {
      jest.setSystemTime(new Date('2025-06-15T10:00:00'));
      const state = sleepService.startSleep();
      expect(state).not.toBeNull();
      expect(state?.type).toBe('nap');
    });

    it('startSleep 夜间时间返回 night 类型', () => {
      jest.setSystemTime(new Date('2025-06-15T22:00:00'));
      const state = sleepService.startSleep();
      expect(state).not.toBeNull();
      expect(state?.type).toBe('night');
    });

    it('startSleep 无宝宝时返回 null', () => {
      clearMockStorage();
      babyStorage.invalidateCache();
      const state = sleepService.startSleep();
      expect(state).toBeNull();
    });

    it('isSleeping 反映当前状态', () => {
      expect(sleepService.isSleeping()).toBe(false);
      sleepService.startSleep();
      expect(sleepService.isSleeping()).toBe(true);
    });

    it('endSleep 无进行中睡眠返回 null', () => {
      const record = sleepService.endSleep();
      expect(record).toBeNull();
    });

    it('endSleep 正常结束创建记录', () => {
      sleepService.startSleep();
      // 推进 90 分钟
      jest.setSystemTime(new Date('2025-06-15T11:30:00.000Z'));
      const record = sleepService.endSleep();
      expect(record).not.toBeNull();
      expect(record?.duration).toBe(90);
      expect(sleepService.isSleeping()).toBe(false);
    });
  });

  // ========== getDailySummary ==========
  describe('getDailySummary', () => {
    it('空记录返回全零统计', () => {
      const summary = sleepService.getDailySummary('2025-06-15');
      expect(summary.totalCount).toBe(0);
      expect(summary.napCount).toBe(0);
      expect(summary.nightCount).toBe(0);
      expect(summary.totalDuration).toBe(0);
    });

    it('正确分类日间和夜间', () => {
      const babyId = babyService.getCurrentBabyId()!;
      sleepService.addRecord({
        babyId, startTime: '2025-06-15T10:00:00',
        endTime: '2025-06-15T11:30:00', type: 'nap', duration: 90,
      });
      sleepService.addRecord({
        babyId, startTime: '2025-06-15T14:00:00',
        endTime: '2025-06-15T15:00:00', type: 'nap', duration: 60,
      });
      sleepService.addRecord({
        babyId, startTime: '2025-06-15T21:00:00',
        endTime: '2025-06-15T23:00:00', type: 'night', duration: 120,
      });

      const summary = sleepService.getDailySummary('2025-06-15');
      expect(summary.totalCount).toBe(3);
      expect(summary.napCount).toBe(2);
      expect(summary.napDuration).toBe(150);
      expect(summary.nightCount).toBe(1);
      expect(summary.nightDuration).toBe(120);
      expect(summary.totalDuration).toBe(270);
    });
  });

  // ========== formatRecordForDisplay ==========
  describe('formatRecordForDisplay', () => {
    it('日间小睡显示正确信息', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = sleepService.addRecord({
        babyId, startTime: '2025-06-15T10:00:00',
        endTime: '2025-06-15T11:30:00', type: 'nap',
      });
      const display = sleepService.formatRecordForDisplay(record!);
      expect(display.typeName).toBe('日间小睡');
      expect(display.icon).toBe('/assets/icons/sun.svg');
    });

    it('夜间睡眠显示正确信息', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = sleepService.addRecord({
        babyId, startTime: '2025-06-15T21:00:00',
        type: 'night',
      });
      const display = sleepService.formatRecordForDisplay(record!);
      expect(display.typeName).toBe('夜间睡眠');
      expect(display.icon).toBe('/assets/icons/moon.svg');
      expect(display.endTimeText).toBe('进行中');
    });
  });
});
