import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { List, Text, Card } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import DatabaseService from '../db/DatabaseService';
import { ZONES } from '../constants/zones';

const ZONE_COLORS: Record<string, string> = { A: '#1565C0', B: '#2E7D32', C: '#4527A0' };
const ZONE_BG: Record<string, string> = { A: '#E3F2FD', B: '#E8F5E9', C: '#EDE7F6' };

const ZoneScreen: React.FC = () => {
  const [stockData, setStockData] = useState<Record<string, number>>({});

  const loadData = useCallback(async () => {
    const db = DatabaseService.getInstance();
    const all: Record<string, number> = {};
    for (const zone of [...ZONES.A, ...ZONES.B, ...ZONES.C]) {
      const entries = await db.getStockByZone(zone);
      all[zone] = entries.reduce((sum, e) => sum + e.quantity, 0);
    }
    setStockData(all);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const getMainTotal = (zones: readonly string[]) => zones.reduce((s, z) => s + (stockData[z] || 0), 0);

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content style={styles.headerContent}>
          <Icon name="warehouse" size={32} color="#fff" />
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
            left={(props) => (
              <View style={[styles.zoneIcon, { backgroundColor: ZONE_BG[main] }]}>
                <Icon name={`alpha-${main.toLowerCase()}-circle`} size={24} color={ZONE_COLORS[main]} />
              </View>
            )}
            style={styles.accordion}
            titleStyle={styles.accordionTitle}
            descriptionStyle={styles.accordionDesc}
          >
            {subs.map((sub) => (
              <View key={sub} style={styles.subItem}>
                <Icon name="cube-outline" size={18} color="#78909C" />
                <Text style={styles.subName}>โซนย่อย {sub}</Text>
                <Text style={styles.subQty}>{stockData[sub] || 0} หน่วย</Text>
              </View>
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
  accordionTitle: { fontWeight: '600', fontSize: 16, color: '#263238' },
  accordionDesc: { fontSize: 13, color: '#78909C' },
  subItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 24, borderTopWidth: 1, borderTopColor: '#F5F5F5', gap: 8 },
  subName: { flex: 1, fontSize: 14, color: '#455A64' },
  subQty: { fontSize: 14, fontWeight: '500', color: '#263238' },
});

export default ZoneScreen;
