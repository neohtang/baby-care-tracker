/**
 * ThemeService - 主题管理服务
 * 支持三种模式：auto（跟随系统）/ light（浅色）/ dark（深色）
 *
 * 实现原理：
 * - 跟随系统：依赖 app.json darkmode:true + @media(prefers-color-scheme:dark) 自动生效
 * - 手动深色/浅色：通过 page-meta 组件设置 page-style 注入 CSS 变量覆盖
 * - ThemeService 提供当前主题状态和 page-style 字符串
 */

export type ThemeMode = 'auto' | 'light' | 'dark';

const STORAGE_KEY = 'app_theme_mode';

/** 深色模式下注入的 CSS 变量（与 app.wxss @media dark 保持一致） */
const DARK_PAGE_STYLE = [
  '--td-brand-color:#D4A97A',
  '--td-brand-color-light:#C8956C',
  '--td-bg-color-page:#1A1614',
  '--td-bg-color-container:#2A2420',
  '--td-bg-color-secondarycontainer:#362E28',
  '--td-text-color-primary:#EDE5DC',
  '--td-text-color-secondary:#A89A8C',
  '--td-text-color-placeholder:#78695C',
  '--module-feeding:#D4A97A',
  '--module-feeding-bg:#2D2418',
  '--module-sleep:#8EC5E8',
  '--module-sleep-bg:#1A252D',
  '--module-diaper:#8ED4B5',
  '--module-diaper-bg:#1E2D26',
  '--module-health:#F5C46A',
  '--module-health-bg:#2D2618',
  '--shadow-card:0 4rpx 20rpx rgba(0,0,0,0.25)',
  'background-color:#1A1614',
  'color:#EDE5DC',
].join(';');

/** 浅色模式下注入的 CSS 变量（强制浅色，覆盖系统深色） */
const LIGHT_PAGE_STYLE = [
  '--td-brand-color:#C8956C',
  '--td-bg-color-page:#FDF8F3',
  '--td-bg-color-container:#FFFFFF',
  '--td-bg-color-secondarycontainer:#F5EDE4',
  '--td-text-color-primary:#3D2E22',
  '--td-text-color-secondary:#8B7B6B',
  '--td-text-color-placeholder:#B5A89C',
  'background-color:#FDF8F3',
  'color:#3D2E22',
].join(';');

class ThemeService {
  private _mode: ThemeMode = 'auto';
  private _isDark: boolean = false;

  /**
   * 初始化主题服务，读取用户存储的偏好
   */
  init(): void {
    try {
      const stored = wx.getStorageSync(STORAGE_KEY) as ThemeMode;
      if (stored && ['auto', 'light', 'dark'].includes(stored)) {
        this._mode = stored;
      }
    } catch {
      // 使用默认值
    }

    this._updateDarkStatus();
    this._listenSystemTheme();
  }

  /** 获取当前主题模式 */
  getMode(): ThemeMode {
    return this._mode;
  }

  /** 当前是否为深色主题（考虑 auto 模式下的系统设置） */
  isDark(): boolean {
    return this._isDark;
  }

  /** 设置主题模式 */
  setMode(mode: ThemeMode): void {
    this._mode = mode;
    try {
      wx.setStorageSync(STORAGE_KEY, mode);
    } catch {
      // 静默失败
    }
    this._updateDarkStatus();
  }

  /**
   * 获取 page-style 字符串（用于 page-meta 组件）
   * - auto 模式：返回空字符串（交给 @media 查询自动处理）
   * - dark 模式：返回深色 CSS 变量
   * - light 模式：返回浅色 CSS 变量（强制覆盖系统深色）
   */
  getPageStyle(): string {
    switch (this._mode) {
      case 'dark':
        return DARK_PAGE_STYLE;
      case 'light':
        return LIGHT_PAGE_STYLE;
      case 'auto':
      default:
        return '';
    }
  }

  /** 获取 Canvas 图表颜色方案 */
  getChartColors(): {
    grid: string;
    axis: string;
    axisLabel: string;
    valueLabelColor: string;
    todayHighlight: string;
    background: string;
  } {
    if (this._isDark) {
      return {
        grid: '#3D342C',
        axis: '#4A4038',
        axisLabel: '#A89A8C',
        valueLabelColor: '#C8B8A8',
        todayHighlight: 'rgba(212, 169, 122, 0.12)',
        background: '#2A2420',
      };
    }
    return {
      grid: '#F3F4F6',
      axis: '#E5E7EB',
      axisLabel: '#8B7B6B',
      valueLabelColor: '#6B5E52',
      todayHighlight: 'rgba(200, 149, 108, 0.08)',
      background: '#FFFFFF',
    };
  }

  /** 获取主题模式的显示文本 */
  getModeText(): string {
    const map: Record<ThemeMode, string> = {
      auto: '跟随系统',
      light: '浅色模式',
      dark: '深色模式',
    };
    return map[this._mode];
  }

  /** 获取所有可选主题列表 */
  getModeOptions(): { label: string; value: ThemeMode }[] {
    return [
      { label: '跟随系统', value: 'auto' },
      { label: '浅色模式', value: 'light' },
      { label: '深色模式', value: 'dark' },
    ];
  }

  /** 更新当前是否实际处于深色 */
  private _updateDarkStatus(): void {
    if (this._mode === 'dark') {
      this._isDark = true;
    } else if (this._mode === 'light') {
      this._isDark = false;
    } else {
      try {
        const info = wx.getSystemInfoSync();
        this._isDark = info.theme === 'dark';
      } catch {
        this._isDark = false;
      }
    }
  }

  /** 监听系统主题变化 */
  private _listenSystemTheme(): void {
    try {
      wx.onThemeChange((result: { theme: 'dark' | 'light' }) => {
        if (this._mode === 'auto') {
          this._isDark = result.theme === 'dark';
        }
      });
    } catch {
      // 低版本基础库不支持
    }
  }
}

export const themeService = new ThemeService();
export default themeService;
