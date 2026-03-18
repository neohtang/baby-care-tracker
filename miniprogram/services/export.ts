/**
 * DataExportService - 数据导出/恢复服务
 * 将所有记录导出为 JSON 文件，支持数据备份与恢复
 */

import { getAllStorageInstances, getStorageInfo } from './storage';
import eventBus, { Events } from '../utils/event-bus';

/** 备份数据结构 */
interface BackupData {
  /** 备份版本 */
  version: number;
  /** 备份时间 */
  createdAt: string;
  /** 应用名称标识 */
  appName: string;
  /** 各模块数据 */
  modules: {
    baby: any;
    feeding: any;
    sleep: any;
    diaper: any;
    health: any;
    growth: any;
    vaccine: any;
    milestone: any;
  };
}

const BACKUP_VERSION = 1;
const APP_NAME = 'baby-care-tracker';

class DataExportService {
  /**
   * 生成备份数据对象
   */
  generateBackup(): BackupData {
    const instances = getAllStorageInstances();
    return {
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      appName: APP_NAME,
      modules: {
        baby: instances.baby.getRawData(),
        feeding: instances.feeding.getRawData(),
        sleep: instances.sleep.getRawData(),
        diaper: instances.diaper.getRawData(),
        health: instances.health.getRawData(),
        growth: instances.growth.getRawData(),
        vaccine: instances.vaccine.getRawData(),
        milestone: instances.milestone.getRawData(),
      },
    };
  }

