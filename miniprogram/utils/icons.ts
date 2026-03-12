/**
 * 图标路径映射工具
 * 将原来的 emoji 统一替换为 SVG 图标路径
 */

const ICON_BASE = '/assets/icons';

/** 图标名称 → SVG 文件路径映射 */
export const ICONS = {
  // 喂养相关
  bottle: `${ICON_BASE}/bottle.svg`,
  breastfeed: `${ICON_BASE}/breastfeed.svg`,
  solidFood: `${ICON_BASE}/solid-food.svg`,

  // 睡眠相关
  sleep: `${ICON_BASE}/sleep.svg`,
  sun: `${ICON_BASE}/sun.svg`,
  moon: `${ICON_BASE}/moon.svg`,
  bed: `${ICON_BASE}/bed.svg`,
  alarm: `${ICON_BASE}/alarm.svg`,
  timer: `${ICON_BASE}/timer.svg`,

  // 排便相关
  baby: `${ICON_BASE}/baby.svg`,
  waterdrop: `${ICON_BASE}/waterdrop.svg`,
  poop: `${ICON_BASE}/poop.svg`,
  diaperPin: `${ICON_BASE}/diaper-pin.svg`,

  // 健康相关
  thermometer: `${ICON_BASE}/thermometer.svg`,
  medicine: `${ICON_BASE}/medicine.svg`,
  bandage: `${ICON_BASE}/bandage.svg`,
  stethoscope: `${ICON_BASE}/stethoscope.svg`,
  fever: `${ICON_BASE}/fever.svg`,

  // 生长相关
  scale: `${ICON_BASE}/scale.svg`,
  ruler: `${ICON_BASE}/ruler.svg`,
  brain: `${ICON_BASE}/brain.svg`,
  chart: `${ICON_BASE}/chart.svg`,

  // 里程碑相关
  star: `${ICON_BASE}/star.svg`,
  starOutline: `${ICON_BASE}/star-outline.svg`,
  starGlow: `${ICON_BASE}/star-glow.svg`,
  starFilled: `${ICON_BASE}/star-filled.svg`,

  // 疫苗
  vaccine: `${ICON_BASE}/vaccine.svg`,

  // 通用
  warning: `${ICON_BASE}/warning.svg`,
  note: `${ICON_BASE}/note.svg`,

  // 设置页
  export: `${ICON_BASE}/export.svg`,
  import: `${ICON_BASE}/import.svg`,
  trash: `${ICON_BASE}/trash.svg`,
  phone: `${ICON_BASE}/phone.svg`,
} as const;

export type IconName = keyof typeof ICONS;

/** 根据图标名称获取路径 */
export function getIconPath(name: IconName): string {
  return ICONS[name];
}

export default ICONS;
