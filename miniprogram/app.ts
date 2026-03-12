// Baby Care Tracker - 新生儿养护追踪小程序
// 应用入口文件

interface IAppOption {
  globalData: {
    currentBabyId: string | null;
    storageVersion: number;
    /** 跨 Tab 页导航意图：从首页快捷入口跳转时携带的目标动作 */
    navIntent?: {
      target: string;      // 目标页面标识，如 'growth-center'
      action?: string;     // 具体动作，如 'addGrowth' | 'milestone'
    } | null;
  };
}

App<IAppOption>({
  globalData: {
    currentBabyId: null,
    storageVersion: 1,
  },

  onLaunch() {
    // 初始化存储版本检查
    this.checkStorageVersion();
    // 加载当前宝宝信息
    this.loadCurrentBaby();
  },

  /**
   * 检查本地存储数据版本，必要时执行数据迁移
   */
  checkStorageVersion() {
    try {
      const version = wx.getStorageSync('storage_version');
      if (!version) {
        wx.setStorageSync('storage_version', this.globalData.storageVersion);
      } else if (version < this.globalData.storageVersion) {
        // 预留：后续版本升级时在此执行数据迁移逻辑
        this.migrateData(version, this.globalData.storageVersion);
        wx.setStorageSync('storage_version', this.globalData.storageVersion);
      }
    } catch (e) {
      console.error('存储版本检查失败:', e);
    }
  },

  /**
   * 数据迁移（预留接口）
   */
  migrateData(_fromVersion: number, _toVersion: number) {
    // 预留：根据版本差异执行对应的数据结构迁移
    console.log(`数据迁移: v${_fromVersion} -> v${_toVersion}`);
  },

  /**
   * 加载当前选中的宝宝信息
   */
  loadCurrentBaby() {
    try {
      const currentBabyId = wx.getStorageSync('current_baby_id');
      if (currentBabyId) {
        this.globalData.currentBabyId = currentBabyId;
      }
    } catch (e) {
      console.error('加载当前宝宝信息失败:', e);
    }
  },
});
