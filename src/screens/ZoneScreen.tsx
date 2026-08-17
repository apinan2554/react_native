import React, { useState, useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { List, Text, Card } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import DatabaseService from '../db/DatabaseService';
import { ZONES } from '../constants/zones';
import { StockEntry } from '../types';

const ZONE_COLORS: Record<string, string> = { A: '#1976D2', B: '#00897B', C: '#3F51B5' };

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
        <Card.Content>
          <Text style={styles.warehouseName}>🏭 Main Warehouse</Text>
          <Text style={styles.warehouseInfo}>3 โซนหลัก / 9 โซนย่อย</Text>
        </Card.Content>
      </Card>

      {Object.entries(ZONES).map(([main, subs]) => (
        <List.Accordion
          key={main}
          title={`Zone ${main}`}
          description={`สต็อกรวม: ${getMainTotal(subs)} หน่วย`}
          left={(props) => <List.Icon {...props} icon="warehouse" color={ZONE_COLORS[main]} />}
          style={styles.accordion}
          titleStyle={{ fontWeight: '600' }}
        >
          {subs.map((sub) => (
            <List.Item
              key={sub}
              title={`โซน ${sub}`}
              description={`${stockData[sub] || 0} หน่วย`}
              left={(props) => <List.Icon {...props} icon="cube-outline" />}
              style={styles.subItem}
            />
          ))}
        </List.Accordion>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECEFF1', padding: 8 },
  headerCard: { marginBottom: 12, backgroundColor: '#607D8B' },
  warehouseName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  warehouseInfo: { fontSize: 13, color: '#B0BEC5', marginTop: 4 },
  accordion: { backgroundColor: '#fff', marginBottom: 4, borderRadius: 8 },
  subItem: { paddingLeft: 24 },
});

export default ZoneScreen;
