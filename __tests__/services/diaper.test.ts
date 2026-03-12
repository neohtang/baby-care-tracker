/**
 * DiaperService 单元测试
 * 覆盖排便记录 CRUD、异常检测、日统计
 */
import { clearMockStorage } from '../setup';
import { diaperService } from '../../miniprogram/services/diaper';
import { babyService } from '../../miniprogram/services/baby';
import { diaperStorage, babyStorage } from '../../miniprogram/services/storage';
import eventBus, { Events } from '../../miniprogram/utils/event-bus';

describe('DiaperService', () => {
  beforeEach(() => {
    clearMockStorage();
    babyStorage.invalidateCache();
    diaperStorage.invalidateCache();
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
    it('添加小便记录成功', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = diaperService.addRecord({
        babyId,
        time: '2025-06-15T08:00:00',
        type: 'pee',
      });
      expect(record).not.toBeNull();
      expect(record?.type).toBe('pee');
      expect(record?.alert).toBe('none'); // pee 不检测异常
    });

    it('添加大便记录成功', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = diaperService.addRecord({
        babyId,
        time: '2025-06-15T09:00:00',
        type: 'poop',
        poopColor: 'yellow',
        poopTexture: 'normal',
      });
      expect(record).not.toBeNull();
      expect(record?.alert).toBe('none');
    });

    it('添加成功触发 DIAPER_CHANGED 事件', () => {
      const handler = jest.fn();
      eventBus.on(Events.DIAPER_CHANGED, handler);
      const babyId = babyService.getCurrentBabyId()!;
      diaperService.addRecord({
        babyId, time: '2025-06-15T08:00:00', type: 'pee',
      });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ========== detectAbnormality ==========
  describe('detectAbnormality', () => {
    it('pee 类型无异常', () => {
      expect(diaperService.detectAbnormality({
        type: 'pee', time: '', babyId: '',
      } as any)).toBe('none');
    });

    it('红色大便检测为血便', () => {
      expect(diaperService.detectAbnormality({
        type: 'poop', poopColor: 'red', time: '', babyId: '',
      } as any)).toBe('blood');
    });

    it('稀水样检测为腹泻', () => {
      expect(diaperService.detectAbnormality({
        type: 'poop', poopTexture: 'watery', time: '', babyId: '',
      } as any)).toBe('diarrhea');
    });

    it('硬便检测为便秘', () => {
      expect(diaperService.detectAbnormality({
        type: 'poop', poopTexture: 'hard', time: '', babyId: '',
      } as any)).toBe('constipation');
    });

    it('黏液样检测为黏液', () => {
      expect(diaperService.detectAbnormality({
        type: 'poop', poopTexture: 'mucus', time: '', babyId: '',
      } as any)).toBe('mucus');
    });

    it('正常大便无异常', () => {
      expect(diaperService.detectAbnormality({
        type: 'poop', poopColor: 'yellow', poopTexture: 'normal', time: '', babyId: '',
      } as any)).toBe('none');
    });

    it('红色优先级高于质地', () => {
      // poopColor=red 且 poopTexture=watery 时，应先判断为 blood
      expect(diaperService.detectAbnormality({
        type: 'poop', poopColor: 'red', poopTexture: 'watery', time: '', babyId: '',
      } as any)).toBe('blood');
    });
  });

  // ========== getDailySummary ==========
  describe('getDailySummary', () => {
    it('空记录返回全零统计', () => {
      const summary = diaperService.getDailySummary('2025-06-15');
      expect(summary.totalCount).toBe(0);
      expect(summary.peeCount).toBe(0);
      expect(summary.poopCount).toBe(0);
      expect(summary.hasAlert).toBe(false);
    });

    it('正确统计各类型', () => {
      const babyId = babyService.getCurrentBabyId()!;
      diaperService.addRecord({ babyId, time: '2025-06-15T06:00:00', type: 'pee' });
      diaperService.addRecord({ babyId, time: '2025-06-15T08:00:00', type: 'poop', poopColor: 'yellow', poopTexture: 'normal' });
      diaperService.addRecord({ babyId, time: '2025-06-15T10:00:00', type: 'both' });
      diaperService.addRecord({ babyId, time: '2025-06-15T12:00:00', type: 'pee' });

      const summary = diaperService.getDailySummary('2025-06-15');
      expect(summary.totalCount).toBe(4);
      expect(summary.peeCount).toBe(3); // 2 pee + 1 both
      expect(summary.poopCount).toBe(2); // 1 poop + 1 both
    });

    it('有异常记录时 hasAlert 为 true', () => {
      const babyId = babyService.getCurrentBabyId()!;
      diaperService.addRecord({
        babyId, time: '2025-06-15T08:00:00',
        type: 'poop', poopColor: 'red',
      });

      const summary = diaperService.getDailySummary('2025-06-15');
      expect(summary.hasAlert).toBe(true);
      expect(summary.alerts).toContain('blood');
    });
  });

  // ========== formatRecordForDisplay ==========
  describe('formatRecordForDisplay', () => {
    it('异常记录应标记为 isAbnormal', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = diaperService.addRecord({
        babyId, time: '2025-06-15T08:00:00',
        type: 'poop', poopTexture: 'watery',
      });
      const display = diaperService.formatRecordForDisplay(record!);
      expect(display.isAbnormal).toBe(true);
      expect(display.alertText).toBe('腹泻');
    });

    it('正常记录 isAbnormal 为 false', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = diaperService.addRecord({
        babyId, time: '2025-06-15T08:00:00', type: 'pee',
      });
      const display = diaperService.formatRecordForDisplay(record!);
      expect(display.isAbnormal).toBe(false);
    });
  });
});
