/**
 * WHO 儿童生长标准参考数据（0-12个月）
 * 
 * 数据来源：World Health Organization Child Growth Standards (2006)
 * - Weight-for-age (体重-月龄)
 * - Length-for-age (身长-月龄)  
 * - Head circumference-for-age (头围-月龄)
 * 
 * 百分位数说明：
 * - p3:  第3百分位（偏低范围下界）
 * - p15: 第15百分位（偏低）
 * - p50: 第50百分位（中位数/标准值）
 * - p85: 第85百分位（偏高）
 * - p97: 第97百分位（偏高范围上界）
 * 
 * 注意：此数据仅供参考对照，不作为医学诊断依据。
 */

import type { WHOGrowthStandard, WHOPercentilePoint } from '../types/index';

// ===================================================================
// 男婴 - 体重（kg）
// ===================================================================
const maleWeightData: WHOPercentilePoint[] = [
  { month: 0,  p3: 2.5,  p15: 2.9,  p50: 3.3,  p85: 3.9,  p97: 4.3  },
  { month: 1,  p3: 3.4,  p15: 3.9,  p50: 4.5,  p85: 5.1,  p97: 5.7  },
  { month: 2,  p3: 4.3,  p15: 4.9,  p50: 5.6,  p85: 6.3,  p97: 7.0  },
  { month: 3,  p3: 5.0,  p15: 5.7,  p50: 6.4,  p85: 7.2,  p97: 7.9  },
  { month: 4,  p3: 5.6,  p15: 6.3,  p50: 7.0,  p85: 7.8,  p97: 8.6  },
  { month: 5,  p3: 6.0,  p15: 6.7,  p50: 7.5,  p85: 8.4,  p97: 9.2  },
  { month: 6,  p3: 6.4,  p15: 7.1,  p50: 7.9,  p85: 8.8,  p97: 9.7  },
  { month: 7,  p3: 6.7,  p15: 7.4,  p50: 8.3,  p85: 9.2,  p97: 10.2 },
  { month: 8,  p3: 6.9,  p15: 7.7,  p50: 8.6,  p85: 9.6,  p97: 10.5 },
  { month: 9,  p3: 7.1,  p15: 8.0,  p50: 8.9,  p85: 9.9,  p97: 10.9 },
  { month: 10, p3: 7.4,  p15: 8.2,  p50: 9.2,  p85: 10.2, p97: 11.2 },
  { month: 11, p3: 7.6,  p15: 8.4,  p50: 9.4,  p85: 10.5, p97: 11.5 },
  { month: 12, p3: 7.7,  p15: 8.6,  p50: 9.6,  p85: 10.8, p97: 11.8 }
];

// ===================================================================
// 男婴 - 身长（cm）
// ===================================================================
const maleHeightData: WHOPercentilePoint[] = [
  { month: 0,  p3: 46.3, p15: 47.9, p50: 49.9, p85: 51.8, p97: 53.4 },
  { month: 1,  p3: 50.8, p15: 52.3, p50: 54.7, p85: 56.7, p97: 58.4 },
  { month: 2,  p3: 54.0, p15: 55.8, p50: 58.4, p85: 60.5, p97: 62.2 },
  { month: 3,  p3: 57.0, p15: 58.8, p50: 61.4, p85: 63.5, p97: 65.3 },
  { month: 4,  p3: 59.5, p15: 61.3, p50: 63.9, p85: 66.0, p97: 67.8 },
  { month: 5,  p3: 61.5, p15: 63.4, p50: 65.9, p85: 68.0, p97: 69.9 },
  { month: 6,  p3: 63.3, p15: 65.1, p50: 67.6, p85: 69.8, p97: 71.6 },
  { month: 7,  p3: 64.8, p15: 66.7, p50: 69.2, p85: 71.3, p97: 73.2 },
  { month: 8,  p3: 66.2, p15: 68.1, p50: 70.6, p85: 72.8, p97: 74.7 },
  { month: 9,  p3: 67.5, p15: 69.4, p50: 72.0, p85: 74.2, p97: 76.2 },
  { month: 10, p3: 68.7, p15: 70.7, p50: 73.3, p85: 75.6, p97: 77.6 },
  { month: 11, p3: 69.9, p15: 71.9, p50: 74.5, p85: 76.9, p97: 78.9 },
  { month: 12, p3: 71.0, p15: 73.0, p50: 75.7, p85: 78.1, p97: 80.2 }
];

