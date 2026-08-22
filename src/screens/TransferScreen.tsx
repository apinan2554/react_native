import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Button, TextInput, Card } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import DatabaseService from '../db/DatabaseService';
import { Product, StockEntry } from '../types';
import { ALL_SUB_ZONES } from '../constants/zones';

const TransferScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number>(0);
  const [productStock, setProductStock] = useState<StockEntry[]>([]);
  const [fromZone, setFromZone] = useState<string>('');
  const [toZone, setToZone] = useState<string>(ALL_SUB_ZONES[0]);
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

  // เมื่อเลือกสินค้า → โหลดว่าอยู่โซนไหนบ้าง
  const handleProductChange = async (productId: number) => {
    setSelectedProduct(productId);
    setFromZone('');
    const db = DatabaseService.getInstance();
    const stock = await db.getStockByProduct(productId);
    setProductStock(stock.filter(s => s.quantity > 0));
    if (stock.length > 0) setFromZone(stock[0].zone);
  };

  const handleTransfer = async () => {
    if (!selectedProduct) { Toast.show({ type: 'error', text1: 'กรุณาเลือกสินค้า' }); return; }
    if (!fromZone) { Toast.show({ type: 'error', text1: 'กรุณาเลือกโซนต้นทาง' }); return; }
    if (fromZone === toZone) { Toast.show({ type: 'error', text1: 'โซนต้นทางและปลายทางต้องไม่เหมือนกัน' }); return; }
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { Toast.show({ type: 'error', text1: 'กรุณาระบุจำนวนที่มากกว่า 0' }); return; }
    const stockInZone = productStock.find(s => s.zone === fromZone);
    if (stockInZone && qty > stockInZone.quantity) { Toast.show({ type: 'error', text1: `มีเพียง ${stockInZone.quantity} หน่วย` }); return; }
    try {
      await DatabaseService.getInstance().transfer(selectedProduct, fromZone, toZone, qty);
      const prod = products.find(p => p.id === selectedProduct);
      Toast.show({ type: 'success', text1: `ย้าย ${prod?.name} ${qty} ${prod?.unit} ${fromZone} → ${toZone} สำเร็จ` });
      setQuantity('');
      handleProductChange(selectedProduct);
      loadData();
    } catch (e: any) { Toast.show({ type: 'error', text1: e.message }); }
  };

  const noProducts = products.length === 0;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.formCard}>
        <Card.Content>
          <View style={styles.titleRow}>
            <Icon name="swap-horizontal" size={22} color="#1565C0" />
            <Text style={styles.formTitle}>โอนย้ายสินค้า</Text>
          </View>

          <Text style={styles.label}>เลือกสินค้า</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedProduct}
              onValueChange={(v) => handleProductChange(v)}
              style={styles.picker}
              enabled={!noProducts}
            >
              {products.map((p) => <Picker.Item key={p.id} label={`${p.id} - ${p.name} (${p.unit})`} value={p.id} color="#000" />)}
            </Picker>
          </View>

          {productStock.length > 0 && (
            <View style={styles.stockInfo}>
              <Text style={styles.stockInfoTitle}>สินค้านี้อยู่ในโซน:</Text>
              {productStock.map(s => (
                <Text key={s.zone} style={styles.stockInfoItem}>• {s.zone} — {s.quantity} หน่วย</Text>
              ))}
            </View>
          )}

          <Text style={styles.label}>โซนต้นทาง (ย้ายออกจาก)</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={fromZone}
              onValueChange={(v) => setFromZone(v)}
              style={styles.picker}
              enabled={productStock.length > 0}
            >
              {productStock.map((s) => <Picker.Item key={s.zone} label={`${s.zone} (คงเหลือ ${s.quantity})`} value={s.zone} color="#000" />)}
            </Picker>
          </View>

          <Text style={styles.label}>โซนปลายทาง (ย้ายไป)</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={toZone}
              onValueChange={(v) => setToZone(v)}
              style={styles.picker}
            >
              {ALL_SUB_ZONES.filter(z => z !== fromZone).map((z) => <Picker.Item key={z} label={z} value={z} color="#000" />)}
            </Picker>
          </View>

          <TextInput
            label="จำนวนที่ย้าย"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            dense
            textColor="#000"
          />

          {noProducts && <Text style={styles.warning}>* เพิ่มสินค้าใน Product Master ก่อน</Text>}
          {!noProducts && productStock.length === 0 && <Text style={styles.warning}>* สินค้านี้ยังไม่มีสต็อกในโซนใดเลย</Text>}

          <Button
            mode="contained"
            onPress={handleTransfer}
            style={styles.btn}
            icon="swap-horizontal"
            disabled={noProducts || productStock.length === 0}
            buttonColor="#1565C0"
            textColor="#ffffff"
          >
            ย้ายสินค้า
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text style={styles.summaryTitle}>📊 สรุปสินค้าในแต่ละโซนหลัก</Text>
          <View style={styles.zoneRow}>
            <View style={[styles.zoneBadge, { backgroundColor: '#E3F2FD' }]}>
              <Icon name="alpha-a-circle" size={20} color="#1565C0" />
              <Text style={styles.zoneText}>Zone A — {zoneSummary.A} หน่วย</Text>
            </View>
            <View style={[styles.zoneBadge, { backgroundColor: '#E8F5E9' }]}>
              <Icon name="alpha-b-circle" size={20} color="#2E7D32" />
              <Text style={styles.zoneText}>Zone B — {zoneSummary.B} หน่วย</Text>
            </View>
            <View style={[styles.zoneBadge, { backgroundColor: '#EDE7F6' }]}>
              <Icon name="alpha-c-circle" size={20} color="#4527A0" />
              <Text style={styles.zoneText}>Zone C — {zoneSummary.C} หน่วย</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 12 },
  formCard: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  formTitle: { fontSize: 17, fontWeight: '600', color: '#000' },
  label: { fontSize: 13, fontWeight: '600', color: '#000', marginTop: 8, marginBottom: 4 },
  pickerContainer: { backgroundColor: '#F5F5F5', borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 8, justifyContent: 'center' },
  picker: { height: 52, color: '#000' },
  input: { marginBottom: 12, backgroundColor: '#fff' },
  btn: { borderRadius: 8, marginTop: 4 },
  warning: { color: '#E65100', fontSize: 13, marginVertical: 8 },
  stockInfo: { backgroundColor: '#F5F5F5', padding: 10, borderRadius: 8, marginBottom: 8 },
  stockInfoTitle: { fontSize: 12, fontWeight: '600', color: '#455A64', marginBottom: 4 },
  stockInfoItem: { fontSize: 13, color: '#000', paddingLeft: 4 },
  summaryCard: { borderRadius: 12, elevation: 1 },
  summaryTitle: { fontWeight: '600', marginBottom: 12, fontSize: 15, color: '#000' },
  zoneRow: { gap: 8 },
  zoneBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10 },
  zoneText: { fontSize: 14, fontWeight: '500', color: '#000' },
});

export default TransferScreen;
