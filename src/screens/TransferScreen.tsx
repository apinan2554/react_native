import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Button, TextInput, Card } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import DatabaseService from '../db/DatabaseService';
import { Product } from '../types';
import { ALL_SUB_ZONES } from '../constants/zones';

const TransferScreen: React.FC = () => {
  const [fromZone, setFromZone] = useState<string>(ALL_SUB_ZONES[0]);
  const [toZone, setToZone] = useState<string>(ALL_SUB_ZONES[1]);
  const [availableProducts, setAvailableProducts] = useState<(Product & { qty: number })[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number>(0);
  const [quantity, setQuantity] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  const loadProductsInZone = useCallback(async (zone: string) => {
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
  }, []);

  useFocusEffect(useCallback(() => { loadProductsInZone(fromZone); }, [fromZone, loadProductsInZone]));

  const handleFromZoneChange = (zone: string) => {
    setFromZone(zone);
    setSelectedProduct(0);
    loadProductsInZone(zone);
  };

  const handleTransfer = async () => {
    if (!selectedProduct) { Toast.show({ type: 'error', text1: 'กรุณาเลือกสินค้า' }); return; }
    if (fromZone === toZone) { Toast.show({ type: 'error', text1: 'โซนต้นทางและปลายทางต้องไม่เหมือนกัน' }); return; }
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { Toast.show({ type: 'error', text1: 'กรุณาระบุจำนวนที่มากกว่า 0' }); return; }
    const prod = availableProducts.find(p => p.id === selectedProduct);
    if (prod && qty > prod.qty) { Toast.show({ type: 'error', text1: `มีเพียง ${prod.qty} หน่วย` }); return; }
    try {
      await DatabaseService.getInstance().transfer(selectedProduct, fromZone, toZone, qty);
      const p = allProducts.find(pr => pr.id === selectedProduct);
      Toast.show({ type: 'success', text1: `ย้าย ${p?.name} ${qty} ${p?.unit} ${fromZone} → ${toZone} สำเร็จ` });
      setQuantity('');
      loadProductsInZone(fromZone);
    } catch (e: any) { Toast.show({ type: 'error', text1: e.message }); }
  };

  const noStock = availableProducts.length === 0;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.formCard}>
        <Card.Content>
          <View style={styles.titleRow}>
            <Icon name="swap-horizontal" size={22} color="#00897B" />
            <Text style={styles.formTitle}>ย้ายสินค้าระหว่างโซน</Text>
          </View>

          <Text style={styles.label}>โซนต้นทาง</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={fromZone} onValueChange={handleFromZoneChange} style={styles.picker}>
              {ALL_SUB_ZONES.map((z) => <Picker.Item key={z} label={z} value={z} />)}
            </Picker>
          </View>

          {noStock ? (
            <Text style={styles.warning}>* ไม่มีสินค้าในโซนต้นทาง</Text>
          ) : (
            <>
              <Text style={styles.label}>สินค้า</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={selectedProduct} onValueChange={(v) => setSelectedProduct(v)} style={styles.picker}>
                  {availableProducts.map((p) => <Picker.Item key={p.id} label={`${p.id} - ${p.name} (คงเหลือ ${p.qty})`} value={p.id} />)}
                </Picker>
              </View>

              <Text style={styles.label}>โซนปลายทาง</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={toZone} onValueChange={(v) => setToZone(v)} style={styles.picker}>
                  {ALL_SUB_ZONES.filter(z => z !== fromZone).map((z) => <Picker.Item key={z} label={z} value={z} />)}
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
              />
            </>
          )}

          <Button
            mode="contained"
            onPress={handleTransfer}
            style={styles.btn}
            icon="swap-horizontal"
            disabled={noStock}
            buttonColor="#00897B"
            textColor="#ffffff"
          >
            🔄 ย้ายสินค้า
          </Button>
        </Card.Content>
      </Card>
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
  btn: { backgroundColor: '#00897B', borderRadius: 8, marginTop: 4 },
  warning: { color: '#E65100', fontSize: 13, marginVertical: 12 },
});

export default TransferScreen;
