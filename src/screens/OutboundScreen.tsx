import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Button, TextInput, Card } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import DatabaseService from '../db/DatabaseService';
import { Product, StockEntry, TransactionLog } from '../types';

const OutboundScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number>(0);
  const [productStock, setProductStock] = useState<StockEntry[]>([]);
  const [quantity, setQuantity] = useState('');
  const [recentLogs, setRecentLogs] = useState<(TransactionLog & { productName?: string })[]>([]);
  const [lastOutboundSummary, setLastOutboundSummary] = useState<{ zone: string; qty: number; remaining: number }[] | null>(null);

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
    setProductStock(stock.filter(s => s.quantity > 0));
  };

  const handleProductChange = async (productId: number) => {
    setSelectedProduct(productId);
    setLastOutboundSummary(null);
    await loadProductStock(productId);
  };

  const handleOutbound = async () => {
    if (!selectedProduct) { Toast.show({ type: 'error', text1: 'กรุณาเลือกสินค้า' }); return; }
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { Toast.show({ type: 'error', text1: 'กรุณาระบุจำนวนที่มากกว่า 0' }); return; }

    const totalAvailable = productStock.reduce((sum, s) => sum + s.quantity, 0);
    if (qty > totalAvailable) {
      Toast.show({ type: 'error', text1: `มีทั้งหมดเพียง ${totalAvailable} หน่วย (ไม่พอจ่าย)` });
      return;
    }

    // คำนวณว่าต้องเบิกจากโซนไหนบ้าง (เรียงจากมากไปน้อย)
    const sorted = [...productStock].sort((a, b) => b.quantity - a.quantity);
    let remaining = qty;
    const plan: { zone: string; qty: number; before: number; after: number }[] = [];

    for (const s of sorted) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, s.quantity);
      plan.push({ zone: s.zone, qty: take, before: s.quantity, after: s.quantity - take });
      remaining -= take;
    }

    // สร้างข้อความยืนยัน
    const prod = products.find(p => p.id === selectedProduct);
    const planText = plan.map(p => `• ${p.zone}: เบิก ${p.qty} (เหลือ ${p.after})`).join('\n');
    const message = `เบิก ${prod?.name} จำนวน ${qty} ${prod?.unit}\n\nจากโซน:\n${planText}\n\nยืนยันการเบิกจ่าย?`;

    Alert.alert('ยืนยันการเบิกจ่าย', message, [
      { text: 'ยกเลิก' },
      { text: 'ยืนยัน', onPress: async () => {
        try {
          const db = DatabaseService.getInstance();
          for (const p of plan) {
            await db.outbound(selectedProduct, p.zone, p.qty);
          }
          Toast.show({ type: 'success', text1: `เบิก ${prod?.name} ${qty} ${prod?.unit} สำเร็จ` });

          // แสดงสรุป
          setLastOutboundSummary(plan.map(p => ({ zone: p.zone, qty: p.qty, remaining: p.after })));
          setQuantity('');
          await loadProductStock(selectedProduct);

          const logs = await db.getRecentLogs(10);
          setRecentLogs(logs.filter(l => l.type === 'outbound'));
        } catch (e: any) { Toast.show({ type: 'error', text1: e.message }); }
      }},
    ]);
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

          {productStock.length > 0 && (
            <View style={styles.stockInfo}>
              <Text style={styles.stockInfoTitle}>สินค้านี้มีอยู่ {productStock.length} โซนย่อย (รวม {totalStock} หน่วย)</Text>
              {productStock.sort((a, b) => b.quantity - a.quantity).map(s => (
                <Text key={s.zone} style={styles.stockInfoItem}>• {s.zone} — {s.quantity} หน่วย</Text>
              ))}
            </View>
          )}

          {productStock.length === 0 && !noProducts && (
            <Text style={styles.warning}>* สินค้านี้ไม่มีสต็อกในโซนใดเลย</Text>
          )}

          {productStock.length > 0 && (
            <TextInput
              label="จำนวนที่ต้องการเบิก"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              dense
              textColor="#000"
            />
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

      {/* สรุปการเบิกจ่ายล่าสุด */}
      {lastOutboundSummary && (
        <Card style={styles.summaryCard}>
          <Card.Content>
            <View style={styles.titleRow}>
              <Icon name="check-circle" size={20} color="#2E7D32" />
              <Text style={[styles.formTitle, { color: '#2E7D32' }]}>สรุปการเบิกจ่าย</Text>
            </View>
            {lastOutboundSummary.map((item, i) => (
              <View key={i} style={styles.summaryItem}>
                <Text style={styles.summaryZone}>{item.zone}</Text>
                <Text style={styles.summaryQty}>เบิก {item.qty}</Text>
                <Text style={styles.summaryRemaining}>คงเหลือ {item.remaining}</Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* ประวัติเบิกจ่าย */}
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
  summaryCard: { marginBottom: 12, borderRadius: 12, elevation: 1, backgroundColor: '#E8F5E9' },
  summaryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#C8E6C9', gap: 12 },
  summaryZone: { fontSize: 14, fontWeight: '600', color: '#000', width: 40 },
  summaryQty: { fontSize: 13, color: '#D84315', fontWeight: '500', flex: 1 },
  summaryRemaining: { fontSize: 13, color: '#2E7D32', fontWeight: '500' },
  historyCard: { borderRadius: 12, elevation: 1 },
  historyTitle: { fontSize: 15, fontWeight: '600', color: '#000' },
  logItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  logProduct: { fontSize: 14, fontWeight: '600', color: '#000' },
  logDetail: { fontSize: 12, color: '#546E7A', marginTop: 2 },
  logTime: { fontSize: 11, color: '#90A4AE' },
});

export default OutboundScreen;
