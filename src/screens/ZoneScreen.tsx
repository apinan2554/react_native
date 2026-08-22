import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { List, Text, Card } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import DatabaseService from '../db/DatabaseService';
import { ZONES } from '../constants/zones';
import { StockEntry, Product } from '../types';

const ZONE_COLORS: Record<string, string> = { A: '#1565C0', B: '#2E7D32', C: '#4527A0' };
const ZONE_BG: Record<string, string> = { A: '#E3F2FD', B: '#E8F5E9', C: '#EDE7F6' };

const ZoneScreen: React.FC = () => {
  const [stockData, setStockData] = useState<Record<string, StockEntry[]>>({});
  const [products, setProducts] = useState<Product[]>([]);

  const loadData = useCallback(async () => {
    const db = DatabaseService.getInstance();
    const prods = await db.getAllProducts();
    setProducts(prods);
    const all: Record<string, StockEntry[]> = {};
    for (const zone of [...ZONES.A, ...ZONES.B, ...ZONES.C]) {
      const entries = await db.getStockByZone(zone);
      all[zone] = entries;
    }
    setStockData(all);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const getZoneTotal = (zone: string) => (stockData[zone] || []).reduce((sum, e) => sum + e.quantity, 0);
  const getMainTotal = (zones: readonly string[]) => zones.reduce((s, z) => s + getZoneTotal(z), 0);

  const showZoneDetail = (zone: string) => {
    const entries = stockData[zone] || [];
    if (entries.length === 0) {
      Alert.alert(`โซน ${zone}`, 'ไม่มีสินค้าในโซนนี้', [{ text: 'OK' }]);
      return;
    }
    const details = entries.map(e => {
      const prod = products.find(p => p.id === e.productId);
      return `• ${prod?.name || `#${e.productId}`} — ${e.quantity} ${prod?.unit || 'หน่วย'}`;
    }).join('\n');

    Alert.alert(
      `📦 โซน ${zone}`,
      `สินค้าในโซนนี้:\n\n${details}\n\nรวม: ${getZoneTotal(zone)} หน่วย`,
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content style={styles.headerContent}>
          <Icon name="warehouse" size={28} color="#fff" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.warehouseName}>Main Warehouse</Text>
            <Text style={styles.warehouseInfo}>คลังสินค้าหลัก | 3 โซนหลัก | 9 โซนย่อย</Text>
          </View>
        </Card.Content>
      </Card>

      {Object.entries(ZONES).map(([main, subs]) => (
        <Card key={main} style={[styles.zoneCard, { borderLeftColor: ZONE_COLORS[main] }]}>
          <List.Accordion
            title={`Zone ${main}`}
            description={`รวม: ${getMainTotal(subs)} หน่วย`}
            left={() => (
              <View style={[styles.zoneIcon, { backgroundColor: ZONE_BG[main] }]}>
                <Icon name={`alpha-${main.toLowerCase()}-circle`} size={24} color={ZONE_COLORS[main]} />
              </View>
            )}
            style={styles.accordion}
            titleStyle={styles.accordionTitle}
            descriptionStyle={styles.accordionDesc}
          >
            {subs.map((sub) => (
              <TouchableOpacity key={sub} onPress={() => showZoneDetail(sub)} activeOpacity={0.6}>
                <View style={styles.subItem}>
                  <Icon name="cube-outline" size={18} color="#78909C" />
                  <Text style={styles.subName}>โซนย่อย {sub}</Text>
                  <Text style={styles.subQty}>{getZoneTotal(sub)} หน่วย</Text>
                  <Icon name="chevron-right" size={18} color="#90A4AE" />
                </View>
              </TouchableOpacity>
            ))}
          </List.Accordion>
        </Card>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 12 },
  headerCard: { marginBottom: 16, backgroundColor: '#455A64', borderRadius: 16, elevation: 3 },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  warehouseName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  warehouseInfo: { fontSize: 13, color: '#B0BEC5', marginTop: 2 },
  zoneCard: { marginBottom: 10, borderRadius: 12, elevation: 2, borderLeftWidth: 4, overflow: 'hidden' },
  zoneIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  accordion: { backgroundColor: '#fff', borderRadius: 12 },
  accordionTitle: { fontWeight: '600', fontSize: 16, color: '#000' },
  accordionDesc: { fontSize: 13, color: '#546E7A' },
  subItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24, borderTopWidth: 1, borderTopColor: '#F5F5F5', gap: 8 },
  subName: { flex: 1, fontSize: 14, color: '#000' },
  subQty: { fontSize: 14, fontWeight: '500', color: '#000' },
});

export default ZoneScreen;
