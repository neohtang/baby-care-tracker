/**
 * 国家免疫规划疫苗清单（0-12个月阶段）
 * 
 * 数据来源：中国疾病预防控制中心《国家免疫规划疫苗儿童免疫程序》
 * 注意：本数据仅供参考，实际接种请遵医嘱。各地可能根据实际情况有所调整。
 */

import type { VaccineItem, MilestoneCategoryInfo } from '../types/index';

/** 国家免疫规划疫苗清单（0-12个月） */
export const VACCINE_LIST: VaccineItem[] = [
  // ===== 出生时（0月龄）=====
  {
    id: 'hepb_1',
    name: '乙肝疫苗',
    fullName: '重组乙型肝炎疫苗（第1剂）',
    preventDisease: '乙型病毒性肝炎',
    recommendedMonth: 0,
    doseNumber: 1,
    totalDoses: 3,
    isFree: true,
    description: '出生后24小时内尽早接种，同时注射乙肝免疫球蛋白（如母亲为HBsAg阳性）'
  },
  {
    id: 'bcg_1',
    name: '卡介苗',
    fullName: '卡介苗（BCG）',
    preventDisease: '结核病（粟粒性结核、结核性脑膜炎）',
    recommendedMonth: 0,
    doseNumber: 1,
    totalDoses: 1,
    isFree: true,
    description: '出生时接种，早产儿或低体重儿需待体重达到2500g后接种'
  },

  // ===== 1月龄 =====
  {
    id: 'hepb_2',
    name: '乙肝疫苗',
    fullName: '重组乙型肝炎疫苗（第2剂）',
    preventDisease: '乙型病毒性肝炎',
    recommendedMonth: 1,
    doseNumber: 2,
    totalDoses: 3,
    isFree: true,
    description: '与第1剂间隔至少28天'
  },

  // ===== 2月龄 =====
  {
    id: 'polio_1',
    name: '脊灰疫苗',
    fullName: '脊髓灰质炎灭活疫苗（IPV）（第1剂）',
    preventDisease: '脊髓灰质炎（小儿麻痹症）',
    recommendedMonth: 2,
    doseNumber: 1,
    totalDoses: 4,
    isFree: true,
    description: '第1、2剂使用IPV（灭活疫苗），第3、4剂使用bOPV（口服减毒活疫苗）'
  },

  // ===== 3月龄 =====
  {
    id: 'polio_2',
    name: '脊灰疫苗',
    fullName: '脊髓灰质炎灭活疫苗（IPV）（第2剂）',
    preventDisease: '脊髓灰质炎（小儿麻痹症）',
    recommendedMonth: 3,
    doseNumber: 2,
    totalDoses: 4,
    isFree: true,
    description: '与第1剂间隔至少28天'
  },
  {
    id: 'dpt_1',
    name: '百白破疫苗',
    fullName: '吸附无细胞百白破联合疫苗（第1剂）',
    preventDisease: '百日咳、白喉、破伤风',
    recommendedMonth: 3,
    doseNumber: 1,
    totalDoses: 4,
    isFree: true,
    description: '基础免疫共3剂，每剂间隔至少28天'
  },

  // ===== 4月龄 =====
  {
    id: 'polio_3',
    name: '脊灰疫苗',
    fullName: '脊髓灰质炎减毒活疫苗（bOPV）（第3剂）',
    preventDisease: '脊髓灰质炎（小儿麻痹症）',
    recommendedMonth: 4,
    doseNumber: 3,
    totalDoses: 4,
    isFree: true,
    description: '口服减毒活疫苗，与第2剂间隔至少28天'
  },
  {
    id: 'dpt_2',
    name: '百白破疫苗',
    fullName: '吸附无细胞百白破联合疫苗（第2剂）',
    preventDisease: '百日咳、白喉、破伤风',
    recommendedMonth: 4,
    doseNumber: 2,
    totalDoses: 4,
    isFree: true,
    description: '与第1剂间隔至少28天'
  },

  // ===== 5月龄 =====
  {
    id: 'dpt_3',
    name: '百白破疫苗',
    fullName: '吸附无细胞百白破联合疫苗（第3剂）',
    preventDisease: '百日咳、白喉、破伤风',
    recommendedMonth: 5,
    doseNumber: 3,
    totalDoses: 4,
    isFree: true,
    description: '基础免疫第3剂，与第2剂间隔至少28天'
  },

  // ===== 6月龄 =====
  {
    id: 'hepb_3',
    name: '乙肝疫苗',
    fullName: '重组乙型肝炎疫苗（第3剂）',
    preventDisease: '乙型病毒性肝炎',
    recommendedMonth: 6,
    doseNumber: 3,
    totalDoses: 3,
    isFree: true,
    description: '与第1剂间隔至少16周，完成乙肝疫苗全程免疫'
  },
  {
    id: 'mena_1',
    name: 'A群流脑疫苗',
    fullName: 'A群脑膜炎球菌多糖疫苗（第1剂）',
    preventDisease: 'A群脑膜炎球菌引起的流行性脑脊髓膜炎',
    recommendedMonth: 6,
    doseNumber: 1,
    totalDoses: 2,
    isFree: true,
    description: '基础免疫2剂，每剂间隔3个月'
  },

  // ===== 8月龄 =====
  {
    id: 'measles_1',
    name: '麻腮风疫苗',
    fullName: '麻疹-腮腺炎-风疹联合减毒活疫苗（第1剂）',
    preventDisease: '麻疹、流行性腮腺炎、风疹',
    recommendedMonth: 8,
    doseNumber: 1,
    totalDoses: 2,
    isFree: true,
    description: '第1剂为基础免疫，第2剂在18月龄加强接种'
  },
  {
    id: 'jee_1',
    name: '乙脑减毒疫苗',
    fullName: '乙型脑炎减毒活疫苗（第1剂）',
    preventDisease: '流行性乙型脑炎',
    recommendedMonth: 8,
    doseNumber: 1,
    totalDoses: 2,
    isFree: true,
    description: '第1剂在8月龄接种，第2剂在2周岁接种'
  },

  // ===== 9月龄 =====
  {
    id: 'mena_2',
    name: 'A群流脑疫苗',
    fullName: 'A群脑膜炎球菌多糖疫苗（第2剂）',
    preventDisease: 'A群脑膜炎球菌引起的流行性脑脊髓膜炎',
    recommendedMonth: 9,
    doseNumber: 2,
    totalDoses: 2,
    isFree: true,
    description: '与第1剂间隔至少3个月，完成A群流脑基础免疫'
  }
];

