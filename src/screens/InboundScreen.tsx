import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Button, TextInput, Card } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import DatabaseService from '../db/DatabaseService';
import { Product } from '../types';
import { ALL_SUB_ZONES, ZONES } from '../constants/zones';

const InboundScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number>(0);
  const [selectedZone, setSelectedZone] = useState(ALL_SUB_ZONES[0]);
  const [quantity, setQuantity] = useState('');
  const [zoneSummary, setZoneSummary] = useState<Record<string, number>>({ A: 0, B: 0, C: 0 });

  const loadData = useCallback(async () => {
    const db = DatabaseService.getInstance();
    const prods = await db.getAllProducts();
    setProducts(prods);
    if (prods.length > 0 && !selectedProduct) setSelectedProduct(prods[0].id);
    const summary = await db.getDashboardSummary();
    setZoneSummary({ A: summary.zoneAStock, B: summary.zoneBStock, C: summary.zoneCStock });
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleInbound = async () => {
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { Toast.show({ type: 'error', text1: 'กรุณากรอกจำนวนที่มากกว่า 0' }); return; }
    if (!selectedProduct) { Toast.show({ type: 'error', text1: 'กรุณาเลือกสินค้า' }); return; }
    try {
      await DatabaseService.getInstance().inbound(selectedProduct, selectedZone, qty);
      const prod = products.find(p => p.id === selectedProduct);
      Toast.show({ type: 'success', text1: `รับ ${prod?.name} ${qty} ${prod?.unit} เข้า ${selectedZone} สำเร็จ` });
      setQuantity('');
      loadData();
    } catch (e: any) { Toast.show({ type: 'error', text1: e.message }); }
  };

  if (products.length === 0) {
    return <View style={styles.container}><Text style={styles.empty}>เพิ่มสินค้าใน Product Master ก่อน</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.formCard}>
        <Card.Content>
          <Text style={styles.label}>เลือกสินค้า</Text>
          <Picker selectedValue={selectedProduct} onValueChange={(v) => setSelectedProduct(v)} style={styles.picker}>
            {products.map((p) => <Picker.Item key={p.id} label={`${p.name} (${p.unit})`} value={p.id} />)}
          </Picker>

          <Text style={styles.label}>เลือกโซนปลายทาง</Text>
          <Picker selectedValue={selectedZone} onValueChange={(v) => setSelectedZone(v)} style={styles.picker}>
            {ALL_SUB_ZONES.map((z) => <Picker.Item key={z} label={z} value={z} />)}
          </Picker>

          <TextInput label="จำนวน" value={quantity} onChangeText={setQuantity} keyboardType="numeric" mode="outlined" style={styles.input} />
          <Button mode="contained" onPress={handleInbound} style={styles.btn} icon="package-down">รับสินค้าเข้าคลัง</Button>
        </Card.Content>
      </Card>

      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text style={styles.summaryTitle}>สรุปสต็อกตามโซน</Text>
          <Text>Zone A: {zoneSummary.A} | Zone B: {zoneSummary.B} | Zone C: {zoneSummary.C}</Text>
        </Card.Content>
      </Card>
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
  summaryCard: { backgroundColor: '#E3F2FD' },
  summaryTitle: { fontWeight: '600', marginBottom: 4 },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 16, color: '#90A4AE' },
});

export default InboundScreen;
