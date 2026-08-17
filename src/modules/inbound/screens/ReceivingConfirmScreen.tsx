/**
 * ReceivingConfirmScreen - หน้าจอยืนยันรับสินค้า
 *
 * Shows list of scanned items with expected vs received quantities.
 * Allows adjusting received quantity, marking items as damaged,
 * and confirming to create GRN.
 *
 * Requirements: 1.2, 1.3, 1.6
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { GRNItem } from '../types';

interface ReceivingItem {
  id: string;
  skuId: string;
  name: string;
  expectedQuantity: number;
  receivedQuantity: number;
  isDamaged: boolean;
}

interface ReceivingConfirmScreenProps {
  poId: string;
  items: ReceivingItem[];
  onQuantityChange: (itemId: string, quantity: number) => void;
  onMarkDamaged: (item: ReceivingItem) => void;
  onConfirmReceiving: (items: ReceivingItem[]) => void;
  onGoBack?: () => void;
}

export const ReceivingConfirmScreen: React.FC<ReceivingConfirmScreenProps> = ({
  poId,
  items,
  onQuantityChange,
  onMarkDamaged,
  onConfirmReceiving,
  onGoBack,
}) => {
  const [receivingItems, setReceivingItems] = useState<ReceivingItem[]>(items);

  const hasDiscrepancy = receivingItems.some(
    (item) => item.receivedQuantity !== item.expectedQuantity,
  );

  const totalExpected = receivingItems.reduce(
    (sum, item) => sum + item.expectedQuantity,
    0,
  );
  const totalReceived = receivingItems.reduce(
    (sum, item) => sum + item.receivedQuantity,
    0,
  );

  const handleQuantityChange = useCallback(
    (itemId: string, text: string) => {
      const quantity = parseInt(text, 10);
      if (isNaN(quantity) || quantity < 0) return;

      setReceivingItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, receivedQuantity: quantity } : item,
        ),
      );
      onQuantityChange(itemId, quantity);
    },
    [onQuantityChange],
  );

  const handleConfirm = useCallback(() => {
    if (hasDiscrepancy) {
      Alert.alert(
        'พบความคลาดเคลื่อน',
        'จำนวนสินค้าที่รับไม่ตรงกับ PO ต้องการยืนยันต่อหรือไม่?',
        [
          { text: 'ยกเลิก', style: 'cancel' },
          {
            text: 'ยืนยัน',
            onPress: () => onConfirmReceiving(receivingItems),
          },
        ],
      );
    } else {
      onConfirmReceiving(receivingItems);
    }
  }, [hasDiscrepancy, receivingItems, onConfirmReceiving]);

  const renderItem = ({ item }: { item: ReceivingItem }) => {
    const isDiscrepant = item.receivedQuantity !== item.expectedQuantity;

    return (
      <View
        style={[styles.itemCard, isDiscrepant && styles.itemCardDiscrepancy]}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.isDamaged && (
            <View style={styles.damagedBadge}>
              <Text style={styles.damagedBadgeText}>เสียหาย</Text>
            </View>
          )}
        </View>

        <Text style={styles.skuText}>SKU: {item.skuId}</Text>

        <View style={styles.quantityRow}>
          <View style={styles.quantityCol}>
            <Text style={styles.quantityLabel}>คาดหวัง</Text>
            <Text style={styles.quantityExpected}>
              {item.expectedQuantity}
            </Text>
          </View>

          <View style={styles.quantityCol}>
            <Text style={styles.quantityLabel}>รับจริง</Text>
            <TextInput
              style={[
                styles.quantityInput,
                isDiscrepant && styles.quantityInputDiscrepancy,
              ]}
              value={String(item.receivedQuantity)}
              onChangeText={(text) => handleQuantityChange(item.id, text)}
              keyboardType="numeric"
              accessibilityLabel={`จำนวนที่รับจริงของ ${item.name}`}
            />
          </View>

          <View style={styles.quantityCol}>
            <Text style={styles.quantityLabel}>ส่วนต่าง</Text>
            <Text
              style={[
                styles.quantityDiff,
                isDiscrepant && styles.quantityDiffHighlight,
              ]}
            >
              {item.receivedQuantity - item.expectedQuantity}
            </Text>
          </View>
        </View>

        {isDiscrepant && (
          <View style={styles.discrepancyWarning}>
            <Text style={styles.discrepancyText}>
              ⚠️ จำนวนไม่ตรงกับ PO
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.damageButton}
          onPress={() => onMarkDamaged(item)}
          accessibilityRole="button"
          accessibilityLabel={`รายงานความเสียหายของ ${item.name}`}
        >
          <Text style={styles.damageButtonText}>📋 รายงานเสียหาย</Text>
        </TouchableOpacity>
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
          <Text style={styles.headerTitle}>ยืนยันรับสินค้า</Text>
          <Text style={styles.headerSubtitle}>PO: {poId}</Text>
        </View>
      </View>

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>รายการ</Text>
          <Text style={styles.summaryValue}>{receivingItems.length}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>คาดหวัง</Text>
          <Text style={styles.summaryValue}>{totalExpected}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>รับจริง</Text>
          <Text
            style={[
              styles.summaryValue,
              hasDiscrepancy && styles.summaryValueWarning,
            ]}
          >
            {totalReceived}
          </Text>
        </View>
      </View>

      {/* Discrepancy Banner */}
      {hasDiscrepancy && (
        <View style={styles.discrepancyBanner}>
          <Text style={styles.discrepancyBannerText}>
            ⚠️ พบความคลาดเคลื่อนระหว่างจำนวนรับจริงกับ PO
          </Text>
        </View>
      )}

      {/* Item List */}
      <FlatList
        data={receivingItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />

      {/* Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            hasDiscrepancy && styles.confirmButtonWarning,
          ]}
          onPress={handleConfirm}
          accessibilityRole="button"
          accessibilityLabel="ยืนยันรับสินค้าและสร้าง GRN"
        >
          <Text style={styles.confirmButtonText}>
            {hasDiscrepancy ? 'ยืนยัน (มีความคลาดเคลื่อน)' : 'ยืนยันรับสินค้า'}
          </Text>
        </TouchableOpacity>
      </View>
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
  headerSubtitle: {
    fontSize: 13,
    color: '#B3D4FC',
    marginTop: 2,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 2,
  },
  summaryValueWarning: {
    color: '#F44336',
  },
  discrepancyBanner: {
    backgroundColor: '#FFF3E0',
    padding: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  discrepancyBannerText: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  itemCardDiscrepancy: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  damagedBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  damagedBadgeText: {
    fontSize: 11,
    color: '#D32F2F',
    fontWeight: '600',
  },
  skuText: {
    fontSize: 13,
    color: '#888',
    marginBottom: 10,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantityCol: {
    flex: 1,
    alignItems: 'center',
  },
  quantityLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 4,
  },
  quantityExpected: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  quantityInput: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 60,
  },
  quantityInputDiscrepancy: {
    borderColor: '#FF9800',
    backgroundColor: '#FFF8E1',
  },
  quantityDiff: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
  },
  quantityDiffHighlight: {
    color: '#F44336',
  },
  discrepancyWarning: {
    backgroundColor: '#FFF8E1',
    padding: 6,
    borderRadius: 4,
    marginBottom: 8,
  },
  discrepancyText: {
    fontSize: 12,
    color: '#F57C00',
  },
  damageButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFF3E0',
  },
  damageButtonText: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonWarning: {
    backgroundColor: '#FF9800',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