/**
 * 按月龄分组的疫苗清单
 * 用于页面展示时按时间线分组
 */
export const VACCINE_SCHEDULE: Record<number, string[]> = {
  0: ['hepb_1', 'bcg_1'],
  1: ['hepb_2'],
  2: ['polio_1'],
  3: ['polio_2', 'dpt_1'],
  4: ['polio_3', 'dpt_2'],
  5: ['dpt_3'],
  6: ['hepb_3', 'mena_1'],
  8: ['measles_1', 'jee_1'],
  9: ['mena_2']
};

/** 月龄标签映射 */
export const MONTH_LABELS: Record<number, string> = {
  0: '出生时',
  1: '1月龄',
  2: '2月龄',
  3: '3月龄',
  4: '4月龄',
  5: '5月龄',
  6: '6月龄',
  8: '8月龄',
  9: '9月龄'
};

/**
 * 根据 ID 快速查找疫苗信息
 */
export function getVaccineById(id: string): VaccineItem | undefined {
  return VACCINE_LIST.find(v => v.id === id);
}

/**
 * 获取指定月龄应接种的疫苗列表
 */
export function getVaccinesByMonth(month: number): VaccineItem[] {
  const ids = VACCINE_SCHEDULE[month] || [];
  return ids.map(id => getVaccineById(id)).filter(Boolean) as VaccineItem[];
}

/**
 * 获取所有需要接种的月龄列表（排序后）
 */
export function getScheduleMonths(): number[] {
  return Object.keys(VACCINE_SCHEDULE).map(Number).sort((a, b) => a - b);
}
