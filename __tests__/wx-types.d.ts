/**
 * 微信小程序 API 类型声明（测试环境用）
 * 在测试中，wx 对象由 __tests__/setup.ts 中的 mock 提供
 * 此声明文件仅让 TypeScript 编译器不报错
 */

declare const wx: {
  getStorageSync: (key: string) => any;
  setStorageSync: (key: string, value: any) => void;
  removeStorageSync: (key: string) => void;
  getStorageInfoSync: () => { keys: string[]; currentSize: number; limitSize: number };
  showToast: (options: { title: string; icon?: string; duration?: number }) => void;
  showModal: (options: any) => void;
  showLoading: (options: any) => void;
  hideLoading: () => void;
  navigateTo: (options: any) => void;
  navigateBack: (options?: any) => void;
  switchTab: (options: any) => void;
  getSystemInfoSync: () => any;
  [key: string]: any;
};

declare function getApp<T = any>(): T;
declare function getCurrentPages(): any[];

declare namespace WechatMiniprogram {
  interface GetStorageInfoSyncOption {
    keys: string[];
    currentSize: number;
    limitSize: number;
  }
}
