import { OfflineQueue, ActionExecutor, DelayFn } from '../OfflineQueue';
import { SyncAction } from '../../sync/types';
import { MAX_RETRIES_OFFLINE_QUEUE } from '../../../shared/constants/retry';

function createSyncAction(overrides?: Partial<SyncAction>): SyncAction {
  return {
    id: `action-${Date.now()}`,
    type: 'create',
    entityType: 'inventory',
    entityId: 'item-1',
    payload: { name: 'Test Item' },
    timestamp: new Date(),
    ...overrides,
  };
}

/** No-op delay for tests (avoids real timeouts) */
const noDelay: DelayFn = () => Promise.resolve();

describe('OfflineQueue', () => {
  let successExecutor: ActionExecutor;
  let failExecutor: ActionExecutor;

  beforeEach(() => {
    successExecutor = jest.fn().mockResolvedValue(true);
    failExecutor = jest.fn().mockRejectedValue(new Error('Network failure'));
  });

  describe('add()', () => {
    it('should add an item to the queue', () => {
      const queue = new OfflineQueue(successExecutor);
      const action = createSyncAction();

      const item = queue.add(action);

      expect(item.action).toBe(action);
      expect(item.status).toBe('pending');
      expect(item.retryCount).toBe(0);
      expect(item.maxRetries).toBe(MAX_RETRIES_OFFLINE_QUEUE);
      expect(queue.getCount()).toBe(1);
    });

    it('should generate a unique ID for each item', () => {
      const queue = new OfflineQueue(successExecutor);

      const item1 = queue.add(createSyncAction());
      const item2 = queue.add(createSyncAction());

      expect(item1.id).not.toBe(item2.id);
    });

    it('should set createdAt to current time', () => {
      const queue = new OfflineQueue(successExecutor);
      const before = new Date();

      const item = queue.add(createSyncAction());

      expect(item.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('peek()', () => {
    it('should return null when queue is empty', () => {
      const queue = new OfflineQueue(successExecutor);

      expect(queue.peek()).toBeNull();
    });

    it('should return the first pending item without removing it', () => {
      const queue = new OfflineQueue(successExecutor);
      const action = createSyncAction();

      queue.add(action);
      const peeked = queue.peek();

      expect(peeked).not.toBeNull();
      expect(peeked!.action).toBe(action);
      expect(queue.getCount()).toBe(1);
    });

    it('should skip failed items and return next processable item', () => {
      const queue = new OfflineQueue(failExecutor, noDelay);
      const action1 = createSyncAction({ id: 'action-1' });
      const action2 = createSyncAction({ id: 'action-2' });

      queue.add(action1);
      queue.add(action2);

      // Manually mark first item as failed
      const items = queue.getItems();
      items[0].status = 'failed';

      const peeked = queue.peek();
      expect(peeked!.action.id).toBe('action-2');
    });
  });

  describe('process()', () => {
    it('should process all pending items successfully', async () => {
      const queue = new OfflineQueue(successExecutor);
      queue.add(createSyncAction({ id: 'a1' }));
      queue.add(createSyncAction({ id: 'a2' }));

      const result = await queue.process();

      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.remaining).toBe(0);
      expect(queue.getCount()).toBe(0);
    });

    it('should mark items as retrying on first failure', async () => {
      const queue = new OfflineQueue(failExecutor, noDelay);
      queue.add(createSyncAction());

      const result = await queue.process();

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.remaining).toBe(1);

      const items = queue.getItems();
      expect(items[0].status).toBe('retrying');
      expect(items[0].retryCount).toBe(1);
      expect(items[0].lastError).toBe('Network failure');
    });

    it('should mark items as failed after max retries', async () => {
      const queue = new OfflineQueue(failExecutor, noDelay);
      queue.add(createSyncAction());

      // Process multiple times until max retries reached
      for (let i = 0; i < MAX_RETRIES_OFFLINE_QUEUE; i++) {
        await queue.process();
      }

      const items = queue.getItems();
      expect(items[0].status).toBe('failed');
      expect(items[0].retryCount).toBe(MAX_RETRIES_OFFLINE_QUEUE);
    });

    it('should remove successfully processed items from queue', async () => {
      const queue = new OfflineQueue(successExecutor);
      queue.add(createSyncAction());

      await queue.process();

      expect(queue.getCount()).toBe(0);
    });

    it('should handle executor returning false as failure', async () => {
      const falseExecutor: ActionExecutor = jest.fn().mockResolvedValue(false);
      const queue = new OfflineQueue(falseExecutor, noDelay);
      queue.add(createSyncAction());

      const result = await queue.process();

      expect(result.processed).toBe(0);
      expect(result.remaining).toBe(1);

      const items = queue.getItems();
      expect(items[0].status).toBe('retrying');
    });

    it('should return empty result for empty queue', async () => {
      const queue = new OfflineQueue(successExecutor);

      const result = await queue.process();

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.remaining).toBe(0);
    });
  });

  describe('getCount()', () => {
    it('should return 0 for empty queue', () => {
      const queue = new OfflineQueue(successExecutor);
      expect(queue.getCount()).toBe(0);
    });

    it('should return correct count after adding items', () => {
      const queue = new OfflineQueue(successExecutor);
      queue.add(createSyncAction());
      queue.add(createSyncAction());
      queue.add(createSyncAction());

      expect(queue.getCount()).toBe(3);
    });
  });

  describe('getItemsByStatus()', () => {
    it('should filter items by status', async () => {
      const queue = new OfflineQueue(failExecutor, noDelay);
      queue.add(createSyncAction({ id: 'a1' }));
      queue.add(createSyncAction({ id: 'a2' }));

      // Process once so items become 'retrying'
      await queue.process();

      expect(queue.getItemsByStatus('retrying').length).toBe(2);
      expect(queue.getItemsByStatus('pending').length).toBe(0);
    });
  });

  describe('remove()', () => {
    it('should remove an item by ID', () => {
      const queue = new OfflineQueue(successExecutor);
      const item = queue.add(createSyncAction());

      queue.remove(item.id);

      expect(queue.getCount()).toBe(0);
    });

    it('should not throw when removing non-existent item', () => {
      const queue = new OfflineQueue(successExecutor);

      expect(() => queue.remove('non-existent')).not.toThrow();
    });
  });

  describe('clear()', () => {
    it('should remove all items from the queue', () => {
      const queue = new OfflineQueue(successExecutor);
      queue.add(createSyncAction());
      queue.add(createSyncAction());

      queue.clear();

      expect(queue.getCount()).toBe(0);
    });
  });
});
