/**
 * event-bus.ts 单元测试
 * 覆盖发布-订阅机制的所有行为
 */
import eventBus, { Events } from '../../miniprogram/utils/event-bus';

describe('event-bus.ts', () => {
  beforeEach(() => {
    eventBus.clear();
  });

  // ========== on / emit 基本订阅发布 ==========
  describe('on / emit', () => {
    it('订阅后 emit 应触发 handler', () => {
      const handler = jest.fn();
      eventBus.on('test', handler);
      eventBus.emit('test');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('emit 应传递参数给 handler', () => {
      const handler = jest.fn();
      eventBus.on('test', handler);
      eventBus.emit('test', 'arg1', 42, { key: 'value' });
      expect(handler).toHaveBeenCalledWith('arg1', 42, { key: 'value' });
    });

    it('多个 handler 都应被调用', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      eventBus.on('test', handler1);
      eventBus.on('test', handler2);
      eventBus.emit('test');
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('emit 不存在的事件不应抛异常', () => {
      expect(() => eventBus.emit('nonexistent')).not.toThrow();
    });
  });

  // ========== on 返回的取消函数 ==========
  describe('on 返回取消函数', () => {
    it('调用取消函数后不再接收事件', () => {
      const handler = jest.fn();
      const unsub = eventBus.on('test', handler);

      eventBus.emit('test');
      expect(handler).toHaveBeenCalledTimes(1);

      unsub();
      eventBus.emit('test');
      expect(handler).toHaveBeenCalledTimes(1); // 仍然是1次
    });
  });

  // ========== off ==========
  describe('off', () => {
    it('off 指定 handler 后该 handler 不再触发', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      eventBus.on('test', handler1);
      eventBus.on('test', handler2);

      eventBus.off('test', handler1);
      eventBus.emit('test');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('off 不传 handler 移除该事件所有监听', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      eventBus.on('test', handler1);
      eventBus.on('test', handler2);

      eventBus.off('test');
      eventBus.emit('test');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('off 不存在的事件不应抛异常', () => {
      expect(() => eventBus.off('nonexistent')).not.toThrow();
    });
  });

  // ========== once ==========
  describe('once', () => {
    it('once 订阅只触发一次', () => {
      const handler = jest.fn();
      eventBus.once('test', handler);

      eventBus.emit('test');
      eventBus.emit('test');

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('once 也传递参数', () => {
      const handler = jest.fn();
      eventBus.once('test', handler);
      eventBus.emit('test', 'data');
      expect(handler).toHaveBeenCalledWith('data');
    });

    it('once 返回的取消函数可以在触发前取消', () => {
      const handler = jest.fn();
      const unsub = eventBus.once('test', handler);
      unsub();
      eventBus.emit('test');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ========== listenerCount ==========
  describe('listenerCount', () => {
    it('应正确返回监听器数量', () => {
      expect(eventBus.listenerCount('test')).toBe(0);

      eventBus.on('test', jest.fn());
      expect(eventBus.listenerCount('test')).toBe(1);

      eventBus.on('test', jest.fn());
      expect(eventBus.listenerCount('test')).toBe(2);
    });

    it('off 后数量减少', () => {
      const handler = jest.fn();
      eventBus.on('test', handler);
      expect(eventBus.listenerCount('test')).toBe(1);

      eventBus.off('test', handler);
      expect(eventBus.listenerCount('test')).toBe(0);
    });
  });

  // ========== clear ==========
  describe('clear', () => {
    it('clear 后所有事件的监听器都被清除', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      eventBus.on('event1', handler1);
      eventBus.on('event2', handler2);

      eventBus.clear();

      eventBus.emit('event1');
      eventBus.emit('event2');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  // ========== 异常处理 ==========
  describe('handler 异常不影响其他 handler', () => {
    it('一个 handler 抛异常，其他 handler 仍执行', () => {
      const errorHandler = jest.fn(() => {
        throw new Error('test error');
      });
      const normalHandler = jest.fn();

      // 捕获 console.error 避免测试输出噪音
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      eventBus.on('test', errorHandler);
      eventBus.on('test', normalHandler);
      eventBus.emit('test');

      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ========== Events 常量 ==========
  describe('Events 常量', () => {
    it('所有预定义事件名应存在', () => {
      expect(Events.FEEDING_CHANGED).toBe('feeding:changed');
      expect(Events.SLEEP_CHANGED).toBe('sleep:changed');
      expect(Events.DIAPER_CHANGED).toBe('diaper:changed');
      expect(Events.HEALTH_CHANGED).toBe('health:changed');
      expect(Events.GROWTH_CHANGED).toBe('growth:changed');
      expect(Events.VACCINE_CHANGED).toBe('vaccine:changed');
      expect(Events.MILESTONE_CHANGED).toBe('milestone:changed');
      expect(Events.BABY_CHANGED).toBe('baby:changed');
      expect(Events.BABY_SWITCHED).toBe('baby:switched');
      expect(Events.DATA_RESTORED).toBe('data:restored');
    });
  });
});
