/**
 * 发育里程碑标准数据（0-12个月）
 *
 * 数据参考：
 * - 世界卫生组织（WHO）婴幼儿发育里程碑
 * - 中国儿科学会儿童保健指南
 * - 美国儿科学会（AAP）发育里程碑参考
 *
 * 注意：每个宝宝的发育节奏不同，此数据仅供参考，不作为诊断依据。
 */

import type { MilestoneItem, MilestoneCategory, MilestoneCategoryInfo } from '../types/index';

/** 里程碑类别信息 */
export const MILESTONE_CATEGORIES: MilestoneCategoryInfo[] = [
  {
    key: 'gross_motor',
    label: '大运动',
    icon: 'run',
    color: '#FF6B6B',
  },
  {
    key: 'fine_motor',
    label: '精细运动',
    icon: 'gesture-applause',
    color: '#4ECDC4',
  },
  {
    key: 'language',
    label: '语言',
    icon: 'chat',
    color: '#45B7D1',
  },
  {
    key: 'social',
    label: '社交/情感',
    icon: 'heart',
    color: '#F7B731',
  },
  {
    key: 'cognitive',
    label: '认知',
    icon: 'browse',
    color: '#A55EEA',
  },
];

/** 发育里程碑完整清单（0-12个月） */
export const MILESTONE_LIST: MilestoneItem[] = [
  // ===== 0-1 月龄 =====
  {
    id: 'gm_0_head_turn',
    name: '俯卧时能转头',
    category: 'gross_motor',
    expectedMonthStart: 0,
    expectedMonthEnd: 1,
    description: '俯卧时宝宝能将头转向一侧',
    concernTip: '如果宝宝始终无法移动头部，建议咨询医生',
  },
  {
    id: 'gm_0_limb_flex',
    name: '四肢屈曲姿势',
    category: 'gross_motor',
    expectedMonthStart: 0,
    expectedMonthEnd: 1,
    description: '仰卧时手脚自然弯曲，呈现蜷缩姿势',
  },
  {
    id: 'fm_0_grasp_reflex',
    name: '握持反射',
    category: 'fine_motor',
    expectedMonthStart: 0,
    expectedMonthEnd: 1,
    description: '手指触碰宝宝手心时会自动握紧',
  },
  {
    id: 'la_0_cry',
    name: '用哭声表达需求',
    category: 'language',
    expectedMonthStart: 0,
    expectedMonthEnd: 1,
    description: '饥饿、不适时用哭声来表达',
  },
  {
    id: 'so_0_face_prefer',
    name: '偏好注视人脸',
    category: 'social',
    expectedMonthStart: 0,
    expectedMonthEnd: 1,
    description: '对人脸图案表现出明显的视觉偏好',
  },

  // ===== 1-2 月龄 =====
  {
    id: 'gm_1_head_lift',
    name: '俯卧时短暂抬头',
    category: 'gross_motor',
    expectedMonthStart: 1,
    expectedMonthEnd: 2,
    description: '趴着时能短暂地抬起头部，持续数秒',
    concernTip: '2月龄仍完全无法抬头的趋势需关注',
  },
  {
    id: 'fm_1_hand_open',
    name: '手开始打开',
    category: 'fine_motor',
    expectedMonthStart: 1,
    expectedMonthEnd: 2,
    description: '拳头开始放松，偶尔张开手掌',
  },
  {
    id: 'la_1_coo',
    name: '开始发出"啊""哦"声',
    category: 'language',
    expectedMonthStart: 1,
    expectedMonthEnd: 3,
    description: '发出元音咕咕声，开始简单的声音交流',
    concernTip: '3月龄仍无任何发声需关注',
  },
  {
    id: 'so_1_social_smile',
    name: '出现社交性微笑',
    category: 'social',
    expectedMonthStart: 1,
    expectedMonthEnd: 3,
    description: '看到熟悉的人脸时会回以微笑',
    concernTip: '3月龄仍无社交性微笑需咨询医生',
  },
  {
    id: 'co_1_follow_object',
    name: '目光追随移动物体',
    category: 'cognitive',
    expectedMonthStart: 1,
    expectedMonthEnd: 3,
    description: '眼睛能跟随缓慢移动的物体或面孔转动',
    concernTip: '2月龄仍无法跟随移动物体需关注视力',
  },

  // ===== 2-3 月龄 =====
  {
    id: 'gm_2_head_45',
    name: '俯卧时抬头45度',
    category: 'gross_motor',
    expectedMonthStart: 2,
    expectedMonthEnd: 4,
    description: '趴着时能将头抬至45度角并短暂保持',
  },
  {
    id: 'fm_2_hand_clasp',
    name: '双手在胸前合拢',
    category: 'fine_motor',
    expectedMonthStart: 2,
    expectedMonthEnd: 4,
    description: '开始发现并玩弄自己的双手，手指互相触碰',
  },
  {
    id: 'la_2_varied_sounds',
    name: '发声更加丰富多变',
    category: 'language',
    expectedMonthStart: 2,
    expectedMonthEnd: 4,
    description: '发出更多元音和辅音组合，音调有变化',
  },
  {
    id: 'so_2_eye_contact',
    name: '与人进行眼神交流',
    category: 'social',
    expectedMonthStart: 2,
    expectedMonthEnd: 4,
    description: '能与照护者保持较长时间的眼神接触',
  },
  {
    id: 'co_2_recognize_parent',
    name: '认识主要照护者',
    category: 'cognitive',
    expectedMonthStart: 2,
    expectedMonthEnd: 4,
    description: '对父母的面孔和声音表现出明显的识别反应',
  },

  // ===== 3-4 月龄 =====
  {
    id: 'gm_3_head_steady',
    name: '竖抱时头部稳定',
    category: 'gross_motor',
    expectedMonthStart: 3,
    expectedMonthEnd: 5,
    description: '竖直抱起时头部能保持稳定不晃',
    concernTip: '4月龄竖抱时头仍严重后仰需咨询医生',
  },
  {
    id: 'gm_3_push_up',
    name: '俯卧时前臂支撑抬胸',
    category: 'gross_motor',
    expectedMonthStart: 3,
    expectedMonthEnd: 5,
    description: '趴着时用前臂撑起上半身，头抬至90度',
  },
  {
    id: 'fm_3_reach',
    name: '主动伸手够物',
    category: 'fine_motor',
    expectedMonthStart: 3,
    expectedMonthEnd: 5,
    description: '看到感兴趣的物品时会主动伸手去够',
  },
  {
    id: 'la_3_laugh',
    name: '出声笑',
    category: 'language',
    expectedMonthStart: 3,
    expectedMonthEnd: 5,
    description: '开始发出清晰的咯咯笑声',
    concernTip: '5月龄仍未出声笑需关注',
  },
  {
    id: 'co_3_cause_effect',
    name: '初步因果认知',
    category: 'cognitive',
    expectedMonthStart: 3,
    expectedMonthEnd: 5,
    description: '发现自己的动作能产生结果（如踢动悬挂玩具会响）',
  },

  // ===== 4-5 月龄 =====
  {
    id: 'gm_4_roll_tummy_back',
    name: '翻身（俯卧到仰卧）',
    category: 'gross_motor',
    expectedMonthStart: 4,
    expectedMonthEnd: 6,
    description: '能从趴着的姿势翻成仰面朝上',
    concernTip: '6月龄仍无法完成任何方向翻身需关注',
  },
  {
    id: 'fm_4_grasp_voluntary',
    name: '主动抓握物品',
    category: 'fine_motor',
    expectedMonthStart: 4,
    expectedMonthEnd: 6,
    description: '能有意识地用手抓住物品并短暂持握',
  },
  {
    id: 'fm_4_mouth_objects',
    name: '将物品放入口中探索',
    category: 'fine_motor',
    expectedMonthStart: 4,
    expectedMonthEnd: 6,
    description: '用嘴巴来探索和感知物品的质地和形状',
  },
  {
    id: 'la_4_babble',
    name: '开始咿呀学语',
    category: 'language',
    expectedMonthStart: 4,
    expectedMonthEnd: 7,
    description: '发出辅音+元音的组合，如"ba""da""ma"等音节',
    concernTip: '7月龄仍无咿呀学语需咨询医生',
  },
  {
    id: 'so_4_mirror',
    name: '对镜中的自己感兴趣',
    category: 'social',
    expectedMonthStart: 4,
    expectedMonthEnd: 6,
    description: '看到镜子中的自己会微笑、注视或伸手触摸',
  },

  // ===== 5-6 月龄 =====
  {
    id: 'gm_5_roll_back_tummy',
    name: '翻身（仰卧到俯卧）',
    category: 'gross_motor',
    expectedMonthStart: 5,
    expectedMonthEnd: 7,
    description: '能从仰面翻成趴着的姿势，实现双向翻身',
  },
  {
    id: 'gm_5_sit_support',
    name: '扶坐稳定',
    category: 'gross_motor',
    expectedMonthStart: 5,
    expectedMonthEnd: 7,
    description: '在大人扶持或靠垫支撑下能稳定坐着',
  },
  {
    id: 'fm_5_transfer',
    name: '双手传递物品',
    category: 'fine_motor',
    expectedMonthStart: 5,
    expectedMonthEnd: 7,
    description: '能将手中的物品从一只手换到另一只手',
  },
  {
    id: 'la_5_respond_name',
    name: '对自己的名字有反应',
    category: 'language',
    expectedMonthStart: 5,
    expectedMonthEnd: 8,
    description: '听到叫自己名字时会转头或注视',
    concernTip: '9月龄仍对名字无反应需检查听力',
  },
  {
    id: 'co_5_object_permanence',
    name: '开始理解物体恒存',
    category: 'cognitive',
    expectedMonthStart: 5,
    expectedMonthEnd: 8,
    description: '开始寻找被遮住的物品，理解物品不因看不见而消失',
  },

  // ===== 6-7 月龄 =====
  {
    id: 'gm_6_sit_independent',
    name: '独坐',
    category: 'gross_motor',
    expectedMonthStart: 6,
    expectedMonthEnd: 9,
    description: '不需要支撑就能稳定地坐着，双手可以自由玩耍',
    concernTip: '9月龄仍无法独坐需咨询医生评估运动发育',
  },
  {
    id: 'fm_6_rake_grasp',
    name: '耙状抓握',
    category: 'fine_motor',
    expectedMonthStart: 6,
    expectedMonthEnd: 8,
    description: '用整只手掌和手指一起抓取小物品',
  },
  {
    id: 'la_6_syllable_repeat',
    name: '重复音节',
    category: 'language',
    expectedMonthStart: 6,
    expectedMonthEnd: 9,
    description: '发出重复音节如"bababa""mamama""dadada"',
  },
  {
    id: 'so_6_stranger_anxiety',
    name: '开始认生',
    category: 'social',
    expectedMonthStart: 6,
    expectedMonthEnd: 10,
    description: '对陌生人表现出警惕或不安，更依赖主要照护者',
  },
  {
    id: 'co_6_explore_objects',
    name: '探索物品功能',
    category: 'cognitive',
    expectedMonthStart: 6,
    expectedMonthEnd: 9,
    description: '通过摇晃、敲击、扔掷来探索物品会产生什么效果',
  },

  // ===== 7-8 月龄 =====
  {
    id: 'gm_7_crawl_ready',
    name: '爬行准备姿势',
    category: 'gross_motor',
    expectedMonthStart: 7,
    expectedMonthEnd: 10,
    description: '能在地上以手膝或手腹方式前进，或出现匍匐爬行',
  },
  {
    id: 'fm_7_pincer_early',
    name: '初步钳形抓握',
    category: 'fine_motor',
    expectedMonthStart: 7,
    expectedMonthEnd: 10,
    description: '开始用拇指和其他手指配合来抓取较小的物品',
  },
  {
    id: 'la_7_gesture',
    name: '使用手势交流',
    category: 'language',
    expectedMonthStart: 7,
    expectedMonthEnd: 10,
    description: '开始用手势表达意愿，如伸手要抱、摇头、挥手再见',
  },
  {
    id: 'so_7_peekaboo',
    name: '喜欢躲猫猫游戏',
    category: 'social',
    expectedMonthStart: 7,
    expectedMonthEnd: 10,
    description: '对躲猫猫游戏表现出兴奋和期待，能主动参与',
  },
  {
    id: 'co_7_find_hidden',
    name: '寻找隐藏的物品',
    category: 'cognitive',
    expectedMonthStart: 7,
    expectedMonthEnd: 10,
    description: '能掀开布巾找到被藏起来的玩具',
  },

  // ===== 8-9 月龄 =====
  {
    id: 'gm_8_crawl',
    name: '手膝爬行',
    category: 'gross_motor',
    expectedMonthStart: 8,
    expectedMonthEnd: 11,
    description: '用手和膝盖交替前进，能灵活爬行',
    concernTip: '10月龄仍无法以任何方式移动身体需咨询医生',
  },
  {
    id: 'gm_8_pull_stand',
    name: '扶物站立',
    category: 'gross_motor',
    expectedMonthStart: 8,
    expectedMonthEnd: 11,
    description: '能扶着家具或大人的手从坐位拉起站立',
  },
  {
    id: 'fm_8_pincer',
    name: '精确钳形抓握',
    category: 'fine_motor',
    expectedMonthStart: 8,
    expectedMonthEnd: 11,
    description: '用拇指和食指精确地捏取小物品（如小馒头粒）',
    concernTip: '12月龄仍无法用手指捏取小物品需关注',
  },
  {
    id: 'la_8_understand_no',
    name: '理解"不"的含义',
    category: 'language',
    expectedMonthStart: 8,
    expectedMonthEnd: 11,
    description: '听到"不可以""不要"时能暂停动作或看向说话者',
  },
  {
    id: 'co_8_imitate',
    name: '模仿简单动作',
    category: 'cognitive',
    expectedMonthStart: 8,
    expectedMonthEnd: 11,
    description: '模仿大人的简单动作，如拍手、挥手、敲打',
  },

  // ===== 9-10 月龄 =====
  {
    id: 'gm_9_cruise',
    name: '扶走（巡航）',
    category: 'gross_motor',
    expectedMonthStart: 9,
    expectedMonthEnd: 12,
    description: '扶着家具边缘横向移步行走',
  },
  {
    id: 'fm_9_point',
    name: '用食指指向',
    category: 'fine_motor',
    expectedMonthStart: 9,
    expectedMonthEnd: 12,
    description: '伸出食指指向感兴趣的物品或方向',
    concernTip: '12月龄仍不会用手指指向物品需关注',
  },
  {
    id: 'la_9_mama_dada',
    name: '有意识地叫"妈妈""爸爸"',
    category: 'language',
    expectedMonthStart: 9,
    expectedMonthEnd: 12,
    description: '开始有意识地用"妈妈""爸爸"指代特定的人',
    concernTip: '12月龄仍无任何有意义的称呼需咨询医生',
  },
  {
    id: 'so_9_separation_anxiety',
    name: '分离焦虑',
    category: 'social',
    expectedMonthStart: 9,
    expectedMonthEnd: 12,
    description: '与主要照护者分离时表现出明显的不安和哭闹',
  },
  {
    id: 'co_9_simple_instruction',
    name: '理解简单指令',
    category: 'cognitive',
    expectedMonthStart: 9,
    expectedMonthEnd: 12,
    description: '能理解并执行简单的指令，如"给我""过来"',
  },

  // ===== 10-12 月龄 =====
  {
    id: 'gm_10_stand_alone',
    name: '独站',
    category: 'gross_motor',
    expectedMonthStart: 10,
    expectedMonthEnd: 12,
    description: '不需要扶持能独自站立数秒',
  },
  {
    id: 'gm_11_first_steps',
    name: '迈出第一步',
    category: 'gross_motor',
    expectedMonthStart: 11,
    expectedMonthEnd: 15,
    description: '独自迈出一到几步，开始学走路',
    concernTip: '15月龄仍无法独立行走需进行运动发育评估',
  },
  {
    id: 'fm_10_release',
    name: '主动松手放下物品',
    category: 'fine_motor',
    expectedMonthStart: 10,
    expectedMonthEnd: 12,
    description: '能有意识地打开手指将物品放入容器中',
  },
  {
    id: 'la_10_first_words',
    name: '说出第一个词',
    category: 'language',
    expectedMonthStart: 10,
    expectedMonthEnd: 14,
    description: '除了"妈妈""爸爸"外，能说出1-2个有意义的词',
  },
  {
    id: 'so_10_give_objects',
    name: '与人分享物品',
    category: 'social',
    expectedMonthStart: 10,
    expectedMonthEnd: 12,
    description: '主动将手中的玩具递给大人，表达分享意愿',
  },
  {
    id: 'co_10_container',
    name: '容器游戏',
    category: 'cognitive',
    expectedMonthStart: 10,
    expectedMonthEnd: 12,
    description: '喜欢把东西放进容器再倒出来，反复进行',
  },
];