  /**
   * 导出数据为 JSON 文件
   * 将数据写入微信文件系统临时目录，然后通过分享或保存操作
   */
  async exportToFile(): Promise<string> {
    const backup = this.generateBackup();
    const jsonStr = JSON.stringify(backup, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const fileName = `baby-care-backup-${timestamp}.json`;

    return new Promise((resolve, reject) => {
      const fs = wx.getFileSystemManager();
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;

      fs.writeFile({
        filePath,
        data: jsonStr,
        encoding: 'utf8',
        success: () => resolve(filePath),
        fail: (err) => {
          console.error('[ExportService] 写入文件失败:', err);
          reject(new Error('文件写入失败'));
        },
      });
    });
  }

  /**
   * 导出并分享文件
   */
  async exportAndShare(): Promise<void> {
    try {
      wx.showLoading({ title: '正在导出...' });
      const filePath = await this.exportToFile();
      wx.hideLoading();

      wx.shareFileMessage({
        filePath,
        fileName: filePath.split('/').pop() || 'backup.json',
        success: () => {
          wx.showToast({ title: '导出成功', icon: 'success' });
        },
        fail: (err: any) => {
          // 用户取消分享不算错误
          if (err?.errMsg?.indexOf('cancel') === -1) {
            wx.showToast({ title: '分享失败', icon: 'none' });
          }
        },
      } as any);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '导出失败', icon: 'none' });
      console.error('[ExportService] 导出失败:', err);
    }
  }

  /**
   * 导出并保存到本地
   */
  async exportAndSave(): Promise<void> {
    try {
      wx.showLoading({ title: '正在导出...' });
      const filePath = await this.exportToFile();
      wx.hideLoading();

      // 复制到剪贴板提示
      const backup = this.generateBackup();
      const recordCount = Object.values(backup.modules).reduce((sum: number, mod: any) => {
        return sum + (mod.data?.length || 0);
      }, 0);

      wx.showModal({
        title: '导出成功',
        content: `已导出 ${recordCount} 条记录。文件保存在应用临时目录，请通过"发送给朋友"功能转发保存。`,
        confirmText: '分享文件',
        cancelText: '确定',
        success: (res) => {
          if (res.confirm) {
            wx.shareFileMessage({
              filePath,
              fileName: filePath.split('/').pop() || 'backup.json',
            } as any);
          }
        },
      });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '导出失败', icon: 'none' });
    }
  }

  /**
   * 从文件恢复数据
   */
  async importFromFile(): Promise<boolean> {
    return new Promise((resolve) => {
      wx.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['json'],
        success: (res) => {
          if (!res.tempFiles || res.tempFiles.length === 0) {
            resolve(false);
            return;
          }

          const filePath = res.tempFiles[0].path;
          this.readAndRestore(filePath).then(resolve);
        },
        fail: () => {
          resolve(false);
        },
      });
    });
  }

  /**
   * 读取文件并恢复数据
   */
  private async readAndRestore(filePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      const fs = wx.getFileSystemManager();

      fs.readFile({
        filePath,
        encoding: 'utf8',
        success: (res) => {
          try {
            const backup: BackupData = JSON.parse(res.data as string);

            // 验证备份数据格式
            if (!this.validateBackup(backup)) {
              wx.showToast({ title: '无效的备份文件', icon: 'none' });
              resolve(false);
              return;
            }

            // 确认恢复
            wx.showModal({
              title: '确认恢复',
              content: '恢复操作将覆盖当前所有数据，是否继续？',
              confirmText: '确认恢复',
              confirmColor: '#F87171',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  this.restoreBackup(backup);
                  resolve(true);
                } else {
                  resolve(false);
                }
              },
            });
          } catch (e) {
            wx.showToast({ title: '文件解析失败', icon: 'none' });
            resolve(false);
          }
        },
        fail: () => {
          wx.showToast({ title: '文件读取失败', icon: 'none' });
          resolve(false);
        },
      });
    });
  }

  /**
   * 校验备份数据格式
   */
  private validateBackup(data: any): data is BackupData {
    if (!data || typeof data !== 'object') return false;
    if (data.appName !== APP_NAME) return false;
    if (!data.modules || typeof data.modules !== 'object') return false;

    const requiredModules = [
      'baby',
      'feeding',
      'sleep',
      'diaper',
      'health',
      'growth',
      'vaccine',
      'milestone',
    ];
    return requiredModules.every((mod) => data.modules[mod] !== undefined);
  }

  /**
   * 执行数据恢复
   */
  private restoreBackup(backup: BackupData): void {
    try {
      wx.showLoading({ title: '正在恢复...' });

      const instances = getAllStorageInstances();

      instances.baby.restoreFromBackup(backup.modules.baby);
      instances.feeding.restoreFromBackup(backup.modules.feeding);
      instances.sleep.restoreFromBackup(backup.modules.sleep);
      instances.diaper.restoreFromBackup(backup.modules.diaper);
      instances.health.restoreFromBackup(backup.modules.health);
      instances.growth.restoreFromBackup(backup.modules.growth);
      instances.vaccine.restoreFromBackup(backup.modules.vaccine);
      instances.milestone.restoreFromBackup(backup.modules.milestone);

      wx.hideLoading();
      wx.showToast({ title: '恢复成功', icon: 'success' });

      // 通知所有页面刷新
      eventBus.emit(Events.DATA_RESTORED);
      eventBus.emit(Events.BABY_CHANGED);
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '恢复失败', icon: 'none' });
      console.error('[ExportService] 恢复失败:', e);
    }
  }

  /**
   * 获取存储使用情况
   */
  async getStorageUsage(): Promise<{
    currentSize: number;
    limitSize: number;
    percentage: number;
    sizeText: string;
  }> {
    const info = await getStorageInfo();
    const currentKB = info.currentSize || 0;
    const limitKB = info.limitSize || 10240;
    const percentage = Math.round((currentKB / limitKB) * 100);

    let sizeText: string;
    if (currentKB < 1024) {
      sizeText = `${currentKB}KB / ${Math.round(limitKB / 1024)}MB`;
    } else {
      sizeText = `${(currentKB / 1024).toFixed(1)}MB / ${Math.round(limitKB / 1024)}MB`;
    }

    return { currentSize: currentKB, limitSize: limitKB, percentage, sizeText };
  }

  /**
   * 获取各模块数据统计
   */
  getModuleStats(): {
    module: string;
    label: string;
    count: number;
  }[] {
    const instances = getAllStorageInstances();
    return [
      { module: 'baby', label: '宝宝信息', count: instances.baby.count() },
      { module: 'feeding', label: '喂养记录', count: instances.feeding.count() },
      { module: 'sleep', label: '睡眠记录', count: instances.sleep.count() },
      { module: 'diaper', label: '排便记录', count: instances.diaper.count() },
      { module: 'health', label: '健康记录', count: instances.health.count() },
      { module: 'growth', label: '生长记录', count: instances.growth.count() },
      { module: 'vaccine', label: '疫苗记录', count: instances.vaccine.count() },
      { module: 'milestone', label: '里程碑记录', count: instances.milestone.count() },
    ];
  }
}

export const exportService = new DataExportService();
export default exportService;
