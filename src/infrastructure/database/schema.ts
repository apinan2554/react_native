import { appSchema, tableSchema } from '@nozbe/watermelondb';

/**
 * WatermelonDB Schema Definition
 *
 * This schema defines the local database structure for offline-first support.
 * Tables are organized by module and support sync capabilities.
 */
export const schema = appSchema({
  version: 1,
  tables: [
    // Inbound Module
    tableSchema({
      name: 'grns',
      columns: [
        { name: 'grn_number', type: 'string' },
        { name: 'po_id', type: 'string' },
        { name: 'supplier_id', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'received_by', type: 'string' },
        { name: 'received_at', type: 'number' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'grn_items',
      columns: [
        { name: 'grn_id', type: 'string', isIndexed: true },
        { name: 'sku_id', type: 'string' },
        { name: 'expected_quantity', type: 'number' },
        { name: 'received_quantity', type: 'number' },
        { name: 'damaged_quantity', type: 'number' },
        { name: 'barcode', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Putaway Module
    tableSchema({
      name: 'bins',
      columns: [
        { name: 'code', type: 'string' },
        { name: 'zone', type: 'string' },
        { name: 'aisle', type: 'string' },
        { name: 'rack', type: 'string' },
        { name: 'level', type: 'string' },
        { name: 'max_capacity', type: 'number' },
        { name: 'current_capacity', type: 'number' },
        { name: 'temperature_zone', type: 'string', isOptional: true },
        { name: 'distance_from_door', type: 'number' },
        { name: 'is_active', type: 'boolean' },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Inventory Module
    tableSchema({
      name: 'stock_levels',
      columns: [
        { name: 'sku_id', type: 'string', isIndexed: true },
        { name: 'bin_id', type: 'string', isIndexed: true },
        { name: 'quantity', type: 'number' },
        { name: 'reserved_quantity', type: 'number' },
        { name: 'min_threshold', type: 'number' },
        { name: 'max_threshold', type: 'number' },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'stock_transfers',
      columns: [
        { name: 'sku_id', type: 'string', isIndexed: true },
        { name: 'from_bin_id', type: 'string' },
        { name: 'to_bin_id', type: 'string' },
        { name: 'quantity', type: 'number' },
        { name: 'transferred_by', type: 'string' },
        { name: 'transferred_at', type: 'number' },
        { name: 'reason', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'cycle_counts',
      columns: [
        { name: 'scheduled_date', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'group_by', type: 'string' },
        { name: 'created_by', type: 'string' },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'cycle_count_items',
      columns: [
        { name: 'cycle_count_id', type: 'string', isIndexed: true },
        { name: 'sku_id', type: 'string' },
        { name: 'bin_id', type: 'string' },
        { name: 'system_quantity', type: 'number' },
        { name: 'counted_quantity', type: 'number', isOptional: true },
        { name: 'discrepancy', type: 'number', isOptional: true },
        { name: 'counted_by', type: 'string', isOptional: true },
        { name: 'counted_at', type: 'number', isOptional: true },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Fleet Module
    tableSchema({
      name: 'vehicles',
      columns: [
        { name: 'license_plate', type: 'string' },
        { name: 'vehicle_type', type: 'string' },
        { name: 'max_load_kg', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'current_mileage', type: 'number' },
        { name: 'insurance_expiry', type: 'number' },
        { name: 'registration_expiry', type: 'number' },
        { name: 'next_maintenance_mileage', type: 'number' },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'drivers',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'license_number', type: 'string' },
        { name: 'license_expiry', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'phone', type: 'string', isOptional: true },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Dispatch Module
    tableSchema({
      name: 'transport_orders',
      columns: [
        { name: 'order_number', type: 'string' },
        { name: 'vehicle_id', type: 'string', isOptional: true },
        { name: 'driver_id', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'total_weight_kg', type: 'number' },
        { name: 'pickup_address', type: 'string' },
        { name: 'scheduled_at', type: 'number' },
        { name: 'completed_at', type: 'number', isOptional: true },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Tracking Module
    tableSchema({
      name: 'delivery_tracking',
      columns: [
        { name: 'order_id', type: 'string', isIndexed: true },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'timestamp', type: 'number' },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Master Data Module
    tableSchema({
      name: 'skus',
      columns: [
        { name: 'code', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'weight_kg', type: 'number' },
        { name: 'width_cm', type: 'number', isOptional: true },
        { name: 'height_cm', type: 'number', isOptional: true },
        { name: 'depth_cm', type: 'number', isOptional: true },
        { name: 'barcode', type: 'string', isOptional: true },
        { name: 'image_url', type: 'string', isOptional: true },
        { name: 'is_temperature_controlled', type: 'boolean' },
        { name: 'is_fast_moving', type: 'boolean' },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Offline Sync Queue
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'action', type: 'string' },
        { name: 'entity_type', type: 'string' },
        { name: 'entity_id', type: 'string' },
        { name: 'payload', type: 'string' },
        { name: 'retry_count', type: 'number' },
        { name: 'max_retries', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'error_message', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
