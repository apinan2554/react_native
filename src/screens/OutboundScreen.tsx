import React, { useState, useCallback } from 'react';
import { View, ScrollView, FlatList, StyleSheet } from 'react-native';
import { Text, Button, TextInput, Card } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import DatabaseService from '../db/DatabaseService';
import { Product, TransactionLog } from '../types';
import { ALL_SUB_ZONES } from '../constants/zones';

const OutboundScreen: React.FC = () => {
  const [fromZone, setFromZone] = useState<string>(ALL_SUB_ZONES[0]);
  const [availableProducts, setAvailableProducts] = useState<(Product & { qty: number })[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number>(0);
  const [quantity, setQuantity] = useState('');
  const [recentLogs, setRecentLogs] = useState<(TransactionLog & { productName?: string })[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  const loadData = useCallback(async (zone: string) => {
    const db = DatabaseService.getInstance();
    const prods = await db.getAllProducts();
    setAllProducts(prods);
    const stockEntries = await db.getStockByZone(zone);
    const available = stockEntries
      .filter(s => s.quantity > 0)
      .map(s => {
        const p = prods.find(pr => pr.id === s.productId);
        return p ? { ...p, qty: s.quantity } : null;
      })
      .filter(Boolean) as (Product & { qty: number })[];
    setAvailableProducts(available);
    if (available.length > 0) setSelectedProduct(available[0].id);
    else setSelectedProduct(0);

    const logs = await db.getRecentLogs(10);
    setRecentLogs(logs.filter(l => l.type === 'outbound'));
  }, []);

  useFocusEffect(useCallback(() => { loadData(fromZone); }, [fromZone, loadData]));

  const handleZoneChange = (zone: string) => {
    setFromZone(zone);
    loadData(zone);
  };

  const handleOutbound = async () => {
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { Toast.show({ type: 'error', text1: 'กรุณากรอกจำนวนที่มากกว่า 0' }); return; }
    if (!selectedProduct) { Toast.show({ type: 'error', text1: 'กรุณาเลือกสินค้า' }); return; }
    try {
      await DatabaseService.getInstance().outbound(selectedProduct, fromZone, qty);
      const prod = allProducts.find(p => p.id === selectedProduct);
      Toast.show({ type: 'success', text1: `จ่าย ${prod?.name} ${qty} ${prod?.unit} ออกจาก ${fromZone} สำเร็จ` });
      setQuantity('');
      loadData(fromZone);
    } catch (e: any) { Toast.show({ type: 'error', text1: e.message }); }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.formCard}>
        <Card.Content>
          <Text style={styles.label}>เลือกโซน</Text>
          <Picker selectedValue={fromZone} onValueChange={handleZoneChange} style={styles.picker}>
            {ALL_SUB_ZONES.map((z) => <Picker.Item key={z} label={z} value={z} />)}
          </Picker>

          {availableProducts.length === 0 ? (
            <Text style={styles.noStock}>ไม่มีสินค้าในโซนนี้</Text>
          ) : (
            <>
              <Text style={styles.label}>เลือกสินค้า</Text>
              <Picker selectedValue={selectedProduct} onValueChange={(v) => setSelectedProduct(v)} style={styles.picker}>
                {availableProducts.map((p) => <Picker.Item key={p.id} label={`${p.name} (คงเหลือ ${p.qty})`} value={p.id} />)}
              </Picker>

              <TextInput label="จำนวน" value={quantity} onChangeText={setQuantity} keyboardType="numeric" mode="outlined" style={styles.input} />
              <Button mode="contained" onPress={handleOutbound} style={styles.btn} icon="package-up">จ่ายสินค้าออก</Button>
            </>
          )}
        </Card.Content>
      </Card>

      {recentLogs.length > 0 && (
        <Card style={styles.historyCard}>
          <Card.Content>
            <Text style={styles.historyTitle}>ประวัติเบิกจ่ายล่าสุด</Text>
            {recentLogs.slice(0, 10).map((log) => (
              <View key={log.id} style={styles.logItem}>
                <Text style={styles.logText}>
                  {log.productName || `#${log.productId}`} — {log.quantity} หน่วย จาก {log.fromZone}
                </Text>
                <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleString('th-TH')}</Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECEFF1', padding: 12 },
  formCard: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#455A64', marginTop: 8, marginBottom: 4 },
  picker: { backgroundColor: '#F5F5F5', marginBottom: 8 },
  input: { marginBottom: 12 },
  btn: { backgroundColor: '#607D8B' },
  noStock: { textAlign: 'center', color: '#E65100', fontSize: 15, marginVertical: 20 },
  historyCard: { marginTop: 8 },
  historyTitle: { fontWeight: '600', marginBottom: 8, fontSize: 15 },
  logItem: { borderBottomWidth: 1, borderBottomColor: '#E0E0E0', paddingVertical: 6 },
  logText: { fontSize: 14, color: '#37474F' },
  logTime: { fontSize: 11, color: '#90A4AE', marginTop: 2 },
});

export default OutboundScreen;
