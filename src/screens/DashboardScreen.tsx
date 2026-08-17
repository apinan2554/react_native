import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, Title, Paragraph } from 'react-native-paper';
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
      <Text style={styles.header}>Main Warehouse</Text>

      <View style={styles.grid}>
        <Card style={[styles.card, { borderLeftColor: '#607D8B' }]}>
          <Card.Content><Paragraph>สต็อกรวม</Paragraph><Title>{data.totalStock}</Title></Card.Content>
        </Card>
        <Card style={[styles.card, { borderLeftColor: '#1976D2' }]}>
          <Card.Content><Paragraph>Zone A</Paragraph><Title>{data.zoneAStock}</Title></Card.Content>
        </Card>
        <Card style={[styles.card, { borderLeftColor: '#00897B' }]}>
          <Card.Content><Paragraph>Zone B</Paragraph><Title>{data.zoneBStock}</Title></Card.Content>
        </Card>
        <Card style={[styles.card, { borderLeftColor: '#3F51B5' }]}>
          <Card.Content><Paragraph>Zone C</Paragraph><Title>{data.zoneCStock}</Title></Card.Content>
        </Card>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>สินค้าทั้งหมด: {data.totalProducts} รายการ</Text>
        <Text style={styles.infoText}>ประวัติรายการ: {data.totalTransactions} รายการ</Text>
      </View>

      {lowStock.length > 0 && (
        <View style={styles.alertSection}>
          <Text style={styles.alertTitle}>⚠️ สินค้าต่ำกว่า Reorder Point</Text>
          {lowStock.map((p) => (
            <Card key={p.id} style={styles.alertCard}>
              <Card.Content>
                <Text style={styles.alertText}>{p.name} — สต็อก: {p.totalStock} / Reorder: {p.reorderPoint}</Text>
              </Card.Content>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECEFF1', padding: 12 },
  header: { fontSize: 20, fontWeight: '700', color: '#37474F', marginBottom: 12, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { flex: 1, minWidth: '45%', marginBottom: 8, borderLeftWidth: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12 },
  infoText: { fontSize: 14, color: '#546E7A' },
  alertSection: { marginTop: 8 },
  alertTitle: { fontSize: 16, fontWeight: '600', color: '#E65100', marginBottom: 8 },
  alertCard: { marginBottom: 6, backgroundColor: '#FFF3E0' },
  alertText: { color: '#E65100', fontSize: 14 },
});

export default DashboardScreen;
