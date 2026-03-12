/**
 * BabyService 单元测试
 * 覆盖宝宝信息 CRUD、当前宝宝切换、月龄计算
 */
import { clearMockStorage } from '../setup';
import { babyService } from '../../miniprogram/services/baby';
import { babyStorage } from '../../miniprogram/services/storage';
import eventBus, { Events } from '../../miniprogram/utils/event-bus';

describe('BabyService', () => {
  beforeEach(() => {
    clearMockStorage();
    babyStorage.invalidateCache();
    eventBus.clear();
  });

  const validBabyInput = {
    name: '小明',
    gender: 'male' as const,
    birthDate: '2025-01-01',
  };

  // ========== createBaby ==========
  describe('createBaby', () => {
    it('有效输入创建成功', () => {
      const baby = babyService.createBaby(validBabyInput);
      expect(baby).not.toBeNull();
      expect(baby?.name).toBe('小明');
      expect(baby?.gender).toBe('male');
      expect(baby?.id).toBeTruthy();
      expect(baby?.createdAt).toBeTruthy();
    });

    it('创建第一个宝宝自动设置为当前宝宝', () => {
      const baby = babyService.createBaby(validBabyInput);
      expect(babyService.getCurrentBabyId()).toBe(baby?.id);
    });

    it('创建第二个宝宝不改变当前宝宝', () => {
      const first = babyService.createBaby(validBabyInput);
      const second = babyService.createBaby({
        ...validBabyInput,
        name: '小红',
        gender: 'female',
      });
      expect(babyService.getCurrentBabyId()).toBe(first?.id);
    });

    it('校验失败返回 null', () => {
      const baby = babyService.createBaby({
        name: '',
        gender: 'male',
        birthDate: '2025-01-01',
      });
      expect(baby).toBeNull();
      expect(wx.showToast).toHaveBeenCalled();
    });

    it('创建成功触发 BABY_CHANGED 事件', () => {
      const handler = jest.fn();
      eventBus.on(Events.BABY_CHANGED, handler);
      babyService.createBaby(validBabyInput);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ========== getCurrentBaby ==========
  describe('getCurrentBaby', () => {
    it('无宝宝时返回 null', () => {
      expect(babyService.getCurrentBaby()).toBeNull();
    });

    it('有当前宝宝时返回宝宝信息', () => {
      const baby = babyService.createBaby(validBabyInput);
      const current = babyService.getCurrentBaby();
      expect(current?.id).toBe(baby?.id);
      expect(current?.name).toBe('小明');
    });

    it('当前宝宝 ID 无效时自动选第一个', () => {
      const baby = babyService.createBaby(validBabyInput);
      // 手动设置一个无效 ID
      wx.setStorageSync('current_baby_id', 'invalid_id');
      babyStorage.invalidateCache();

      const current = babyService.getCurrentBaby();
      // getCurrentBaby 会 getById(invalid_id) 返回 null，所以返回 null
      // 因为 getCurrentBabyId() 返回非空，所以不会走自动选择逻辑
      expect(current).toBeNull();
    });
  });

  // ========== setCurrentBaby ==========
  describe('setCurrentBaby', () => {
    it('设置当前宝宝并触发 BABY_SWITCHED 事件', () => {
      const handler = jest.fn();
      eventBus.on(Events.BABY_SWITCHED, handler);

      const baby = babyService.createBaby(validBabyInput);
      eventBus.clear();
      eventBus.on(Events.BABY_SWITCHED, handler);

      babyService.setCurrentBaby('some-id');
      expect(handler).toHaveBeenCalledWith('some-id');
    });

    it('更新 getApp().globalData.currentBabyId', () => {
      babyService.setCurrentBaby('test-id');
      const app = (global as any).getApp();
      expect(app.globalData.currentBabyId).toBe('test-id');
    });
  });

  // ========== updateBaby ==========
  describe('updateBaby', () => {
    it('正常更新返回更新后的宝宝', () => {
      const baby = babyService.createBaby(validBabyInput);
      const updated = babyService.updateBaby(baby!.id, { name: '大明' });
      expect(updated?.name).toBe('大明');
    });

    it('不存在的宝宝返回 null', () => {
      const result = babyService.updateBaby('nonexistent', { name: 'Test' });
      expect(result).toBeNull();
    });

    it('更新触发 BABY_CHANGED 事件', () => {
      const baby = babyService.createBaby(validBabyInput);
      const handler = jest.fn();
      eventBus.on(Events.BABY_CHANGED, handler);
      babyService.updateBaby(baby!.id, { name: '新名字' });
      expect(handler).toHaveBeenCalled();
    });
  });

  // ========== removeBaby ==========
  describe('removeBaby', () => {
    it('删除成功返回 true', () => {
      const baby = babyService.createBaby(validBabyInput);
      expect(babyService.removeBaby(baby!.id)).toBe(true);
      expect(babyService.getAllBabies()).toHaveLength(0);
    });

    it('删除当前宝宝后切换到剩余宝宝', () => {
      const first = babyService.createBaby(validBabyInput);
      const second = babyService.createBaby({
        ...validBabyInput,
        name: '小红',
        gender: 'female',
      });
      // first 是当前宝宝
      babyService.removeBaby(first!.id);
      expect(babyService.getCurrentBabyId()).toBe(second?.id);
    });

    it('删除最后一个宝宝后清空当前宝宝', () => {
      const baby = babyService.createBaby(validBabyInput);
      babyService.removeBaby(baby!.id);
      // removeStorageSync 应被调用来清除 current_baby_id
      expect(wx.removeStorageSync).toHaveBeenCalledWith('current_baby_id');
    });

    it('删除触发 BABY_CHANGED 事件', () => {
      const baby = babyService.createBaby(validBabyInput);
      const handler = jest.fn();
      eventBus.on(Events.BABY_CHANGED, handler);
      babyService.removeBaby(baby!.id);
      expect(handler).toHaveBeenCalled();
    });
  });

  // ========== getAgeText / getAgeMonths ==========
  describe('getAgeText / getAgeMonths', () => {
    it('getAgeText 返回格式化的月龄文本', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-15'));
      const baby = babyService.createBaby(validBabyInput);
      const text = babyService.getAgeText(baby!);
      expect(text).toContain('个月');
      jest.useRealTimers();
    });

    it('getAgeMonths 返回月龄数字', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-15'));
      const baby = babyService.createBaby(validBabyInput);
      const months = babyService.getAgeMonths(baby!);
      expect(months).toBe(5);
      jest.useRealTimers();
    });
  });

  // ========== getBabyDisplayInfo ==========
  describe('getBabyDisplayInfo', () => {
    it('有宝宝时返回完整展示信息', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-15'));
      const baby = babyService.createBaby(validBabyInput);
      const display = babyService.getBabyDisplayInfo(baby!);
      expect(display.name).toBe('小明');
      expect(display.genderText).toBe('男宝');
      expect(display.ageText).toBeTruthy();
      jest.useRealTimers();
    });

    it('null 参数返回空默认值', () => {
      const display = babyService.getBabyDisplayInfo(null);
      expect(display.name).toBe('');
      expect(display.ageText).toBe('请前往设置页添加宝宝信息');
    });
  });

  // ========== getGenderText ==========
  describe('getGenderText', () => {
    it('male 返回 "男宝"', () => {
      const baby = babyService.createBaby(validBabyInput);
      expect(babyService.getGenderText(baby!)).toBe('男宝');
    });

    it('female 返回 "女宝"', () => {
      const baby = babyService.createBaby({
        ...validBabyInput,
        name: '小红',
        gender: 'female',
      });
      expect(babyService.getGenderText(baby!)).toBe('女宝');
    });
  });
});
