import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Button, TextInput, Card } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import DatabaseService from '../db/DatabaseService';
import { Product, StockEntry, TransactionLog } from '../types';
import { ALL_SUB_ZONES } from '../constants/zones';

const OutboundScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number>(0);
  const [productStock, setProductStock] = useState<StockEntry[]>([]);
  const [fromZone, setFromZone] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [recentLogs, setRecentLogs] = useState<(TransactionLog & { productName?: string })[]>([]);

  const loadData = useCallback(async () => {
    const db = DatabaseService.getInstance();
    const prods = await db.getAllProducts();
    setProducts(prods);
    if (prods.length > 0 && !selectedProduct) {
      setSelectedProduct(prods[0].id);
      loadProductStock(prods[0].id);
    }
    const logs = await db.getRecentLogs(10);
    setRecentLogs(logs.filter(l => l.type === 'outbound'));
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const loadProductStock = async (productId: number) => {
    const db = DatabaseService.getInstance();
    const stock = await db.getStockByProduct(productId);
    const filtered = stock.filter(s => s.quantity > 0);
    setProductStock(filtered);
    if (filtered.length > 0) setFromZone(filtered[0].zone);
    else setFromZone('');
  };

  const handleProductChange = async (productId: number) => {
    setSelectedProduct(productId);
    await loadProductStock(productId);
  };

  const handleOutbound = async () => {
    if (!selectedProduct) { Toast.show({ type: 'error', text1: 'กรุณาเลือกสินค้า' }); return; }
    if (!fromZone) { Toast.show({ type: 'error', text1: 'กรุณาเลือกโซน' }); return; }
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { Toast.show({ type: 'error', text1: 'กรุณาระบุจำนวนที่มากกว่า 0' }); return; }
    const stockInZone = productStock.find(s => s.zone === fromZone);
    if (stockInZone && qty > stockInZone.quantity) {
      Toast.show({ type: 'error', text1: `มีเพียง ${stockInZone.quantity} หน่วย (ไม่พอจ่าย)` });
      return;
    }
    try {
      await DatabaseService.getInstance().outbound(selectedProduct, fromZone, qty);
      const prod = products.find(p => p.id === selectedProduct);
      Toast.show({ type: 'success', text1: `จ่าย ${prod?.name} ${qty} ${prod?.unit} จาก ${fromZone} สำเร็จ` });
      setQuantity('');
      await loadProductStock(selectedProduct);
      const db = DatabaseService.getInstance();
      const logs = await db.getRecentLogs(10);
      setRecentLogs(logs.filter(l => l.type === 'outbound'));
    } catch (e: any) { Toast.show({ type: 'error', text1: e.message }); }
  };

  const noProducts = products.length === 0;
  const totalStock = productStock.reduce((sum, s) => sum + s.quantity, 0);

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.formCard}>
        <Card.Content>
          <View style={styles.titleRow}>
            <Icon name="package-up" size={22} color="#1565C0" />
            <Text style={styles.formTitle}>เบิกจ่ายสินค้า</Text>
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

          {/* แสดงสต็อกของสินค้าที่เลือก */}
          {productStock.length > 0 && (
            <View style={styles.stockInfo}>
              <Text style={styles.stockInfoTitle}>สินค้านี้มีอยู่ {productStock.length} โซนย่อย (รวม {totalStock} หน่วย)</Text>
              {productStock.map(s => (
                <Text key={s.zone} style={styles.stockInfoItem}>• {s.zone} — {s.quantity} หน่วย</Text>
              ))}
            </View>
          )}

          {productStock.length === 0 && !noProducts && (
            <Text style={styles.warning}>* สินค้านี้ไม่มีสต็อกในโซนใดเลย</Text>
          )}

          {productStock.length > 0 && (
            <>
              <Text style={styles.label}>เบิกจากโซน</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={fromZone}
                  onValueChange={(v) => setFromZone(v)}
                  style={styles.picker}
                >
                  {productStock.map((s) => <Picker.Item key={s.zone} label={`${s.zone} (คงเหลือ ${s.quantity})`} value={s.zone} color="#000" />)}
                </Picker>
              </View>

              <TextInput
                label="จำนวนที่เบิก"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                dense
                textColor="#000"
              />
            </>
          )}

          {noProducts && <Text style={styles.warning}>* เพิ่มสินค้าใน Product Master ก่อน</Text>}

          <Button
            mode="contained"
            onPress={handleOutbound}
            style={styles.btn}
            icon="package-up"
            disabled={noProducts || productStock.length === 0}
            buttonColor="#1565C0"
            textColor="#ffffff"
          >
            เบิกจ่ายสินค้า
          </Button>
        </Card.Content>
      </Card>

      {recentLogs.length > 0 && (
        <Card style={styles.historyCard}>
          <Card.Content>
            <View style={styles.titleRow}>
              <Icon name="history" size={20} color="#546E7A" />
              <Text style={styles.historyTitle}>ประวัติเบิกจ่ายล่าสุด</Text>
            </View>

            {recentLogs.map((log) => (
              <View key={log.id} style={styles.logItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logProduct}>{log.productName || `#${log.productId}`}</Text>
                  <Text style={styles.logDetail}>เบิกจาก {log.fromZone} จำนวน {log.quantity} หน่วย</Text>
                </View>
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
  stockInfo: { backgroundColor: '#E3F2FD', padding: 12, borderRadius: 8, marginBottom: 8 },
  stockInfoTitle: { fontSize: 13, fontWeight: '600', color: '#1565C0', marginBottom: 4 },
  stockInfoItem: { fontSize: 13, color: '#000', paddingLeft: 4, marginTop: 2 },
  historyCard: { borderRadius: 12, elevation: 1 },
  historyTitle: { fontSize: 15, fontWeight: '600', color: '#000' },
  logItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  logProduct: { fontSize: 14, fontWeight: '600', color: '#000' },
  logDetail: { fontSize: 12, color: '#546E7A', marginTop: 2 },
  logTime: { fontSize: 11, color: '#90A4AE' },
});

export default OutboundScreen;
