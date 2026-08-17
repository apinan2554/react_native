import { SyncEngine, SyncEngineOptions } from '../SyncEngine';
import { SyncAction, SyncConflict, getDefaultStrategy } from '../types';

function createSyncAction(overrides?: Partial<SyncAction>): SyncAction {
  return {
    id: `action-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    type: 'create',
    entityType: 'inventory',
    entityId: 'item-1',
    payload: { name: 'Test Item' },
    timestamp: new Date(),
    ...overrides,
  };
}

function createConflict(overrides?: Partial<SyncConflict>): SyncConflict {
  return {
    entityType: 'inventory',
    entityId: 'item-1',
    serverVersion: { name: 'Server Name', quantity: 100 },
    clientVersion: { name: 'Client Name', quantity: 50 },
    serverTimestamp: new Date('2024-01-02'),
    clientTimestamp: new Date('2024-01-01'),
    ...overrides,
  };
}

describe('SyncEngine', () => {
  let successExecutor: jest.Mock;
  let failExecutor: jest.Mock;

  beforeEach(() => {
    successExecutor = jest.fn().mockResolvedValue(true);
    failExecutor = jest.fn().mockRejectedValue(new Error('Network error'));
  });

  describe('enqueue()', () => {
    it('should add an action to the queue', () => {
      const engine = new SyncEngine({ executor: successExecutor });
      const action = createSyncAction();

      engine.enqueue(action);

      const status = engine.getQueueStatus();
      expect(status.total).toBe(1);
      expect(status.pending).toBe(1);
    });

    it('should add multiple actions to the queue', () => {
      const engine = new SyncEngine({ executor: successExecutor });

      engine.enqueue(createSyncAction({ id: 'a1' }));
      engine.enqueue(createSyncAction({ id: 'a2' }));
      engine.enqueue(createSyncAction({ id: 'a3' }));

      const status = engine.getQueueStatus();
      expect(status.total).toBe(3);
      expect(status.pending).toBe(3);
    });
  });

  describe('processQueue()', () => {
    it('should process all items successfully', async () => {
      const engine = new SyncEngine({ executor: successExecutor });
      engine.enqueue(createSyncAction({ id: 'a1' }));
      engine.enqueue(createSyncAction({ id: 'a2' }));

      const result = await engine.processQueue();

      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should report failures when executor fails', async () => {
      const engine = new SyncEngine({ executor: failExecutor });
      engine.enqueue(createSyncAction());

      const result = await engine.processQueue();

      expect(result.processed).toBe(0);
      // Item is retrying, not yet failed
      expect(result.failed).toBe(0);
    });

    it('should return empty result for empty queue', async () => {
      const engine = new SyncEngine({ executor: successExecutor });

      const result = await engine.processQueue();

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should include conflicts in result', async () => {
      const engine = new SyncEngine({ executor: successExecutor });
      const conflict = createConflict();
      engine.addConflict(conflict);

      const result = await engine.processQueue();

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toEqual(conflict);
    });
  });

  describe('getQueueStatus()', () => {
    it('should return zero counts for empty queue', () => {
      const engine = new SyncEngine({ executor: successExecutor });

      const status = engine.getQueueStatus();

      expect(status.pending).toBe(0);
      expect(status.retrying).toBe(0);
      expect(status.failed).toBe(0);
      expect(status.total).toBe(0);
    });

    it('should reflect correct status after processing failures', async () => {
      const engine = new SyncEngine({ executor: failExecutor });
      engine.enqueue(createSyncAction());

      await engine.processQueue();

      const status = engine.getQueueStatus();
      expect(status.retrying).toBe(1);
      expect(status.pending).toBe(0);
      expect(status.total).toBe(1);
    });
  });

  describe('resolveConflict()', () => {
    it('should resolve with server_wins strategy (use server data)', async () => {
      const onConflictResolved = jest.fn().mockResolvedValue(undefined);
      const engine = new SyncEngine({
        executor: successExecutor,
        onConflictResolved,
      });
      const conflict = createConflict();
      engine.addConflict(conflict);

      await engine.resolveConflict(conflict, 'server_wins');

      expect(onConflictResolved).toHaveBeenCalledWith(
        conflict,
        conflict.serverVersion,
      );
      expect(engine.getConflicts()).toHaveLength(0);
    });

    it('should resolve with client_wins strategy (use client data)', async () => {
      const onConflictResolved = jest.fn().mockResolvedValue(undefined);
      const engine = new SyncEngine({
        executor: successExecutor,
        onConflictResolved,
      });
      const conflict = createConflict();
      engine.addConflict(conflict);

      await engine.resolveConflict(conflict, 'client_wins');

      expect(onConflictResolved).toHaveBeenCalledWith(
        conflict,
        conflict.clientVersion,
      );
      expect(engine.getConflicts()).toHaveLength(0);
    });

    it('should resolve with manual_merge strategy (merge both)', async () => {
      const onConflictResolved = jest.fn().mockResolvedValue(undefined);
      const engine = new SyncEngine({
        executor: successExecutor,
        onConflictResolved,
      });
      const conflict = createConflict();
      engine.addConflict(conflict);

      await engine.resolveConflict(conflict, 'manual_merge');

      expect(onConflictResolved).toHaveBeenCalledWith(conflict, {
        ...conflict.serverVersion,
        ...conflict.clientVersion,
      });
    });

    it('should work without onConflictResolved callback', async () => {
      const engine = new SyncEngine({ executor: successExecutor });
      const conflict = createConflict();
      engine.addConflict(conflict);

      await expect(
        engine.resolveConflict(conflict, 'server_wins'),
      ).resolves.not.toThrow();

      expect(engine.getConflicts()).toHaveLength(0);
    });
  });

  describe('resolveConflictWithDefault()', () => {
    it('should use server_wins for master data entities', async () => {
      const onConflictResolved = jest.fn().mockResolvedValue(undefined);
      const engine = new SyncEngine({
        executor: successExecutor,
        onConflictResolved,
      });
      const conflict = createConflict({ entityType: 'sku' });
      engine.addConflict(conflict);

      await engine.resolveConflictWithDefault(conflict);

      expect(onConflictResolved).toHaveBeenCalledWith(
        conflict,
        conflict.serverVersion,
      );
    });

    it('should use client_wins for in-progress work entities', async () => {
      const onConflictResolved = jest.fn().mockResolvedValue(undefined);
      const engine = new SyncEngine({
        executor: successExecutor,
        onConflictResolved,
      });
      const conflict = createConflict({ entityType: 'pick_list' });
      engine.addConflict(conflict);

      await engine.resolveConflictWithDefault(conflict);

      expect(onConflictResolved).toHaveBeenCalledWith(
        conflict,
        conflict.clientVersion,
      );
    });
  });

  describe('addConflict() and getConflicts()', () => {
    it('should track conflicts', () => {
      const engine = new SyncEngine({ executor: successExecutor });
      const conflict = createConflict();

      engine.addConflict(conflict);

      expect(engine.getConflicts()).toHaveLength(1);
      expect(engine.getConflicts()[0]).toEqual(conflict);
    });

    it('should return a copy of conflicts array', () => {
      const engine = new SyncEngine({ executor: successExecutor });
      const conflict = createConflict();
      engine.addConflict(conflict);

      const conflicts = engine.getConflicts();
      conflicts.pop();

      expect(engine.getConflicts()).toHaveLength(1);
    });
  });
});

describe('getDefaultStrategy()', () => {
  it('should return server_wins for SKU entity', () => {
    expect(getDefaultStrategy('sku')).toBe('server_wins');
  });

  it('should return server_wins for supplier entity', () => {
    expect(getDefaultStrategy('supplier')).toBe('server_wins');
  });

  it('should return server_wins for customer entity', () => {
    expect(getDefaultStrategy('customer')).toBe('server_wins');
  });

  it('should return server_wins for vehicle entity', () => {
    expect(getDefaultStrategy('vehicle')).toBe('server_wins');
  });

  it('should return server_wins for driver entity', () => {
    expect(getDefaultStrategy('driver')).toBe('server_wins');
  });

  it('should return client_wins for inventory entity', () => {
    expect(getDefaultStrategy('inventory')).toBe('client_wins');
  });

  it('should return client_wins for pick_list entity', () => {
    expect(getDefaultStrategy('pick_list')).toBe('client_wins');
  });

  it('should return client_wins for transport_order entity', () => {
    expect(getDefaultStrategy('transport_order')).toBe('client_wins');
  });

  it('should return client_wins for unknown entity types', () => {
    expect(getDefaultStrategy('unknown_entity')).toBe('client_wins');
  });
});