// ===================================================================
// 男婴 - 头围（cm）
// ===================================================================
const maleHeadData: WHOPercentilePoint[] = [
  { month: 0,  p3: 32.1, p15: 33.1, p50: 34.5, p85: 35.8, p97: 36.9 },
  { month: 1,  p3: 34.9, p15: 35.8, p50: 37.3, p85: 38.6, p97: 39.6 },
  { month: 2,  p3: 36.8, p15: 37.8, p50: 39.1, p85: 40.5, p97: 41.5 },
  { month: 3,  p3: 38.1, p15: 39.1, p50: 40.5, p85: 41.9, p97: 42.9 },
  { month: 4,  p3: 39.2, p15: 40.2, p50: 41.6, p85: 43.0, p97: 44.0 },
  { month: 5,  p3: 40.1, p15: 41.0, p50: 42.6, p85: 43.9, p97: 44.9 },
  { month: 6,  p3: 40.8, p15: 41.8, p50: 43.3, p85: 44.6, p97: 45.6 },
  { month: 7,  p3: 41.5, p15: 42.4, p50: 43.9, p85: 45.3, p97: 46.3 },
  { month: 8,  p3: 42.0, p15: 43.0, p50: 44.5, p85: 45.8, p97: 46.9 },
  { month: 9,  p3: 42.5, p15: 43.4, p50: 45.0, p85: 46.3, p97: 47.4 },
  { month: 10, p3: 42.9, p15: 43.9, p50: 45.4, p85: 46.7, p97: 47.8 },
  { month: 11, p3: 43.2, p15: 44.2, p50: 45.8, p85: 47.1, p97: 48.2 },
  { month: 12, p3: 43.5, p15: 44.6, p50: 46.1, p85: 47.5, p97: 48.5 }
];

// ===================================================================
// 女婴 - 体重（kg）
// ===================================================================
const femaleWeightData: WHOPercentilePoint[] = [
  { month: 0,  p3: 2.4,  p15: 2.8,  p50: 3.2,  p85: 3.7,  p97: 4.2  },
  { month: 1,  p3: 3.2,  p15: 3.6,  p50: 4.2,  p85: 4.8,  p97: 5.4  },
  { month: 2,  p3: 3.9,  p15: 4.5,  p50: 5.1,  p85: 5.9,  p97: 6.5  },
  { month: 3,  p3: 4.5,  p15: 5.1,  p50: 5.8,  p85: 6.6,  p97: 7.4  },
  { month: 4,  p3: 5.0,  p15: 5.6,  p50: 6.4,  p85: 7.3,  p97: 8.1  },
  { month: 5,  p3: 5.4,  p15: 6.1,  p50: 6.9,  p85: 7.8,  p97: 8.7  },
  { month: 6,  p3: 5.7,  p15: 6.4,  p50: 7.3,  p85: 8.2,  p97: 9.2  },
  { month: 7,  p3: 6.0,  p15: 6.7,  p50: 7.6,  p85: 8.6,  p97: 9.6  },
  { month: 8,  p3: 6.3,  p15: 7.0,  p50: 7.9,  p85: 9.0,  p97: 10.0 },
  { month: 9,  p3: 6.5,  p15: 7.3,  p50: 8.2,  p85: 9.3,  p97: 10.4 },
  { month: 10, p3: 6.7,  p15: 7.5,  p50: 8.5,  p85: 9.6,  p97: 10.7 },
  { month: 11, p3: 6.9,  p15: 7.7,  p50: 8.7,  p85: 9.9,  p97: 11.0 },
  { month: 12, p3: 7.0,  p15: 7.9,  p50: 8.9,  p85: 10.1, p97: 11.3 }
];

// ===================================================================
// 女婴 - 身长（cm）
// ===================================================================
const femaleHeightData: WHOPercentilePoint[] = [
  { month: 0,  p3: 45.6, p15: 47.0, p50: 49.1, p85: 51.0, p97: 52.7 },
  { month: 1,  p3: 49.8, p15: 51.2, p50: 53.7, p85: 55.6, p97: 57.4 },
  { month: 2,  p3: 52.9, p15: 54.5, p50: 57.1, p85: 59.1, p97: 60.9 },
  { month: 3,  p3: 55.6, p15: 57.2, p50: 59.8, p85: 61.9, p97: 63.8 },
  { month: 4,  p3: 57.8, p15: 59.5, p50: 62.1, p85: 64.3, p97: 66.2 },
  { month: 5,  p3: 59.6, p15: 61.4, p50: 64.0, p85: 66.2, p97: 68.2 },
  { month: 6,  p3: 61.2, p15: 63.0, p50: 65.7, p85: 68.0, p97: 69.8 },
  { month: 7,  p3: 62.7, p15: 64.5, p50: 67.3, p85: 69.5, p97: 71.4 },
  { month: 8,  p3: 64.0, p15: 65.9, p50: 68.7, p85: 71.0, p97: 72.8 },
  { month: 9,  p3: 65.3, p15: 67.2, p50: 70.1, p85: 72.4, p97: 74.2 },
  { month: 10, p3: 66.5, p15: 68.5, p50: 71.5, p85: 73.7, p97: 75.6 },
  { month: 11, p3: 67.7, p15: 69.7, p50: 72.8, p85: 75.0, p97: 77.0 },
  { month: 12, p3: 68.9, p15: 70.9, p50: 74.0, p85: 76.4, p97: 78.3 }
];

