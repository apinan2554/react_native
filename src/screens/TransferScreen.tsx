import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Button, TextInput, Card } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import DatabaseService from '../db/DatabaseService';
import { Product, StockEntry } from '../types';
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
    loadProductsInZone(zone);
  };

  const handleTransfer = async () => {
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { Toast.show({ type: 'error', text1: 'กรุณากรอกจำนวนที่มากกว่า 0' }); return; }
    if (!selectedProduct) { Toast.show({ type: 'error', text1: 'กรุณาเลือกสินค้า' }); return; }
    try {
      await DatabaseService.getInstance().transfer(selectedProduct, fromZone, toZone, qty);
      const prod = allProducts.find(p => p.id === selectedProduct);
      Toast.show({ type: 'success', text1: `ย้าย ${prod?.name} ${qty} ${prod?.unit} ${fromZone} → ${toZone} สำเร็จ` });
      setQuantity('');
      loadProductsInZone(fromZone);
    } catch (e: any) { Toast.show({ type: 'error', text1: e.message }); }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.formCard}>
        <Card.Content>
          <Text style={styles.label}>โซนต้นทาง</Text>
          <Picker selectedValue={fromZone} onValueChange={handleFromZoneChange} style={styles.picker}>
            {ALL_SUB_ZONES.map((z) => <Picker.Item key={z} label={z} value={z} />)}
          </Picker>

          {availableProducts.length === 0 ? (
            <Text style={styles.noStock}>ไม่มีสินค้าในโซนต้นทาง</Text>
          ) : (
            <>
              <Text style={styles.label}>เลือกสินค้า</Text>
              <Picker selectedValue={selectedProduct} onValueChange={(v) => setSelectedProduct(v)} style={styles.picker}>
                {availableProducts.map((p) => <Picker.Item key={p.id} label={`${p.name} (คงเหลือ ${p.qty})`} value={p.id} />)}
              </Picker>

              <Text style={styles.label}>โซนปลายทาง</Text>
              <Picker selectedValue={toZone} onValueChange={(v) => setToZone(v)} style={styles.picker}>
                {ALL_SUB_ZONES.filter(z => z !== fromZone).map((z) => <Picker.Item key={z} label={z} value={z} />)}
              </Picker>

              <TextInput label="จำนวน" value={quantity} onChangeText={setQuantity} keyboardType="numeric" mode="outlined" style={styles.input} />
              <Button mode="contained" onPress={handleTransfer} style={styles.btn} icon="swap-horizontal">ย้ายสินค้า</Button>
            </>
          )}
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
  noStock: { textAlign: 'center', color: '#E65100', fontSize: 15, marginVertical: 20 },
});

export default TransferScreen;
