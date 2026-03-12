/**
 * Jest 全局 Setup 文件
 * 模拟微信小程序 API (wx.*) 和全局函数 (getApp / getCurrentPages)
 */

// 基于内存 Map 的 Storage 模拟
const storageMap = new Map<string, any>();

// 定义 global.wx 对象
(global as any).wx = {
  getStorageSync: jest.fn((key: string) => {
    return storageMap.get(key) ?? '';
  }),
  setStorageSync: jest.fn((key: string, value: any) => {
    storageMap.set(key, value);
  }),
  removeStorageSync: jest.fn((key: string) => {
    storageMap.delete(key);
  }),
  getStorageInfoSync: jest.fn(() => ({
    keys: [...storageMap.keys()],
    currentSize: 0,
    limitSize: 10240,
  })),
  showToast: jest.fn(),
  showModal: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  navigateTo: jest.fn(),
  navigateBack: jest.fn(),
  switchTab: jest.fn(),
  getSystemInfoSync: jest.fn(() => ({
    platform: 'devtools',
    model: 'iPhone 12',
    system: 'iOS 15.0',
  })),
};

// 定义 global.getApp — 使用共享对象以便 setCurrentBaby 能修改并被后续读取
const appGlobalData = { currentBabyId: null as string | null };
const appInstance = { globalData: appGlobalData };
(global as any).getApp = jest.fn(() => appInstance);

// 定义 global.getCurrentPages
(global as any).getCurrentPages = jest.fn(() => []);

/**
 * 清空模拟存储和所有 Mock 调用记录
 * 在每个测试用例的 beforeEach 中调用
 */
export function clearMockStorage(): void {
  storageMap.clear();
  appGlobalData.currentBabyId = null;
  jest.clearAllMocks();
}

/**
 * 获取当前模拟存储中的所有数据（调试用）
 */
export function getMockStorageData(): Map<string, any> {
  return new Map(storageMap);
}

/**
 * 直接向模拟存储中写入数据（用于测试前置数据准备）
 */
export function setMockStorageData(key: string, value: any): void {
  storageMap.set(key, value);
}
