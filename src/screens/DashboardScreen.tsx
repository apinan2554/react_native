import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import DatabaseService from '../db/DatabaseService';
import { DashboardData, Product } from '../types';

const DashboardScreen: React.FC = () => {
  const [data, setData] = useState<DashboardData>({
    totalStock: 0, zoneAStock: 0, zoneBStock: 0, zoneCStock: 0,
    totalProducts: 0, totalTransactions: 0,
  });
  const [lowStock, setLowStock] = useState<(Product & { totalStock: number })[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const db = DatabaseService.getInstance();
      const summary = await db.getDashboardSummary();
      const low = await db.getLowStockProducts();
      setData(summary);
      setLowStock(low);
    } catch (e) { console.error(e); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.headerSection}>
        <Icon name="warehouse" size={28} color="#fff" />
        <Text style={styles.headerTitle}>Main Warehouse</Text>
        <Text style={styles.headerSub}>ระบบจัดการคลังสินค้า</Text>
      </View>

      <View style={styles.grid}>
        <Card style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#E3F2FD' }]}>
            <Icon name="package-variant-closed" size={24} color="#1565C0" />
          </View>
          <Text style={styles.statValue}>{data.totalStock}</Text>
          <Text style={styles.statLabel}>สต็อกรวม</Text>
        </Card>

        <Card style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#E8F5E9' }]}>
            <Icon name="alpha-a-circle" size={24} color="#2E7D32" />
          </View>
          <Text style={styles.statValue}>{data.zoneAStock}</Text>
          <Text style={styles.statLabel}>Zone A</Text>
        </Card>

        <Card style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#FFF3E0' }]}>
            <Icon name="alpha-b-circle" size={24} color="#E65100" />
          </View>
          <Text style={styles.statValue}>{data.zoneBStock}</Text>
          <Text style={styles.statLabel}>Zone B</Text>
        </Card>

        <Card style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#EDE7F6' }]}>
            <Icon name="alpha-c-circle" size={24} color="#4527A0" />
          </View>
          <Text style={styles.statValue}>{data.zoneCStock}</Text>
          <Text style={styles.statLabel}>Zone C</Text>
        </Card>
      </View>

      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryContent}>
            <Icon name="package-variant" size={20} color="#546E7A" />
            <Text style={styles.summaryText}>{data.totalProducts} สินค้า</Text>
          </View>
        </Card>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryContent}>
            <Icon name="history" size={20} color="#546E7A" />
            <Text style={styles.summaryText}>{data.totalTransactions} รายการ</Text>
          </View>
        </Card>
      </View>

      {lowStock.length > 0 && (
        <View style={styles.alertSection}>
          <View style={styles.alertHeader}>
            <Icon name="alert-circle" size={20} color="#E65100" />
            <Text style={styles.alertTitle}>สินค้าต่ำกว่า Reorder Point</Text>
          </View>
          {lowStock.map((p) => (
            <Card key={p.id} style={styles.alertCard}>
              <View style={styles.alertRow}>
                <Icon name="alert" size={16} color="#FF6D00" />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={styles.alertName}>{p.name}</Text>
                  <Text style={styles.alertDetail}>สต็อก: {p.totalStock} / Reorder: {p.reorderPoint}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  headerSection: { backgroundColor: '#455A64', padding: 24, paddingTop: 16, alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 8 },
  headerSub: { fontSize: 13, color: '#B0BEC5', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  statCard: { width: '47%', padding: 16, borderRadius: 16, elevation: 2, alignItems: 'center', backgroundColor: '#fff' },
  statIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: '700', color: '#263238' },
  statLabel: { fontSize: 13, color: '#78909C', marginTop: 2 },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 10, marginTop: 12 },
  summaryCard: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#fff', elevation: 1 },
  summaryContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryText: { fontSize: 14, color: '#455A64', fontWeight: '500' },
  alertSection: { margin: 12, marginTop: 16 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  alertTitle: { fontSize: 15, fontWeight: '600', color: '#E65100' },
  alertCard: { marginBottom: 6, padding: 12, borderRadius: 10, backgroundColor: '#FFF8E1', elevation: 1 },
  alertRow: { flexDirection: 'row', alignItems: 'center' },
  alertName: { fontSize: 14, fontWeight: '600', color: '#37474F' },
  alertDetail: { fontSize: 12, color: '#78909C', marginTop: 2 },
});

export default DashboardScreen;
