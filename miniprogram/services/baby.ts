/**
 * BabyService - 宝宝信息管理服务
 * 管理宝宝基本信息的 CRUD 操作、当前宝宝切换、月龄计算
 */

import { babyStorage, generateId, nowISO } from './storage';
import { validateBabyInfo } from '../utils/validator';
import { formatAge, calculateAge, getAgeInMonths } from '../utils/date';
import eventBus, { Events } from '../utils/event-bus';
import type { BabyInfo, CreateBabyInput, UpdateBabyInput } from '../types/index';

const CURRENT_BABY_KEY = 'current_baby_id';

class BabyService {
  /**
   * 获取所有宝宝信息
   */
  getAllBabies(): BabyInfo[] {
    return babyStorage.getAll();
  }

  /**
   * 根据 ID 获取宝宝信息
   */
  getBabyById(id: string): BabyInfo | undefined {
    return babyStorage.getById(id);
  }

  /**
   * 获取当前选中的宝宝 ID
   */
  getCurrentBabyId(): string | null {
    try {
      return wx.getStorageSync(CURRENT_BABY_KEY) || null;
    } catch {
      return null;
    }
  }

  /**
   * 获取当前选中的宝宝信息
   */
  getCurrentBaby(): BabyInfo | null {
    const id = this.getCurrentBabyId();
    if (!id) {
      // 若未设置当前宝宝，尝试取第一个
      const all = this.getAllBabies();
      if (all.length > 0) {
        this.setCurrentBaby(all[0].id);
        return all[0];
      }
      return null;
    }
    return this.getBabyById(id) || null;
  }

  /**
   * 设置当前宝宝
   */
  setCurrentBaby(babyId: string): void {
    try {
      wx.setStorageSync(CURRENT_BABY_KEY, babyId);
      const app = getApp<{ globalData: { currentBabyId: string | null } }>();
      if (app?.globalData) {
        app.globalData.currentBabyId = babyId;
      }
      eventBus.emit(Events.BABY_SWITCHED, babyId);
    } catch (e) {
      console.error('[BabyService] 设置当前宝宝失败:', e);
    }
  }

  /**
   * 创建宝宝信息
   */
  createBaby(input: CreateBabyInput): BabyInfo | null {
    const validation = validateBabyInfo(input);
    if (!validation.valid) {
      wx.showToast({ title: validation.errors[0], icon: 'none' });
      return null;
    }

    const now = nowISO();
    const baby: BabyInfo = {
      id: generateId(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    babyStorage.add(baby);

    // 如果是第一个宝宝，自动设置为当前宝宝
    if (this.getAllBabies().length === 1) {
      this.setCurrentBaby(baby.id);
    }

    eventBus.emit(Events.BABY_CHANGED, baby);
    return baby;
  }

  /**
   * 更新宝宝信息
   */
  updateBaby(id: string, updates: UpdateBabyInput): BabyInfo | null {
    const existing = this.getBabyById(id);
    if (!existing) {
      wx.showToast({ title: '宝宝信息不存在', icon: 'none' });
      return null;
    }

    const merged = { ...existing, ...updates };
    const validation = validateBabyInfo(merged);
    if (!validation.valid) {
      wx.showToast({ title: validation.errors[0], icon: 'none' });
      return null;
    }

    const updated = babyStorage.update(id, {
      ...updates,
      updatedAt: nowISO(),
    } as any);

    if (updated) {
      eventBus.emit(Events.BABY_CHANGED, updated);
    }
    return updated as BabyInfo || null;
  }

  /**
   * 删除宝宝信息
   */
  removeBaby(id: string): boolean {
    const success = babyStorage.remove(id);
    if (success) {
      // 若删除的是当前宝宝，切换到第一个
      if (this.getCurrentBabyId() === id) {
        const remaining = this.getAllBabies();
        if (remaining.length > 0) {
          this.setCurrentBaby(remaining[0].id);
        } else {
          try {
            wx.removeStorageSync(CURRENT_BABY_KEY);
          } catch {}
        }
      }
      eventBus.emit(Events.BABY_CHANGED);
    }
    return success;
  }

  /**
   * 获取宝宝月龄文本
   */
  getAgeText(baby: BabyInfo): string {
    return formatAge(baby.birthDate);
  }

  /**
   * 获取宝宝月龄数字
   */
  getAgeMonths(baby: BabyInfo): number {
    return getAgeInMonths(baby.birthDate);
  }

  /**
   * 获取宝宝详细年龄
   */
  getAgeDetail(baby: BabyInfo): { months: number; days: number; totalDays: number } {
    return calculateAge(baby.birthDate);
  }

  /**
   * 获取宝宝性别文本
   */
  getGenderText(baby: BabyInfo): string {
    return baby.gender === 'male' ? '男宝' : '女宝';
  }

  /**
   * 获取宝宝完整展示信息
   */
  getBabyDisplayInfo(baby: BabyInfo | null): {
    name: string;
    ageText: string;
    genderText: string;
    avatarUrl: string;
    gender: string;
    birthDate: string;
  } {
    if (!baby) {
      return {
        name: '',
        ageText: '请前往设置页添加宝宝信息',
        genderText: '',
        avatarUrl: '',
        gender: '',
        birthDate: '',
      };
    }
    return {
      name: baby.name,
      ageText: this.getAgeText(baby),
      genderText: this.getGenderText(baby),
      avatarUrl: baby.avatarUrl || '',
      gender: baby.gender,
      birthDate: baby.birthDate,
    };
  }
}

export const babyService = new BabyService();
export default babyService;
