/**
 * StockListScreen - หน้าจอแสดงสต็อกเรียลไทม์
 *
 * Real-time stock display screen showing:
 * - FlatList of stock levels (SKU, bin, quantity, available, reserved)
 * - Color indicators for threshold alerts (red for low, orange for near-low)
 * - Filter controls: by SKU search, by bin/zone
 * - Pull-to-refresh
 *
 * Requirements: 3.1
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { StockLevel } from '../types';

interface StockListScreenProps {
  stockLevels: StockLevel[];
  onRefresh: () => Promise<void>;
  onFilterChange?: (filters: { skuSearch: string; binZone: string }) => void;
  onGoBack?: () => void;
}

export const StockListScreen: React.FC<StockListScreenProps> = ({
  stockLevels,
  onRefresh,
  onFilterChange,
  onGoBack,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [skuSearch, setSkuSearch] = useState('');
  const [binZone, setBinZone] = useState('');

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const handleSkuSearchChange = useCallback(
    (text: string) => {
      setSkuSearch(text);
      onFilterChange?.({ skuSearch: text, binZone });
    },
    [binZone, onFilterChange],
  );

  const handleBinZoneChange = useCallback(
    (text: string) => {
      setBinZone(text);
      onFilterChange?.({ skuSearch, binZone: text });
    },
    [skuSearch, onFilterChange],
  );

  const getAlertLevel = (stock: StockLevel): 'critical' | 'warning' | 'normal' => {
    if (stock.availableQuantity < stock.minThreshold) {
      return 'critical';
    }
    // Near-low: within 20% above min threshold
    const nearLowThreshold = stock.minThreshold * 1.2;
    if (stock.availableQuantity < nearLowThreshold) {
      return 'warning';
    }
    return 'normal';
  };

  const getAlertStyle = (alertLevel: 'critical' | 'warning' | 'normal') => {
    switch (alertLevel) {
      case 'critical':
        return styles.alertCritical;
      case 'warning':
        return styles.alertWarning;
      default:
        return null;
    }
  };

  const filteredStockLevels = stockLevels.filter((stock) => {
    const matchesSku = skuSearch
      ? stock.skuId.toLowerCase().includes(skuSearch.toLowerCase())
      : true;
    const matchesBin = binZone
      ? stock.binId.toLowerCase().includes(binZone.toLowerCase())
      : true;
    return matchesSku && matchesBin;
  });

  const renderStockItem = ({ item }: { item: StockLevel }) => {
    const alertLevel = getAlertLevel(item);
    const alertStyle = getAlertStyle(alertLevel);

    return (
      <View
        style={[styles.stockCard, alertStyle]}
        accessibilityLabel={`สต็อก ${item.skuId} ตำแหน่ง ${item.binId}`}
      >
        <View style={styles.stockHeader}>
          <Text style={styles.skuText}>{item.skuId}</Text>
          {alertLevel === 'critical' && (
            <View style={styles.alertBadgeCritical}>
              <Text style={styles.alertBadgeText}>สต็อกต่ำ</Text>
            </View>
          )}
          {alertLevel === 'warning' && (
            <View style={styles.alertBadgeWarning}>
              <Text style={styles.alertBadgeWarningText}>ใกล้ต่ำ</Text>
            </View>
          )}
        </View>

        <View style={styles.stockDetails}>
          <View style={styles.stockDetailItem}>
            <Text style={styles.stockDetailLabel}>ตำแหน่ง</Text>
            <Text style={styles.stockDetailValue}>{item.binId}</Text>
          </View>
          <View style={styles.stockDetailItem}>
            <Text style={styles.stockDetailLabel}>จำนวนทั้งหมด</Text>
            <Text style={styles.stockDetailValue}>{item.quantity}</Text>
          </View>
          <View style={styles.stockDetailItem}>
            <Text style={styles.stockDetailLabel}>พร้อมใช้</Text>
            <Text style={[styles.stockDetailValue, styles.availableText]}>
              {item.availableQuantity}
            </Text>
          </View>
          <View style={styles.stockDetailItem}>
            <Text style={styles.stockDetailLabel}>จอง</Text>
            <Text style={styles.stockDetailValue}>{item.reservedQuantity}</Text>
          </View>
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
        <Text style={styles.headerTitle}>สต็อกสินค้า</Text>
      </View>

      {/* Filter Controls */}
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.filterInput}
          placeholder="ค้นหา SKU..."
          placeholderTextColor="#999"
          value={skuSearch}
          onChangeText={handleSkuSearchChange}
          accessibilityLabel="ค้นหา SKU"
        />
        <TextInput
          style={styles.filterInput}
          placeholder="กรองตามตำแหน่ง/โซน..."
          placeholderTextColor="#999"
          value={binZone}
          onChangeText={handleBinZoneChange}
          accessibilityLabel="กรองตามตำแหน่ง"
        />
      </View>

      {/* Stock List */}
      <FlatList
        data={filteredStockLevels}
        renderItem={renderStockItem}
        keyExtractor={(item) => `${item.skuId}-${item.binId}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#1976D2']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>ไม่พบรายการสต็อก</Text>
          </View>
        }
      />
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filterContainer: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 8,
  },
  filterInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  listContent: {
    padding: 12,
  },
  stockCard: {
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
  alertCritical: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  alertWarning: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  skuText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  alertBadgeCritical: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  alertBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F44336',
  },
  alertBadgeWarning: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  alertBadgeWarningText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9800',
  },
  stockDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  stockDetailItem: {
    width: '50%',
    paddingVertical: 4,
  },
  stockDetailLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  stockDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  availableText: {
    color: '#1976D2',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
