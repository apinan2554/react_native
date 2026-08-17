import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Card, Text, Button, TextInput, Portal, Modal, FAB, IconButton } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import DatabaseService from '../db/DatabaseService';
import { Product } from '../types';
import { CATEGORIES } from '../constants/zones';

const ProductScreen: React.FC = () => {
  const [products, setProducts] = useState<(Product & { totalStock: number })[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', unit: 'ชิ้น', category: CATEGORIES[0] as Product['category'], description: '', reorderPoint: '0' });

  const loadProducts = useCallback(async () => {
    const db = DatabaseService.getInstance();
    const all = await db.getAllProducts();
    const withStock = await Promise.all(all.map(async (p) => ({
      ...p, totalStock: await db.getTotalStockByProduct(p.id),
    })));
    setProducts(withStock);
  }, []);

  useFocusEffect(useCallback(() => { loadProducts(); }, [loadProducts]));

  const openAdd = () => {
    setEditProduct(null);
    setForm({ name: '', unit: 'ชิ้น', category: CATEGORIES[0] as Product['category'], description: '', reorderPoint: '0' });
    setModalVisible(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({ name: p.name, unit: p.unit, category: p.category as Product['category'], description: p.description, reorderPoint: String(p.reorderPoint) });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Toast.show({ type: 'error', text1: 'กรุณากรอกชื่อสินค้า' }); return; }
    const db = DatabaseService.getInstance();
    try {
      if (editProduct) {
        await db.updateProduct({ ...editProduct, ...form, reorderPoint: parseInt(form.reorderPoint) || 0 });
        Toast.show({ type: 'success', text1: 'แก้ไขสินค้าสำเร็จ' });
      } else {
        await db.addProduct({ ...form, reorderPoint: parseInt(form.reorderPoint) || 0 });
        Toast.show({ type: 'success', text1: 'เพิ่มสินค้าสำเร็จ' });
      }
      setModalVisible(false);
      loadProducts();
    } catch (e: any) { Toast.show({ type: 'error', text1: e.message }); }
  };

  const handleDelete = (p: Product) => {
    Alert.alert('ลบสินค้า', `ต้องการลบ "${p.name}" ?`, [
      { text: 'ยกเลิก' },
      { text: 'ลบ', style: 'destructive', onPress: async () => {
        await DatabaseService.getInstance().deleteProduct(p.id);
        Toast.show({ type: 'success', text1: `ลบ ${p.name} สำเร็จ` });
        loadProducts();
      }},
    ]);
  };

  const renderItem = ({ item }: { item: Product & { totalStock: number } }) => {
    const isLow = item.reorderPoint > 0 && item.totalStock < item.reorderPoint;
    return (
      <Card style={[styles.itemCard, isLow && styles.lowStockCard]}>
        <Card.Content>
          <View style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name} {isLow && '⚠️'}</Text>
              <Text style={styles.itemDetail}>หมวด: {item.category} | หน่วย: {item.unit} | Reorder: {item.reorderPoint}</Text>
              <Text style={styles.itemStock}>สต็อกรวม: {item.totalStock}</Text>
            </View>
            <View style={styles.actions}>
              <IconButton icon="pencil" size={20} onPress={() => openEdit(item)} />
              <IconButton icon="delete" size={20} iconColor="#D32F2F" onPress={() => handleDelete(item)} />
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList data={products} renderItem={renderItem} keyExtractor={(i) => String(i.id)}
        ListEmptyComponent={<Text style={styles.empty}>ยังไม่มีสินค้า</Text>} />
      <FAB icon="plus" style={styles.fab} onPress={openAdd} label="เพิ่มสินค้า" />

      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>{editProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'}</Text>
          <TextInput label="ชื่อสินค้า *" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} mode="outlined" style={styles.input} />
          <TextInput label="หน่วยนับ" value={form.unit} onChangeText={(t) => setForm({ ...form, unit: t })} mode="outlined" style={styles.input} />
          <Text style={styles.pickerLabel}>หมวดหมู่</Text>
          <Picker selectedValue={form.category} onValueChange={(v) => setForm({ ...form, category: v as Product['category'] })} style={styles.picker}>
            {CATEGORIES.map((c) => <Picker.Item key={c} label={c} value={c} />)}
          </Picker>
          <TextInput label="Reorder Point" value={form.reorderPoint} onChangeText={(t) => setForm({ ...form, reorderPoint: t })} keyboardType="numeric" mode="outlined" style={styles.input} />
          <TextInput label="รายละเอียด" value={form.description} onChangeText={(t) => setForm({ ...form, description: t })} mode="outlined" style={styles.input} multiline />
          <Button mode="contained" onPress={handleSave} style={styles.saveBtn}>บันทึก</Button>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECEFF1', padding: 8 },
  itemCard: { marginBottom: 8 },
  lowStockCard: { backgroundColor: '#FFF3E0', borderLeftWidth: 4, borderLeftColor: '#FF9800' },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemName: { fontSize: 16, fontWeight: '600', color: '#37474F' },
  itemDetail: { fontSize: 12, color: '#78909C', marginTop: 2 },
  itemStock: { fontSize: 14, fontWeight: '500', color: '#455A64', marginTop: 4 },
  actions: { flexDirection: 'row' },
  empty: { textAlign: 'center', marginTop: 40, color: '#90A4AE', fontSize: 16 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#607D8B' },
  modal: { backgroundColor: '#fff', margin: 20, padding: 20, borderRadius: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  input: { marginBottom: 10 },
  pickerLabel: { fontSize: 12, color: '#666', marginBottom: 4, marginTop: 4 },
  picker: { marginBottom: 10, backgroundColor: '#F5F5F5' },
  saveBtn: { marginTop: 12, backgroundColor: '#607D8B' },
});

export default ProductScreen;