// ===================================================================
// 女婴 - 头围（cm）
// ===================================================================
const femaleHeadData: WHOPercentilePoint[] = [
  { month: 0,  p3: 31.5, p15: 32.4, p50: 33.9, p85: 35.1, p97: 36.2 },
  { month: 1,  p3: 34.2, p15: 35.1, p50: 36.5, p85: 37.8, p97: 38.8 },
  { month: 2,  p3: 35.7, p15: 36.8, p50: 38.3, p85: 39.5, p97: 40.5 },
  { month: 3,  p3: 37.1, p15: 38.1, p50: 39.5, p85: 40.9, p97: 41.9 },
  { month: 4,  p3: 38.1, p15: 39.1, p50: 40.6, p85: 41.9, p97: 42.9 },
  { month: 5,  p3: 38.9, p15: 40.0, p50: 41.5, p85: 42.7, p97: 43.8 },
  { month: 6,  p3: 39.6, p15: 40.7, p50: 42.2, p85: 43.5, p97: 44.5 },
  { month: 7,  p3: 40.2, p15: 41.2, p50: 42.8, p85: 44.1, p97: 45.2 },
  { month: 8,  p3: 40.7, p15: 41.7, p50: 43.4, p85: 44.6, p97: 45.7 },
  { month: 9,  p3: 41.2, p15: 42.2, p50: 43.8, p85: 45.1, p97: 46.2 },
  { month: 10, p3: 41.5, p15: 42.6, p50: 44.2, p85: 45.5, p97: 46.6 },
  { month: 11, p3: 41.9, p15: 43.0, p50: 44.6, p85: 45.9, p97: 47.0 },
  { month: 12, p3: 42.2, p15: 43.3, p50: 44.9, p85: 46.3, p97: 47.3 }
];

// ===================================================================
// 导出完整的 WHO 生长标准数据集
// ===================================================================

/** WHO 生长标准 - 男婴 */
export const WHO_MALE_STANDARDS: WHOGrowthStandard[] = [
  { gender: 'male', metric: 'weight', data: maleWeightData },
  { gender: 'male', metric: 'height', data: maleHeightData },
  { gender: 'male', metric: 'headCircumference', data: maleHeadData }
];

/** WHO 生长标准 - 女婴 */
export const WHO_FEMALE_STANDARDS: WHOGrowthStandard[] = [
  { gender: 'female', metric: 'weight', data: femaleWeightData },
  { gender: 'female', metric: 'height', data: femaleHeightData },
  { gender: 'female', metric: 'headCircumference', data: femaleHeadData }
];

/** 所有 WHO 生长标准数据 */
export const WHO_ALL_STANDARDS: WHOGrowthStandard[] = [
  ...WHO_MALE_STANDARDS,
  ...WHO_FEMALE_STANDARDS
];

/**
 * 根据性别和指标获取 WHO 生长标准数据
 * @param gender 性别
 * @param metric 指标类型
 */
export function getWHOStandard(
  gender: 'male' | 'female',
  metric: 'weight' | 'height' | 'headCircumference'
): WHOGrowthStandard | undefined {
  return WHO_ALL_STANDARDS.find(s => s.gender === gender && s.metric === metric);
}

/**
 * 根据性别和指标获取百分位数据数组
 * @param gender 性别
 * @param metric 指标类型
 */
export function getPercentileData(
  gender: 'male' | 'female',
  metric: 'weight' | 'height' | 'headCircumference'
): WHOPercentilePoint[] {
  const standard = getWHOStandard(gender, metric);
  return standard ? standard.data : [];
}

/**
 * 计算给定测量值在 WHO 标准中的近似百分位
 * @param gender 性别
 * @param metric 指标类型
 * @param ageInMonths 月龄
 * @param value 测量值
 * @returns 近似百分位描述字符串，如 "p50-p85"
 */
export function getPercentileRange(
  gender: 'male' | 'female',
  metric: 'weight' | 'height' | 'headCircumference',
  ageInMonths: number,
  value: number
): string {
  const data = getPercentileData(gender, metric);
  const monthData = data.find(d => d.month === Math.round(ageInMonths));

  if (!monthData) {
    return '无参考数据';
  }

  if (value < monthData.p3) return '<P3（偏低）';
  if (value < monthData.p15) return 'P3-P15（偏低）';
  if (value < monthData.p50) return 'P15-P50（中等偏下）';
  if (value < monthData.p85) return 'P50-P85（中等偏上）';
  if (value < monthData.p97) return 'P85-P97（偏高）';
  return '>P97（偏高）';
}

/**
 * 获取指定月龄的 WHO 标准中位数值
 * @param gender 性别
 * @param metric 指标类型
 * @param ageInMonths 月龄
 */
export function getMedianValue(
  gender: 'male' | 'female',
  metric: 'weight' | 'height' | 'headCircumference',
  ageInMonths: number
): number | undefined {
  const data = getPercentileData(gender, metric);
  const monthData = data.find(d => d.month === Math.round(ageInMonths));
  return monthData?.p50;
}

/** 指标单位映射 */
export const METRIC_UNITS: Record<string, string> = {
  weight: 'kg',
  height: 'cm',
  headCircumference: 'cm'
};

/** 指标中文名映射 */
export const METRIC_LABELS: Record<string, string> = {
  weight: '体重',
  height: '身长',
  headCircumference: '头围'
};
