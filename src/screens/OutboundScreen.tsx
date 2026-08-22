import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Button, TextInput, Card } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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
    setSelectedProduct(0);
    loadData(zone);
  };

  const handleOutbound = async () => {
    if (!selectedProduct) { Toast.show({ type: 'error', text1: 'กรุณาเลือกสินค้า' }); return; }
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { Toast.show({ type: 'error', text1: 'กรุณาระบุจำนวนที่มากกว่า 0' }); return; }
    const prod = availableProducts.find(p => p.id === selectedProduct);
    if (prod && qty > prod.qty) { Toast.show({ type: 'error', text1: `มีเพียง ${prod.qty} หน่วย (ไม่พอจ่าย)` }); return; }
    try {
      await DatabaseService.getInstance().outbound(selectedProduct, fromZone, qty);
      const p = allProducts.find(pr => pr.id === selectedProduct);
      Toast.show({ type: 'success', text1: `จ่าย ${p?.name} ${qty} ${p?.unit} ออกจาก ${fromZone} สำเร็จ` });
      setQuantity('');
      loadData(fromZone);
    } catch (e: any) { Toast.show({ type: 'error', text1: e.message }); }
  };

  const noStock = availableProducts.length === 0;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.formCard}>
        <Card.Content>
          <View style={styles.titleRow}>
            <Icon name="package-up" size={22} color="#D84315" />
            <Text style={styles.formTitle}>จ่ายสินค้าออกจากคลัง</Text>
          </View>

          <Text style={styles.label}>เลือกโซน</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={fromZone} onValueChange={handleZoneChange} style={styles.picker}>
              {ALL_SUB_ZONES.map((z) => <Picker.Item key={z} label={z} value={z} />)}
            </Picker>
          </View>

          {noStock ? (
            <Text style={styles.warning}>* ไม่มีสินค้าในโซนนี้</Text>
          ) : (
            <>
              <Text style={styles.label}>สินค้า</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={selectedProduct} onValueChange={(v) => setSelectedProduct(v)} style={styles.picker}>
                  {availableProducts.map((p) => <Picker.Item key={p.id} label={`${p.id} - ${p.name} (คงเหลือ ${p.qty})`} value={p.id} />)}
                </Picker>
              </View>

              <TextInput
                label="จำนวนที่จ่ายออก"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                dense
              />
            </>
          )}

          <Button
            mode="contained"
            onPress={handleOutbound}
            style={styles.btn}
            icon="package-up"
            disabled={noStock}
            buttonColor="#D84315"
            textColor="#ffffff"
          >
            📤 จ่ายสินค้าออก
          </Button>
        </Card.Content>
      </Card>

      {recentLogs.length > 0 && (
        <Card style={styles.historyCard}>
          <Card.Content>
            <View style={styles.titleRow}>
              <Icon name="history" size={20} color="#546E7A" />
              <Text style={styles.historyTitle}>ประวัติจ่ายออกล่าสุด</Text>
            </View>

            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 2 }]}>สินค้า</Text>
              <Text style={[styles.th, { flex: 1 }]}>จำนวน</Text>
              <Text style={[styles.th, { flex: 1 }]}>โซน</Text>
              <Text style={[styles.th, { flex: 2 }]}>วันเวลา</Text>
            </View>

            {recentLogs.map((log) => (
              <View key={log.id} style={styles.tableRow}>
                <Text style={[styles.td, { flex: 2 }]}>{log.productName || `#${log.productId}`}</Text>
                <Text style={[styles.td, { flex: 1 }]}>{log.quantity}</Text>
                <Text style={[styles.td, { flex: 1 }]}>{log.fromZone}</Text>
                <Text style={[styles.td, { flex: 2, fontSize: 11 }]}>{new Date(log.timestamp).toLocaleString('th-TH')}</Text>
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
  formTitle: { fontSize: 17, fontWeight: '600', color: '#263238' },
  label: { fontSize: 13, fontWeight: '600', color: '#455A64', marginTop: 8, marginBottom: 4 },
  pickerContainer: { backgroundColor: '#F5F5F5', borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 8 },
  picker: { height: 48 },
  input: { marginBottom: 12, backgroundColor: '#fff' },
  btn: { backgroundColor: '#D84315', borderRadius: 8, marginTop: 4 },
  warning: { color: '#E65100', fontSize: 13, marginVertical: 12 },
  historyCard: { borderRadius: 12, elevation: 1 },
  historyTitle: { fontSize: 15, fontWeight: '600', color: '#37474F' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', paddingBottom: 6, marginBottom: 4 },
  th: { fontSize: 12, fontWeight: '600', color: '#78909C' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  td: { fontSize: 13, color: '#37474F' },
});

export default OutboundScreen;
