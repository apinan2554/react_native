/**
 * GRNHistoryScreen - หน้าจอประวัติ GRN พร้อมตัวกรอง
 *
 * Shows a list of GRNs with:
 * - GRN number, date, status, supplier
 * - Filter controls: date range picker, supplier dropdown, status tabs
 * - Tap to view detail
 *
 * Requirements: 1.4
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { GRN } from '../types';
import { GRNListItem } from '../components/GRNListItem';
import { FilterBar, FilterValues } from '../components/FilterBar';

interface Supplier {
  id: string;
  name: string;
}

interface GRNHistoryScreenProps {
  onLoadGRNs: (filters: FilterValues) => Promise<GRN[]>;
  onGRNPress: (grn: GRN) => void;
  suppliers?: Supplier[];
  getSupplierName?: (poId: string) => string | undefined;
}

export const GRNHistoryScreen: React.FC<GRNHistoryScreenProps> = ({
  onLoadGRNs,
  onGRNPress,
  suppliers = [],
  getSupplierName,
}) => {
  const [grnList, setGrnList] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({});

  const loadData = useCallback(
    async (currentFilters: FilterValues) => {
      try {
        const result = await onLoadGRNs(currentFilters);
        setGrnList(result);
      } catch (error) {
        // Error handled silently - list remains empty
        setGrnList([]);
      }
    },
    [onLoadGRNs],
  );

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadData(filters);
      setLoading(false);
    };
    init();
  }, []);

  const handleFilterChange = useCallback(
    async (newFilters: FilterValues) => {
      setFilters(newFilters);
      setLoading(true);
      await loadData(newFilters);
      setLoading(false);
    },
    [loadData],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(filters);
    setRefreshing(false);
  }, [filters, loadData]);

  const renderItem = useCallback(
    ({ item }: { item: GRN }) => (
      <GRNListItem
        grn={item}
        supplierName={getSupplierName?.(item.poId)}
        onPress={onGRNPress}
      />
    ),
    [onGRNPress, getSupplierName],
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>ไม่พบรายการ GRN</Text>
      <Text style={styles.emptySubtitle}>
        ลองเปลี่ยนตัวกรองหรือดึงข้อมูลใหม่
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ประวัติ GRN</Text>
        <Text style={styles.headerSubtitle}>
          {grnList.length} รายการ
        </Text>
      </View>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        suppliers={suppliers}
      />

      {/* Loading State */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>กำลังโหลด...</Text>
        </View>
      ) : (
        /* GRN List */
        <FlatList
          data={grnList}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#1976D2']}
            />
          }
        />
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
    padding: 16,
    backgroundColor: '#1976D2',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#B3D4FC',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
  },
});
