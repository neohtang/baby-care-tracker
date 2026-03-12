/**
 * HealthService 单元测试
 * 覆盖体温等级判断、记录 CRUD、异常检测
 */
import { clearMockStorage } from '../setup';
import { healthService } from '../../miniprogram/services/health';
import { babyService } from '../../miniprogram/services/baby';
import { healthStorage, babyStorage } from '../../miniprogram/services/storage';
import eventBus, { Events } from '../../miniprogram/utils/event-bus';

describe('HealthService', () => {
  beforeEach(() => {
    clearMockStorage();
    babyStorage.invalidateCache();
    healthStorage.invalidateCache();
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

  // ========== getTemperatureLevel ==========
  describe('getTemperatureLevel', () => {
    it('< 36.0 返回 low', () => {
      expect(healthService.getTemperatureLevel(35.5)).toBe('low');
    });

    it('36.0-37.3 返回 normal', () => {
      expect(healthService.getTemperatureLevel(36.0)).toBe('normal');
      expect(healthService.getTemperatureLevel(36.5)).toBe('normal');
      expect(healthService.getTemperatureLevel(37.3)).toBe('normal');
    });

    it('37.4-38.0 返回 mild_fever', () => {
      expect(healthService.getTemperatureLevel(37.4)).toBe('mild_fever');
      expect(healthService.getTemperatureLevel(38.0)).toBe('mild_fever');
    });

    it('38.1-39.0 返回 moderate_fever', () => {
      expect(healthService.getTemperatureLevel(38.1)).toBe('moderate_fever');
      expect(healthService.getTemperatureLevel(39.0)).toBe('moderate_fever');
    });

    it('> 39.0 返回 high_fever', () => {
      expect(healthService.getTemperatureLevel(39.1)).toBe('high_fever');
      expect(healthService.getTemperatureLevel(40.0)).toBe('high_fever');
    });
  });

  // ========== addRecord ==========
  describe('addRecord', () => {
    it('添加体温记录自动判断等级', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = healthService.addRecord({
        babyId,
        recordType: 'temperature',
        time: '2025-06-15T08:00:00',
        temperature: 38.5,
      });
      expect(record).not.toBeNull();
      expect(record?.temperatureLevel).toBe('moderate_fever');
    });

    it('添加正常体温记录', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = healthService.addRecord({
        babyId,
        recordType: 'temperature',
        time: '2025-06-15T08:00:00',
        temperature: 36.5,
        temperatureSite: 'axillary',
      });
      expect(record?.temperatureLevel).toBe('normal');
    });

    it('添加用药记录成功', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = healthService.addRecord({
        babyId,
        recordType: 'medication',
        time: '2025-06-15T08:00:00',
        medicationName: '布洛芬',
        medicationDosage: '2ml',
      });
      expect(record).not.toBeNull();
      expect(record?.medicationName).toBe('布洛芬');
    });

    it('添加症状记录成功', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = healthService.addRecord({
        babyId,
        recordType: 'symptom',
        time: '2025-06-15T08:00:00',
        symptoms: ['咳嗽', '流鼻涕'],
      });
      expect(record).not.toBeNull();
      expect(record?.symptoms).toEqual(['咳嗽', '流鼻涕']);
    });

    it('校验失败返回 null', () => {
      const record = healthService.addRecord({
        babyId: 'test',
        recordType: 'temperature',
        time: '2025-06-15T08:00:00',
        temperature: 50, // 超范围
      });
      expect(record).toBeNull();
    });

    it('添加成功触发 HEALTH_CHANGED 事件', () => {
      const handler = jest.fn();
      eventBus.on(Events.HEALTH_CHANGED, handler);
      const babyId = babyService.getCurrentBabyId()!;
      healthService.addRecord({
        babyId,
        recordType: 'temperature',
        time: '2025-06-15T08:00:00',
        temperature: 36.5,
      });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ========== getLatestTemperature ==========
  describe('getLatestTemperature', () => {
    it('无记录返回 null', () => {
      expect(healthService.getLatestTemperature()).toBeNull();
    });

    it('有记录返回最近一条', () => {
      const babyId = babyService.getCurrentBabyId()!;
      healthService.addRecord({
        babyId, recordType: 'temperature',
        time: '2025-06-15T06:00:00', temperature: 36.5,
      });
      healthService.addRecord({
        babyId, recordType: 'temperature',
        time: '2025-06-15T08:00:00', temperature: 37.5,
      });
      // 存储时 add 是 unshift（最新的在前），getLatestTemperature 取 [0]
      const latest = healthService.getLatestTemperature();
      expect(latest?.temperature).toBe(37.5);
    });
  });

  // ========== isLatestTempAbnormal ==========
  describe('isLatestTempAbnormal', () => {
    it('无记录返回 false', () => {
      expect(healthService.isLatestTempAbnormal()).toBe(false);
    });

    it('正常体温返回 false', () => {
      const babyId = babyService.getCurrentBabyId()!;
      healthService.addRecord({
        babyId, recordType: 'temperature',
        time: '2025-06-15T08:00:00', temperature: 36.5,
      });
      expect(healthService.isLatestTempAbnormal()).toBe(false);
    });

    it('低烧返回 true', () => {
      const babyId = babyService.getCurrentBabyId()!;
      healthService.addRecord({
        babyId, recordType: 'temperature',
        time: '2025-06-15T08:00:00', temperature: 37.8,
      });
      expect(healthService.isLatestTempAbnormal()).toBe(true);
    });
  });

  // ========== formatRecordForDisplay ==========
  describe('formatRecordForDisplay', () => {
    it('体温记录显示温度值和等级', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = healthService.addRecord({
        babyId, recordType: 'temperature',
        time: '2025-06-15T08:00:00', temperature: 38.5,
        temperatureSite: 'axillary',
      });
      const display = healthService.formatRecordForDisplay(record!);
      expect(display.typeName).toBe('体温');
      expect(display.detail).toContain('38.5');
      expect(display.isAbnormal).toBe(true);
      expect(display.tags.some(t => t.text === '腋温')).toBe(true);
    });

    it('用药记录显示药名和剂量', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = healthService.addRecord({
        babyId, recordType: 'medication',
        time: '2025-06-15T08:00:00',
        medicationName: '布洛芬', medicationDosage: '2ml',
      });
      const display = healthService.formatRecordForDisplay(record!);
      expect(display.typeName).toBe('用药');
      expect(display.detail).toContain('布洛芬');
      expect(display.detail).toContain('2ml');
    });
  });
});
