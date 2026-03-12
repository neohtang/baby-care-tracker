/**
 * 简易事件总线（发布-订阅模式）
 * 用于跨页面数据刷新通知，如添加记录后通知首页刷新摘要
 */

type EventHandler = (...args: any[]) => void;

interface EventMap {
  [eventName: string]: EventHandler[];
}

class EventBus {
  private events: EventMap = {};

  /**
   * 订阅事件
   * @param eventName 事件名称
   * @param handler 处理函数
   * @returns 取消订阅的函数
   */
  on(eventName: string, handler: EventHandler): () => void {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(handler);

    // 返回取消订阅的函数，方便在页面 onUnload 时清理
    return () => {
      this.off(eventName, handler);
    };
  }

  /**
   * 订阅一次性事件（触发后自动取消）
   */
  once(eventName: string, handler: EventHandler): () => void {
    const wrappedHandler: EventHandler = (...args) => {
      handler(...args);
      this.off(eventName, wrappedHandler);
    };
    return this.on(eventName, wrappedHandler);
  }

  /**
   * 取消订阅
   */
  off(eventName: string, handler?: EventHandler): void {
    if (!this.events[eventName]) return;

    if (!handler) {
      // 不传 handler 则移除该事件所有监听
      delete this.events[eventName];
      return;
    }

    this.events[eventName] = this.events[eventName].filter(h => h !== handler);

    if (this.events[eventName].length === 0) {
      delete this.events[eventName];
    }
  }

  /**
   * 发布事件
   */
  emit(eventName: string, ...args: any[]): void {
    const handlers = this.events[eventName];
    if (!handlers || handlers.length === 0) return;

    // 使用副本遍历，避免在 handler 中修改订阅列表导致问题
    [...handlers].forEach(handler => {
      try {
        handler(...args);
      } catch (e) {
        console.error(`[EventBus] Error in handler for "${eventName}":`, e);
      }
    });
  }

  /**
   * 清除所有事件监听
   */
  clear(): void {
    this.events = {};
  }

  /**
   * 获取指定事件的监听器数量（调试用）
   */
  listenerCount(eventName: string): number {
    return this.events[eventName]?.length || 0;
  }
}

// ============ 预定义事件名常量 ============

/** 事件名称常量 */
export const Events = {
  /** 喂养记录变更 */
  FEEDING_CHANGED: 'feeding:changed',
  /** 睡眠记录变更 */
  SLEEP_CHANGED: 'sleep:changed',
  /** 排便记录变更 */
  DIAPER_CHANGED: 'diaper:changed',
  /** 健康记录变更 */
  HEALTH_CHANGED: 'health:changed',
  /** 生长记录变更 */
  GROWTH_CHANGED: 'growth:changed',
  /** 疫苗记录变更 */
  VACCINE_CHANGED: 'vaccine:changed',
  /** 里程碑记录变更 */
  MILESTONE_CHANGED: 'milestone:changed',
  /** 宝宝信息变更 */
  BABY_CHANGED: 'baby:changed',
  /** 当前宝宝切换 */
  BABY_SWITCHED: 'baby:switched',
  /** 数据导入/恢复完成 */
  DATA_RESTORED: 'data:restored',
} as const;

// 导出全局唯一实例
const eventBus = new EventBus();
export default eventBus;
