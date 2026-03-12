/**
 * StatisticsService 单元测试
 * 覆盖仪表盘数据聚合、时间线事件生成
 */
import { clearMockStorage } from '../setup';
import { statisticsService } from '../../miniprogram/services/statistics';
import { babyService } from '../../miniprogram/services/baby';
import {
  babyStorage, feedingStorage, sleepStorage,
  diaperStorage, healthStorage,
} from '../../miniprogram/services/storage';
import eventBus from '../../miniprogram/utils/event-bus';

describe('StatisticsService', () => {
  let babyId: string;

  beforeEach(() => {
    clearMockStorage();
    babyStorage.invalidateCache();
    feedingStorage.invalidateCache();
    sleepStorage.invalidateCache();
    diaperStorage.invalidateCache();
    healthStorage.invalidateCache();
    eventBus.clear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-15T10:00:00.000Z'));

    const baby = babyService.createBaby({
      name: '测试宝宝',
      gender: 'male',
      birthDate: '2025-01-01',
    });
    babyId = baby!.id;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // 辅助函数：添加今日测试数据
  function seedTodayData() {
    const today = '2025-06-15';

    // 喂养: 2次母乳 + 1次配方奶
    feedingStorage.add({
      id: 'f1', babyId, type: 'breast',
      startTime: `${today}T06:00:00`, duration: 20,
      createdAt: '', updatedAt: '',
    });
    feedingStorage.add({
      id: 'f2', babyId, type: 'breast',
      startTime: `${today}T09:00:00`, duration: 15,
      createdAt: '', updatedAt: '',
    });
    feedingStorage.add({
      id: 'f3', babyId, type: 'formula',
      startTime: `${today}T12:00:00`, amount: 120,
      createdAt: '', updatedAt: '',
    });

    // 睡眠: 1次日间 + 1次夜间
    sleepStorage.add({
      id: 's1', babyId, type: 'nap',
      startTime: `${today}T10:00:00`, endTime: `${today}T11:30:00`, duration: 90,
      createdAt: '', updatedAt: '',
    });
    sleepStorage.add({
      id: 's2', babyId, type: 'night',
      startTime: `${today}T00:00:00`, endTime: `${today}T06:00:00`, duration: 360,
      createdAt: '', updatedAt: '',
    });

    // 排便: 2次小便 + 1次大便
    diaperStorage.add({
      id: 'd1', babyId, type: 'pee',
      time: `${today}T07:00:00`,
      createdAt: '', updatedAt: '',
    });
    diaperStorage.add({
      id: 'd2', babyId, type: 'poop',
      time: `${today}T08:00:00`, poopColor: 'yellow', poopTexture: 'normal',
      createdAt: '', updatedAt: '',
    });
    diaperStorage.add({
      id: 'd3', babyId, type: 'pee',
      time: `${today}T09:30:00`,
      createdAt: '', updatedAt: '',
    });

    // 体温: 1次
    healthStorage.add({
      id: 'h1', babyId, recordType: 'temperature',
      time: `${today}T08:00:00`, temperature: 36.5,
      temperatureLevel: 'normal',
      createdAt: '', updatedAt: '',
    });
  }

  // ========== getDashboardSummary ==========
  describe('getDashboardSummary', () => {
    it('无数据返回默认值', () => {
      const summary = statisticsService.getDashboardSummary(babyId);
      expect(summary.feedingCount).toBe(0);
      expect(summary.feedingDetail).toBe('暂无记录');
      expect(summary.sleepDuration).toBe('0分钟');
      expect(summary.sleepHours).toBe(0);
      expect(summary.diaperCount).toBe(0);
      expect(summary.diaperDetail).toBe('暂无记录');
      expect(summary.temperature).toBe('--');
      expect(summary.hasAlert).toBe(false);
    });

    it('有数据时返回正确统计', () => {
      seedTodayData();

      const summary = statisticsService.getDashboardSummary(babyId);
      expect(summary.feedingCount).toBe(3);
      expect(summary.feedingDetail).toContain('母乳2次');
      expect(summary.feedingDetail).toContain('配方1次');
      expect(summary.sleepHours).toBeGreaterThan(0);
      expect(summary.diaperCount).toBe(3);
      expect(summary.diaperDetail).toContain('小便2次');
      expect(summary.diaperDetail).toContain('大便1次');
      expect(summary.temperature).toBe('36.5');
      expect(summary.temperatureLevel).toBe('normal');
    });

    it('有发烧体温时 hasAlert 为 true', () => {
      healthStorage.add({
        id: 'h_fever', babyId, recordType: 'temperature',
        time: '2025-06-15T08:00:00', temperature: 39.5,
        temperatureLevel: 'high_fever',
        createdAt: '', updatedAt: '',
      });

      const summary = statisticsService.getDashboardSummary(babyId);
      expect(summary.hasAlert).toBe(true);
      expect(summary.temperatureLevel).toBe('high_fever');
    });
  });

  // ========== getTodayTimeline ==========
  describe('getTodayTimeline', () => {
    it('无数据返回空数组', () => {
      const timeline = statisticsService.getTodayTimeline(babyId);
      expect(timeline).toEqual([]);
    });

    it('有数据时返回时间线事件', () => {
      seedTodayData();

      const timeline = statisticsService.getTodayTimeline(babyId);
      // 应有 3 feeding + 2 sleep + 3 diaper + 1 health = 9 个事件
      expect(timeline.length).toBe(9);
    });

    it('事件按时间倒序排列', () => {
      seedTodayData();

      const timeline = statisticsService.getTodayTimeline(babyId);
      for (let i = 0; i < timeline.length - 1; i++) {
        const t1 = new Date(timeline[i].time).getTime();
        const t2 = new Date(timeline[i + 1].time).getTime();
        expect(t1).toBeGreaterThanOrEqual(t2);
      }
    });

    it('每个事件都有必要字段', () => {
      seedTodayData();

      const timeline = statisticsService.getTodayTimeline(babyId);
      timeline.forEach(event => {
        expect(event.id).toBeTruthy();
        expect(event.type).toBeTruthy();
        expect(event.time).toBeTruthy();
        expect(event.title).toBeTruthy();
        expect(event.icon).toBeTruthy();
        expect(event.color).toBeTruthy();
      });
    });

    it('喂养事件包含正确的类型标签', () => {
      seedTodayData();

      const timeline = statisticsService.getTodayTimeline(babyId);
      const feedingEvents = timeline.filter(e => e.type === 'feeding');
      expect(feedingEvents.length).toBe(3);

      const breastEvents = feedingEvents.filter(e => e.title === '母乳喂养');
      expect(breastEvents.length).toBe(2);

      const formulaEvents = feedingEvents.filter(e => e.title === '配方奶');
      expect(formulaEvents.length).toBe(1);
    });

    it('睡眠事件区分日间和夜间', () => {
      seedTodayData();

      const timeline = statisticsService.getTodayTimeline(babyId);
      const sleepEvents = timeline.filter(e => e.type === 'sleep');
      expect(sleepEvents.some(e => e.title === '日间小睡')).toBe(true);
      expect(sleepEvents.some(e => e.title === '夜间睡眠')).toBe(true);
    });
  });

  // ========== 各模块独立统计 ==========
  describe('getTodayFeedingSummary', () => {
    it('正确统计喂养数据', () => {
      seedTodayData();
      const summary = statisticsService.getTodayFeedingSummary(babyId);
      expect(summary.totalCount).toBe(3);
      expect(summary.breastCount).toBe(2);
      expect(summary.formulaCount).toBe(1);
      expect(summary.totalBreastDuration).toBe(35);
      expect(summary.totalFormulaAmount).toBe(120);
    });
  });

  describe('getTodaySleepSummary', () => {
    it('正确统计睡眠数据', () => {
      seedTodayData();
      const summary = statisticsService.getTodaySleepSummary(babyId);
      expect(summary.totalCount).toBe(2);
      expect(summary.napCount).toBe(1);
      expect(summary.nightCount).toBe(1);
      expect(summary.totalDuration).toBe(450);
    });
  });

  describe('getTodayDiaperSummary', () => {
    it('正确统计排便数据', () => {
      seedTodayData();
      const summary = statisticsService.getTodayDiaperSummary(babyId);
      expect(summary.totalCount).toBe(3);
      expect(summary.peeCount).toBe(2);
      expect(summary.poopCount).toBe(1);
    });
  });

  describe('getLatestTemperature', () => {
    it('有记录时返回正确数据', () => {
      seedTodayData();
      const temp = statisticsService.getLatestTemperature(babyId);
      expect(temp.value).toBe(36.5);
      expect(temp.level).toBe('normal');
    });

    it('无记录时返回 null', () => {
      const temp = statisticsService.getLatestTemperature(babyId);
      expect(temp.value).toBeNull();
    });
  });
});