/**
 * 根据 ID 快速查找里程碑信息
 */
export function getMilestoneById(id: string): MilestoneItem | undefined {
  return MILESTONE_LIST.find((m) => m.id === id);
}

/**
 * 获取指定月龄范围内应关注的里程碑
 * @param ageInMonths 宝宝当前月龄
 */
export function getMilestonesByAge(ageInMonths: number): MilestoneItem[] {
  return MILESTONE_LIST.filter(
    (m) => ageInMonths >= m.expectedMonthStart && ageInMonths <= m.expectedMonthEnd,
  );
}

/**
 * 按类别获取里程碑列表
 */
export function getMilestonesByCategory(category: MilestoneCategory): MilestoneItem[] {
  return MILESTONE_LIST.filter((m) => m.category === category);
}

/**
 * 获取里程碑类别的显示信息
 */
export function getCategoryInfo(category: MilestoneCategory): MilestoneCategoryInfo | undefined {
  return MILESTONE_CATEGORIES.find((c) => c.key === category);
}

/**
 * 获取所有关注月龄区间（去重排序后的起始月龄列表）
 */
export function getMilestoneMonthGroups(): number[] {
  const months = new Set<number>();
  MILESTONE_LIST.forEach((m) => months.add(m.expectedMonthStart));
  return Array.from(months).sort((a, b) => a - b);
}
