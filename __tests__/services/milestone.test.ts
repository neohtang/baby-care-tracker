/**
 * MilestoneService 单元测试
 * 覆盖里程碑记录 CRUD、状态判断、计划生成、统计
 */
import { clearMockStorage } from '../setup';
import { milestoneService } from '../../miniprogram/services/milestone';
import { babyService } from '../../miniprogram/services/baby';
import { milestoneStorage, babyStorage } from '../../miniprogram/services/storage';
import eventBus, { Events } from '../../miniprogram/utils/event-bus';

describe('MilestoneService', () => {
  beforeEach(() => {
    clearMockStorage();
    babyStorage.invalidateCache();
    milestoneStorage.invalidateCache();
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

  // 使用 MILESTONE_LIST 中实际存在的 ID
  const REAL_MILESTONE_ID = 'gm_0_head_turn';

  // ========== addRecord ==========
  describe('addRecord', () => {
    it('添加里程碑记录成功', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = milestoneService.addRecord({
        babyId,
        milestoneId: REAL_MILESTONE_ID,
        achievedDate: '2025-03-15',
        status: 'achieved',
      });
      expect(record).not.toBeNull();
      expect(record?.milestoneId).toBe(REAL_MILESTONE_ID);
      expect(record?.status).toBe('achieved');
    });

    it('防止重复记录', () => {
      const babyId = babyService.getCurrentBabyId()!;
      milestoneService.addRecord({
        babyId, milestoneId: REAL_MILESTONE_ID, achievedDate: '2025-03-15', status: 'achieved',
      });
      const duplicate = milestoneService.addRecord({
        babyId, milestoneId: REAL_MILESTONE_ID, achievedDate: '2025-04-01', status: 'achieved',
      });
      expect(duplicate).toBeNull();
    });

    it('校验失败返回 null', () => {
      const record = milestoneService.addRecord({
        babyId: 'test',
        milestoneId: '',
        achievedDate: '2025-03-15',
        status: 'achieved',
      });
      expect(record).toBeNull();
    });

    it('添加成功触发 MILESTONE_CHANGED 事件', () => {
      const handler = jest.fn();
      eventBus.on(Events.MILESTONE_CHANGED, handler);
      const babyId = babyService.getCurrentBabyId()!;
      milestoneService.addRecord({
        babyId, milestoneId: REAL_MILESTONE_ID, achievedDate: '2025-03-15', status: 'achieved',
      });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ========== getMilestoneStatus ==========
  describe('getMilestoneStatus', () => {
    it('有记录返回记录状态', () => {
      const babyId = babyService.getCurrentBabyId()!;
      milestoneService.addRecord({
        babyId, milestoneId: REAL_MILESTONE_ID, achievedDate: '2025-03-15', status: 'achieved',
      });
      expect(milestoneService.getMilestoneStatus(REAL_MILESTONE_ID)).toBe('achieved');
    });

    it('无记录的未来里程碑返回 pending', () => {
      const status = milestoneService.getMilestoneStatus('nonexistent');
      expect(status).toBe('pending');
    });
  });

  // ========== getMilestonePlan ==========
  describe('getMilestonePlan', () => {
    it('返回按月龄分组的计划', () => {
      const plan = milestoneService.getMilestonePlan();
      expect(Array.isArray(plan)).toBe(true);
      expect(plan.length).toBeGreaterThan(0);

      plan.forEach(group => {
        expect(typeof group.month).toBe('number');
        expect(group.monthLabel).toBeTruthy();
        expect(Array.isArray(group.milestones)).toBe(true);
      });
    });
  });

  // ========== getSummary ==========
  describe('getSummary', () => {
    it('返回正确的统计数据', () => {
      const summary = milestoneService.getSummary();
      expect(summary.total).toBeGreaterThan(0);
      expect(summary.achieved).toBeGreaterThanOrEqual(0);
      expect(summary.pending).toBeGreaterThanOrEqual(0);
      expect(summary.concern).toBeGreaterThanOrEqual(0);
      expect(summary.progress).toBeGreaterThanOrEqual(0);
      expect(summary.progress).toBeLessThanOrEqual(100);
    });

    it('达成后 achieved 增加', () => {
      const before = milestoneService.getSummary();
      const babyId = babyService.getCurrentBabyId()!;
      milestoneService.addRecord({
        babyId, milestoneId: REAL_MILESTONE_ID, achievedDate: '2025-03-15', status: 'achieved',
      });
      const after = milestoneService.getSummary();
      expect(after.achieved).toBe(before.achieved + 1);
    });
  });

  // ========== updateRecord / removeRecord ==========
  describe('updateRecord / removeRecord', () => {
    it('更新记录成功', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = milestoneService.addRecord({
        babyId, milestoneId: REAL_MILESTONE_ID, achievedDate: '2025-03-15', status: 'achieved',
      });
      const updated = milestoneService.updateRecord(record!.id, {
        status: 'concern',
      });
      expect(updated?.status).toBe('concern');
    });

    it('删除记录成功', () => {
      const babyId = babyService.getCurrentBabyId()!;
      const record = milestoneService.addRecord({
        babyId, milestoneId: REAL_MILESTONE_ID, achievedDate: '2025-03-15', status: 'achieved',
      });
      expect(milestoneService.removeRecord(record!.id)).toBe(true);
    });
  });
});
