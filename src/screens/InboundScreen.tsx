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
    if (!selectedProduct) { Toast.show({ type: 'error', text1: 'กรุณาเลือกสินค้า' }); return; }
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { Toast.show({ type: 'error', text1: 'กรุณาระบุจำนวนที่มากกว่า 0' }); return; }
    try {
      await DatabaseService.getInstance().inbound(selectedProduct, selectedZone, qty);
      const prod = products.find(p => p.id === selectedProduct);
      Toast.show({ type: 'success', text1: `รับ ${prod?.name} ${qty} ${prod?.unit} เข้า ${selectedZone} สำเร็จ` });
      setQuantity('');
      loadData();
    } catch (e: any) { Toast.show({ type: 'error', text1: e.message }); }
  };

  const noProducts = products.length === 0;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.formCard}>
        <Card.Content>
          <View style={styles.titleRow}>
            <Icon name="package-down" size={22} color="#1565C0" />
            <Text style={styles.formTitle}>รับสินค้าเข้าคลัง</Text>
          </View>

          <Text style={styles.label}>เลือกสินค้า</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedProduct}
              onValueChange={(v) => setSelectedProduct(v)}
              style={styles.picker}
              enabled={!noProducts}
            >
              {products.map((p) => <Picker.Item key={p.id} label={`${p.id} - ${p.name} (${p.unit})`} value={p.id} />)}
            </Picker>
          </View>

          <Text style={styles.label}>เลือกโซน</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedZone} onValueChange={(v) => setSelectedZone(v)} style={styles.picker}>
              {ALL_SUB_ZONES.map((z) => <Picker.Item key={z} label={z} value={z} />)}
            </Picker>
          </View>

          <TextInput
            label="จำนวน"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            dense
          />

          {noProducts && <Text style={styles.warning}>* เพิ่มสินค้าใน Product Master ก่อน</Text>}

          <Button
            mode="contained"
            onPress={handleInbound}
            style={styles.btn}
            icon="package-down"
            disabled={noProducts}
          >
            📥 รับสินค้าเข้าคลัง
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
  formTitle: { fontSize: 17, fontWeight: '600', color: '#263238' },
  label: { fontSize: 13, fontWeight: '600', color: '#455A64', marginTop: 8, marginBottom: 4 },
  pickerContainer: { backgroundColor: '#F5F5F5', borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 8 },
  picker: { height: 48 },
  input: { marginBottom: 12, backgroundColor: '#fff' },
  btn: { backgroundColor: '#1565C0', borderRadius: 8 },
  warning: { color: '#E65100', fontSize: 13, marginBottom: 8 },
  summaryCard: { borderRadius: 12, elevation: 1 },
  summaryTitle: { fontWeight: '600', marginBottom: 12, fontSize: 15, color: '#37474F' },
  zoneRow: { gap: 8 },
  zoneBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10 },
  zoneText: { fontSize: 14, fontWeight: '500', color: '#37474F' },
});

export default InboundScreen;
