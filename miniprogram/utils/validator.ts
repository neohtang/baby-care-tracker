/**
 * 数据校验工具函数
 * 提供各类型记录的字段校验
 */

/** 校验结果 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息列表 */
  errors: string[];
}

/**
 * 创建校验结果
 */
function result(valid: boolean, errors: string[] = []): ValidationResult {
  return { valid, errors };
}

/**
 * 校验必填字符串字段
 */
export function validateRequired(value: any, fieldName: string): string | null {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName}不能为空`;
  }
  return null;
}

/**
 * 校验日期格式（YYYY-MM-DD 或 ISO 8601）
 */
export function validateDate(value: string, fieldName: string): string | null {
  if (!value) return `${fieldName}不能为空`;

  // 简单的日期格式校验
  const dateRegex = /^\d{4}-\d{2}-\d{2}/;
  if (!dateRegex.test(value)) {
    return `${fieldName}格式不正确`;
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return `${fieldName}不是有效日期`;
  }

  return null;
}

/**
 * 校验数值范围
 */
export function validateNumberRange(
  value: number | undefined,
  fieldName: string,
  min: number,
  max: number,
  required: boolean = false
): string | null {
  if (value === undefined || value === null) {
    return required ? `${fieldName}不能为空` : null;
  }

  if (typeof value !== 'number' || isNaN(value)) {
    return `${fieldName}必须是有效数字`;
  }

  if (value < min || value > max) {
    return `${fieldName}应在 ${min} ~ ${max} 之间`;
  }

  return null;
}

/**
 * 校验枚举值
 */
export function validateEnum<T extends string>(
  value: T | undefined,
  fieldName: string,
  allowedValues: T[],
  required: boolean = true
): string | null {
  if (value === undefined || value === null) {
    return required ? `${fieldName}不能为空` : null;
  }

  if (!allowedValues.includes(value)) {
    return `${fieldName}的值不合法`;
  }

  return null;
}

// ============ 模块级校验函数 ============

/**
 * 校验宝宝信息
 */
export function validateBabyInfo(data: any): ValidationResult {
  const errors: string[] = [];

  const nameErr = validateRequired(data.name, '宝宝姓名');
  if (nameErr) errors.push(nameErr);

  const genderErr = validateEnum(data.gender, '性别', ['male', 'female']);
  if (genderErr) errors.push(genderErr);

  const birthErr = validateDate(data.birthDate, '出生日期');
  if (birthErr) errors.push(birthErr);

  // 出生日期不能在未来
  if (data.birthDate && new Date(data.birthDate) > new Date()) {
    errors.push('出生日期不能晚于今天');
  }

  if (data.birthWeight !== undefined) {
    const weightErr = validateNumberRange(data.birthWeight, '出生体重', 0.3, 10);
    if (weightErr) errors.push(weightErr);
  }

  if (data.birthHeight !== undefined) {
    const heightErr = validateNumberRange(data.birthHeight, '出生身长', 20, 65);
    if (heightErr) errors.push(heightErr);
  }

  return result(errors.length === 0, errors);
}

/**
 * 校验喂养记录
 */
export function validateFeedingRecord(data: any): ValidationResult {
  const errors: string[] = [];

  const typeErr = validateEnum(data.type, '喂养类型', ['breast', 'formula', 'solid']);
  if (typeErr) errors.push(typeErr);

  const timeErr = validateDate(data.startTime, '开始时间');
  if (timeErr) errors.push(timeErr);

  if (data.type === 'breast') {
    if (data.duration !== undefined) {
      const durErr = validateNumberRange(data.duration, '喂养时长', 0, 120);
      if (durErr) errors.push(durErr);
    }
    if (data.side) {
      const sideErr = validateEnum(data.side, '喂养侧', ['left', 'right', 'both']);
      if (sideErr) errors.push(sideErr);
    }
  }

  if (data.type === 'formula') {
    const amountErr = validateNumberRange(data.amount, '奶量', 0, 500, true);
    if (amountErr) errors.push(amountErr);
  }

  if (data.type === 'solid') {
    if (data.amount !== undefined) {
      const amountErr = validateNumberRange(data.amount, '辅食量', 0, 500);
      if (amountErr) errors.push(amountErr);
    }
  }

  return result(errors.length === 0, errors);
}

/**
 * 校验睡眠记录
 */
export function validateSleepRecord(data: any): ValidationResult {
  const errors: string[] = [];

  const startErr = validateDate(data.startTime, '入睡时间');
  if (startErr) errors.push(startErr);

  const typeErr = validateEnum(data.type, '睡眠类型', ['nap', 'night']);
  if (typeErr) errors.push(typeErr);

  if (data.endTime) {
    const endErr = validateDate(data.endTime, '醒来时间');
    if (endErr) errors.push(endErr);

    if (data.startTime && data.endTime && new Date(data.endTime) <= new Date(data.startTime)) {
      errors.push('醒来时间必须晚于入睡时间');
    }
  }

  if (data.quality !== undefined) {
    const qualityErr = validateNumberRange(data.quality, '睡眠质量', 1, 5);
    if (qualityErr) errors.push(qualityErr);
  }

  return result(errors.length === 0, errors);
}

/**
 * 校验排便记录
 */
export function validateDiaperRecord(data: any): ValidationResult {
  const errors: string[] = [];

  const timeErr = validateDate(data.time, '记录时间');
  if (timeErr) errors.push(timeErr);

  const typeErr = validateEnum(data.type, '类型', ['pee', 'poop', 'both']);
  if (typeErr) errors.push(typeErr);

  if (data.poopColor) {
    const colorErr = validateEnum(
      data.poopColor, '大便颜色',
      ['yellow', 'green', 'brown', 'black', 'red', 'white', 'other']
    );
    if (colorErr) errors.push(colorErr);
  }

  if (data.poopTexture) {
    const textureErr = validateEnum(
      data.poopTexture, '大便质地',
      ['watery', 'soft', 'normal', 'hard', 'mucus', 'other']
    );
    if (textureErr) errors.push(textureErr);
  }

  return result(errors.length === 0, errors);
}

/**
 * 校验健康记录
 */
export function validateHealthRecord(data: any): ValidationResult {
  const errors: string[] = [];

  const typeErr = validateEnum(data.recordType, '记录类型', ['temperature', 'medication', 'symptom']);
  if (typeErr) errors.push(typeErr);

  const timeErr = validateDate(data.time, '记录时间');
  if (timeErr) errors.push(timeErr);

  if (data.recordType === 'temperature') {
    const tempErr = validateNumberRange(data.temperature, '体温', 34.0, 43.0, true);
    if (tempErr) errors.push(tempErr);

    if (data.temperatureSite) {
      const siteErr = validateEnum(
        data.temperatureSite, '测量部位',
        ['axillary', 'forehead', 'ear', 'oral', 'rectal']
      );
      if (siteErr) errors.push(siteErr);
    }
  }

  if (data.recordType === 'medication') {
    const nameErr = validateRequired(data.medicationName, '药物名称');
    if (nameErr) errors.push(nameErr);
  }

  return result(errors.length === 0, errors);
}

/**
 * 校验生长记录
 */
export function validateGrowthRecord(data: any): ValidationResult {
  const errors: string[] = [];

  const dateErr = validateDate(data.date, '测量日期');
  if (dateErr) errors.push(dateErr);

  // 至少需要填写一项测量数据
  const hasWeight = data.weight !== undefined && data.weight !== null;
  const hasHeight = data.height !== undefined && data.height !== null;
  const hasHead = data.headCircumference !== undefined && data.headCircumference !== null;

  if (!hasWeight && !hasHeight && !hasHead) {
    errors.push('请至少填写身高、体重、头围中的一项');
  }

  if (hasWeight) {
    const weightErr = validateNumberRange(data.weight, '体重', 0.3, 30);
    if (weightErr) errors.push(weightErr);
  }

  if (hasHeight) {
    const heightErr = validateNumberRange(data.height, '身高', 20, 120);
    if (heightErr) errors.push(heightErr);
  }

  if (hasHead) {
    const headErr = validateNumberRange(data.headCircumference, '头围', 20, 60);
    if (headErr) errors.push(headErr);
  }

  return result(errors.length === 0, errors);
}

/**
 * 校验疫苗接种记录
 */
export function validateVaccinationRecord(data: any): ValidationResult {
  const errors: string[] = [];

  const vaccineIdErr = validateRequired(data.vaccineId, '疫苗');
  if (vaccineIdErr) errors.push(vaccineIdErr);

  const dateErr = validateDate(data.date, '接种日期');
  if (dateErr) errors.push(dateErr);

  const statusErr = validateEnum(data.status, '接种状态', ['pending', 'completed', 'overdue', 'skipped']);
  if (statusErr) errors.push(statusErr);

  return result(errors.length === 0, errors);
}

/**
 * 校验里程碑记录
 */
export function validateMilestoneRecord(data: any): ValidationResult {
  const errors: string[] = [];

  const milestoneIdErr = validateRequired(data.milestoneId, '里程碑项目');
  if (milestoneIdErr) errors.push(milestoneIdErr);

  const dateErr = validateDate(data.achievedDate, '达成日期');
  if (dateErr) errors.push(dateErr);

  const statusErr = validateEnum(data.status, '状态', ['pending', 'achieved', 'concern']);
  if (statusErr) errors.push(statusErr);

  return result(errors.length === 0, errors);
}
