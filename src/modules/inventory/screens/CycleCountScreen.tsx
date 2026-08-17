/**
 * CycleCountScreen - หน้าจอ Cycle Count พร้อมบันทึกผลนับ
 *
 * Cycle count recording screen showing:
 * - List of items to count (SKU, bin, system quantity)
 * - Input field for each item to enter counted quantity
 * - Shows discrepancy (counted - system) after entry
 * - Highlights discrepancies in red/orange
 * - Submit button to record results
 * - Status indicator (pending, in_progress, completed, approved)
 *
 * Requirements: 3.5
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { CycleCount, CycleCountItem } from '../types';

interface CycleCountScreenProps {
  cycleCount: CycleCount;
  onSubmitResults: (
    results: { itemId: string; countedQuantity: number }[],
  ) => Promise<void>;
  onGoBack?: () => void;
}

type CountEntry = {
  [itemId: string]: string;
};

const STATUS_LABELS: Record<CycleCount['status'], string> = {
  pending: 'รอดำเนินการ',
  in_progress: 'กำลังนับ',
  completed: 'นับเสร็จแล้ว',
  approved: 'อนุมัติแล้ว',
};

const STATUS_COLORS: Record<CycleCount['status'], string> = {
  pending: '#FF9800',
  in_progress: '#1976D2',
  completed: '#4CAF50',
  approved: '#2E7D32',
};

export const CycleCountScreen: React.FC<CycleCountScreenProps> = ({
  cycleCount,
  onSubmitResults,
  onGoBack,
}) => {
  const [countEntries, setCountEntries] = useState<CountEntry>(() => {
    const initial: CountEntry = {};
    cycleCount.items.forEach((item) => {
      if (item.countedQuantity !== undefined) {
        initial[item.id] = String(item.countedQuantity);
      }
    });
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);

  const handleCountChange = useCallback((itemId: string, value: string) => {
    setCountEntries((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  }, []);

  const getDiscrepancy = (item: CycleCountItem): number | null => {
    const entryValue = countEntries[item.id];
    if (entryValue === undefined || entryValue === '') return null;
    const counted = parseInt(entryValue, 10);
    if (isNaN(counted)) return null;
    return counted - item.systemQuantity;
  };

  const getDiscrepancyStyle = (discrepancy: number | null) => {
    if (discrepancy === null || discrepancy === 0) return null;
    if (Math.abs(discrepancy) > 5) return styles.discrepancyCritical;
    return styles.discrepancyWarning;
  };

  const hasEntries = Object.values(countEntries).some(
    (v) => v !== '' && !isNaN(parseInt(v, 10)),
  );
  const isReadOnly =
    cycleCount.status === 'approved' || cycleCount.status === 'completed';

  const handleSubmit = useCallback(async () => {
    if (!hasEntries || isReadOnly) return;

    const results = Object.entries(countEntries)
      .filter(([_, value]) => value !== '' && !isNaN(parseInt(value, 10)))
      .map(([itemId, value]) => ({
        itemId,
        countedQuantity: parseInt(value, 10),
      }));

    if (results.length === 0) return;

    setSubmitting(true);
    try {
      await onSubmitResults(results);
    } finally {
      setSubmitting(false);
    }
  }, [hasEntries, isReadOnly, countEntries, onSubmitResults]);

  const renderItem = ({ item }: { item: CycleCountItem }) => {
    const discrepancy = getDiscrepancy(item);
    const discrepancyStyle = getDiscrepancyStyle(discrepancy);

    return (
      <View
        style={[styles.itemCard, discrepancyStyle]}
        accessibilityLabel={`รายการนับ ${item.skuId} ตำแหน่ง ${item.binId}`}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.itemSku}>{item.skuId}</Text>
          <Text style={styles.itemBin}>📍 {item.binId}</Text>
        </View>

        <View style={styles.itemDetails}>
          <View style={styles.itemDetailRow}>
            <Text style={styles.itemDetailLabel}>จำนวนในระบบ:</Text>
            <Text style={styles.itemDetailValue}>{item.systemQuantity}</Text>
          </View>

          <View style={styles.countInputRow}>
            <Text style={styles.itemDetailLabel}>จำนวนที่นับได้:</Text>
            {isReadOnly ? (
              <Text style={styles.itemDetailValue}>
                {item.countedQuantity ?? '-'}
              </Text>
            ) : (
              <TextInput
                style={styles.countInput}
                placeholder="0"
                placeholderTextColor="#999"
                value={countEntries[item.id] || ''}
                onChangeText={(value) => handleCountChange(item.id, value)}
                keyboardType="numeric"
                accessibilityLabel={`จำนวนนับ ${item.skuId}`}
              />
            )}
          </View>

          {discrepancy !== null && discrepancy !== 0 && (
            <View style={styles.discrepancyRow}>
              <Text style={styles.discrepancyLabel}>ส่วนต่าง:</Text>
              <Text
                style={[
                  styles.discrepancyValue,
                  discrepancy > 0
                    ? styles.discrepancyPositive
                    : styles.discrepancyNegative,
                ]}
              >
                {discrepancy > 0 ? `+${discrepancy}` : discrepancy}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onGoBack && (
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← กลับ</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>นับสต็อก (Cycle Count)</Text>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: STATUS_COLORS[cycleCount.status] },
              ]}
            />
            <Text style={styles.statusText}>
              {STATUS_LABELS[cycleCount.status]}
            </Text>
          </View>
        </View>
      </View>

      {/* Summary info */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          รายการทั้งหมด: {cycleCount.items.length} รายการ
        </Text>
        <Text style={styles.summaryText}>
          กลุ่ม: {cycleCount.groupBy === 'sku_category' ? 'หมวดหมู่สินค้า' : 'โซนตำแหน่ง'}
        </Text>
      </View>

      {/* Items List */}
      <FlatList
        data={cycleCount.items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>ไม่มีรายการนับสต็อก</Text>
          </View>
        }
      />

      {/* Submit Button */}
      {!isReadOnly && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              !hasEntries && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!hasEntries || submitting}
            accessibilityRole="button"
            accessibilityLabel="บันทึกผลนับสต็อก"
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>บันทึกผลนับ</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1976D2',
  },
  backButton: {
    marginRight: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: '#B3D4FC',
  },
  summaryContainer: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryText: {
    fontSize: 13,
    color: '#666',
  },
  listContent: {
    padding: 12,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  discrepancyCritical: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  discrepancyWarning: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemSku: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  itemBin: {
    fontSize: 13,
    color: '#666',
  },
  itemDetails: {
    gap: 8,
  },
  itemDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  itemDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  countInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    width: 80,
    textAlign: 'center',
  },
  discrepancyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  discrepancyLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  discrepancyValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  discrepancyPositive: {
    color: '#FF9800',
  },
  discrepancyNegative: {
    color: '#F44336',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
