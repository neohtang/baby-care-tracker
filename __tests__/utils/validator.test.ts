/**
 * validator.ts 单元测试
 * 覆盖通用校验函数和8个模块级校验函数
 */
import {
  validateRequired,
  validateDate,
  validateNumberRange,
  validateEnum,
  validateBabyInfo,
  validateFeedingRecord,
  validateSleepRecord,
  validateDiaperRecord,
  validateHealthRecord,
  validateGrowthRecord,
  validateVaccinationRecord,
  validateMilestoneRecord,
} from '../../miniprogram/utils/validator';

describe('validator.ts', () => {
  // ========== 通用校验函数 ==========
  describe('validateRequired', () => {
    it('有效值返回 null', () => {
      expect(validateRequired('hello', '名称')).toBeNull();
      expect(validateRequired(123, '数字')).toBeNull();
    });

    it('空值返回错误信息', () => {
      expect(validateRequired(undefined, '名称')).toBe('名称不能为空');
      expect(validateRequired(null, '名称')).toBe('名称不能为空');
      expect(validateRequired('', '名称')).toBe('名称不能为空');
      expect(validateRequired('   ', '名称')).toBe('名称不能为空');
    });
  });

  describe('validateDate', () => {
    it('有效日期返回 null', () => {
      expect(validateDate('2025-06-15', '日期')).toBeNull();
      expect(validateDate('2025-06-15T10:30:00.000Z', '日期')).toBeNull();
    });

    it('空值返回错误', () => {
      expect(validateDate('', '日期')).toBe('日期不能为空');
    });

    it('格式不正确返回错误', () => {
      expect(validateDate('hello', '日期')).toBe('日期格式不正确');
    });

    it('无效日期值返回错误', () => {
      expect(validateDate('2025-13-45', '日期')).toBe('日期不是有效日期');
    });
  });

  describe('validateNumberRange', () => {
    it('在范围内返回 null', () => {
      expect(validateNumberRange(5, '体重', 0, 10)).toBeNull();
      expect(validateNumberRange(0, '体重', 0, 10)).toBeNull();
      expect(validateNumberRange(10, '体重', 0, 10)).toBeNull();
    });

    it('超出范围返回错误', () => {
      expect(validateNumberRange(-1, '体重', 0, 10)).toBe('体重应在 0 ~ 10 之间');
      expect(validateNumberRange(11, '体重', 0, 10)).toBe('体重应在 0 ~ 10 之间');
    });

    it('required=false 时 undefined 返回 null', () => {
      expect(validateNumberRange(undefined, '体重', 0, 10, false)).toBeNull();
    });

    it('required=true 时 undefined 返回错误', () => {
      expect(validateNumberRange(undefined, '体重', 0, 10, true)).toBe('体重不能为空');
    });

    it('NaN 返回错误', () => {
      expect(validateNumberRange(NaN, '体重', 0, 10)).toBe('体重必须是有效数字');
    });
  });

  describe('validateEnum', () => {
    it('有效枚举值返回 null', () => {
      expect(validateEnum('male', '性别', ['male', 'female'])).toBeNull();
    });

    it('无效枚举值返回错误', () => {
      expect(validateEnum('other' as any, '性别', ['male', 'female'])).toBe('性别的值不合法');
    });

    it('required=true 时 undefined 返回错误', () => {
      expect(validateEnum(undefined, '性别', ['male', 'female'], true)).toBe('性别不能为空');
    });

    it('required=false 时 undefined 返回 null', () => {
      expect(validateEnum(undefined, '性别', ['male', 'female'], false)).toBeNull();
    });
  });

  // ========== 模块级校验函数 ==========
  describe('validateBabyInfo', () => {
    const validBaby = {
      name: '小明',
      gender: 'male',
      birthDate: '2025-01-01',
    };

    it('有效数据通过校验', () => {
      const result = validateBabyInfo(validBaby);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('缺少姓名返回错误', () => {
      const result = validateBabyInfo({ ...validBaby, name: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('宝宝姓名不能为空');
    });

    it('无效性别返回错误', () => {
      const result = validateBabyInfo({ ...validBaby, gender: 'other' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('性别的值不合法');
    });

    it('出生日期在未来返回错误', () => {
      const result = validateBabyInfo({ ...validBaby, birthDate: '2099-01-01' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('出生日期不能晚于今天');
    });

    it('出生体重超范围返回错误', () => {
      const result = validateBabyInfo({ ...validBaby, birthWeight: 0.1 });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('出生体重'))).toBe(true);
    });

    it('出生体重在有效范围内通过', () => {
      const result = validateBabyInfo({ ...validBaby, birthWeight: 3.5 });
      expect(result.valid).toBe(true);
    });

    it('出生身长超范围返回错误', () => {
      const result = validateBabyInfo({ ...validBaby, birthHeight: 10 });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateFeedingRecord', () => {
    it('有效母乳记录通过', () => {
      const result = validateFeedingRecord({
        type: 'breast',
        startTime: '2025-06-15T08:00:00',
        duration: 20,
        side: 'left',
      });
      expect(result.valid).toBe(true);
    });

    it('有效配方奶记录通过', () => {
      const result = validateFeedingRecord({
        type: 'formula',
        startTime: '2025-06-15T08:00:00',
        amount: 120,
      });
      expect(result.valid).toBe(true);
    });

    it('配方奶缺少奶量返回错误', () => {
      const result = validateFeedingRecord({
        type: 'formula',
        startTime: '2025-06-15T08:00:00',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('奶量'))).toBe(true);
    });

    it('喂养时长超范围返回错误', () => {
      const result = validateFeedingRecord({
        type: 'breast',
        startTime: '2025-06-15T08:00:00',
        duration: 150,
      });
      expect(result.valid).toBe(false);
    });

    it('无效喂养类型返回错误', () => {
      const result = validateFeedingRecord({
        type: 'invalid',
        startTime: '2025-06-15T08:00:00',
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateSleepRecord', () => {
    it('有效记录通过', () => {
      const result = validateSleepRecord({
        startTime: '2025-06-15T21:00:00',
        type: 'night',
      });
      expect(result.valid).toBe(true);
    });

    it('醒来时间早于入睡时间返回错误', () => {
      const result = validateSleepRecord({
        startTime: '2025-06-15T21:00:00',
        endTime: '2025-06-15T20:00:00',
        type: 'night',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('醒来时间必须晚于入睡时间');
    });

    it('睡眠质量超范围返回错误', () => {
      const result = validateSleepRecord({
        startTime: '2025-06-15T21:00:00',
        type: 'night',
        quality: 6,
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateDiaperRecord', () => {
    it('有效记录通过', () => {
      const result = validateDiaperRecord({
        time: '2025-06-15T08:00:00',
        type: 'pee',
      });
      expect(result.valid).toBe(true);
    });

    it('有效大便记录带颜色和质地通过', () => {
      const result = validateDiaperRecord({
        time: '2025-06-15T08:00:00',
        type: 'poop',
        poopColor: 'yellow',
        poopTexture: 'normal',
      });
      expect(result.valid).toBe(true);
    });

    it('无效类型返回错误', () => {
      const result = validateDiaperRecord({
        time: '2025-06-15T08:00:00',
        type: 'invalid',
      });
      expect(result.valid).toBe(false);
    });

    it('无效颜色返回错误', () => {
      const result = validateDiaperRecord({
        time: '2025-06-15T08:00:00',
        type: 'poop',
        poopColor: 'purple',
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateHealthRecord', () => {
    it('有效体温记录通过', () => {
      const result = validateHealthRecord({
        recordType: 'temperature',
        time: '2025-06-15T08:00:00',
        temperature: 36.5,
      });
      expect(result.valid).toBe(true);
    });

    it('体温超范围返回错误', () => {
      const result = validateHealthRecord({
        recordType: 'temperature',
        time: '2025-06-15T08:00:00',
        temperature: 44,
      });
      expect(result.valid).toBe(false);
    });

    it('体温低于34返回错误', () => {
      const result = validateHealthRecord({
        recordType: 'temperature',
        time: '2025-06-15T08:00:00',
        temperature: 33,
      });
      expect(result.valid).toBe(false);
    });

    it('有效用药记录通过', () => {
      const result = validateHealthRecord({
        recordType: 'medication',
        time: '2025-06-15T08:00:00',
        medicationName: '布洛芬',
      });
      expect(result.valid).toBe(true);
    });

    it('用药记录缺少药名返回错误', () => {
      const result = validateHealthRecord({
        recordType: 'medication',
        time: '2025-06-15T08:00:00',
      });
      expect(result.valid).toBe(false);
    });

    it('有效症状记录通过', () => {
      const result = validateHealthRecord({
        recordType: 'symptom',
        time: '2025-06-15T08:00:00',
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('validateGrowthRecord', () => {
    it('有体重的有效记录通过', () => {
      const result = validateGrowthRecord({
        date: '2025-06-15',
        weight: 5.5,
      });
      expect(result.valid).toBe(true);
    });

    it('至少需要一项测量数据', () => {
      const result = validateGrowthRecord({
        date: '2025-06-15',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('请至少填写身高、体重、头围中的一项');
    });

    it('体重超范围返回错误', () => {
      const result = validateGrowthRecord({
        date: '2025-06-15',
        weight: 35,
      });
      expect(result.valid).toBe(false);
    });

    it('身高超范围返回错误', () => {
      const result = validateGrowthRecord({
        date: '2025-06-15',
        height: 15,
      });
      expect(result.valid).toBe(false);
    });

    it('头围在有效范围通过', () => {
      const result = validateGrowthRecord({
        date: '2025-06-15',
        headCircumference: 35,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('validateVaccinationRecord', () => {
    it('有效记录通过', () => {
      const result = validateVaccinationRecord({
        vaccineId: 'bcg_1',
        date: '2025-01-01',
        status: 'completed',
      });
      expect(result.valid).toBe(true);
    });

    it('缺少疫苗 ID 返回错误', () => {
      const result = validateVaccinationRecord({
        date: '2025-01-01',
        status: 'completed',
      });
      expect(result.valid).toBe(false);
    });

    it('无效状态返回错误', () => {
      const result = validateVaccinationRecord({
        vaccineId: 'bcg_1',
        date: '2025-01-01',
        status: 'invalid',
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateMilestoneRecord', () => {
    it('有效记录通过', () => {
      const result = validateMilestoneRecord({
        milestoneId: 'gm_01',
        achievedDate: '2025-06-15',
        status: 'achieved',
      });
      expect(result.valid).toBe(true);
    });

    it('缺少里程碑 ID 返回错误', () => {
      const result = validateMilestoneRecord({
        achievedDate: '2025-06-15',
        status: 'achieved',
      });
      expect(result.valid).toBe(false);
    });

    it('无效状态返回错误', () => {
      const result = validateMilestoneRecord({
        milestoneId: 'gm_01',
        achievedDate: '2025-06-15',
        status: 'invalid',
      });
      expect(result.valid).toBe(false);
    });
  });
});
