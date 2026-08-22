import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Card, Text, Button, TextInput, Portal, Modal, IconButton, Chip } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import DatabaseService from '../db/DatabaseService';
import { Product } from '../types';
import { CATEGORIES } from '../constants/zones';

const ProductScreen: React.FC = () => {
  const [products, setProducts] = useState<(Product & { totalStock: number })[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  // Add form state
  const [addId, setAddId] = useState('');
  const [addName, setAddName] = useState('');
  const [addCategory, setAddCategory] = useState<Product['category']>(CATEGORIES[0] as Product['category']);

  // Edit form state
  const [editForm, setEditForm] = useState({ name: '', unit: 'ชิ้น', category: CATEGORIES[0] as Product['category'], description: '', reorderPoint: '0' });

  const loadProducts = useCallback(async () => {
    const db = DatabaseService.getInstance();
    const all = await db.getAllProducts();
    const withStock = await Promise.all(all.map(async (p) => ({
      ...p, totalStock: await db.getTotalStockByProduct(p.id),
    })));
    setProducts(withStock);
  }, []);

  useFocusEffect(useCallback(() => { loadProducts(); }, [loadProducts]));

  const handleAdd = async () => {
    if (!addName.trim()) {
      Toast.show({ type: 'error', text1: 'กรุณากรอกข้อมูลให้ครบ' });
      return;
    }
    const db = DatabaseService.getInstance();
    try {
      await db.addProduct({ name: addName.trim(), unit: 'ชิ้น', category: addCategory, description: '', reorderPoint: 0 });
      Toast.show({ type: 'success', text1: `เพิ่ม ${addName.trim()} สำเร็จ` });
      setAddId('');
      setAddName('');
      setAddCategory(CATEGORIES[0] as Product['category']);
      loadProducts();
    } catch (e: any) { Toast.show({ type: 'error', text1: e.message }); }
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setEditForm({ name: p.name, unit: p.unit, category: p.category, description: p.description, reorderPoint: String(p.reorderPoint) });
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editProduct) return;
    if (!editForm.name.trim()) { Toast.show({ type: 'error', text1: 'กรุณากรอกชื่อสินค้า' }); return; }
    const db = DatabaseService.getInstance();
    try {
      await db.updateProduct({ ...editProduct, ...editForm, reorderPoint: parseInt(editForm.reorderPoint) || 0 });
      Toast.show({ type: 'success', text1: 'แก้ไขสินค้าสำเร็จ' });
      setEditModalVisible(false);
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
    const isLow = item.reorderPoint > 0 && item.totalStock <= item.reorderPoint;
    return (
      <Card style={[styles.itemCard, isLow && styles.lowStockCard]}>
        <View style={styles.itemRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemId}>#{item.id}</Text>
              <Text style={styles.itemName}>{item.name}</Text>
              {isLow && <Icon name="alert" size={16} color="#FF6D00" />}
            </View>
            <Text style={styles.itemDetail}>
              {item.category} | {item.unit} | Reorder: {item.reorderPoint} | Stock: {item.totalStock}
            </Text>
          </View>
          <View style={styles.actions}>
            <IconButton icon="pencil" size={20} iconColor="#1565C0" onPress={() => openEdit(item)} />
            <IconButton icon="delete" size={20} iconColor="#D32F2F" onPress={() => handleDelete(item)} />
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Add Form */}
      <Card style={styles.formCard}>
        <Card.Content>
          <Text style={styles.formTitle}>➕ เพิ่มสินค้า</Text>
          <TextInput
            label="รหัสสินค้า"
            value={addId}
            onChangeText={setAddId}
            mode="outlined"
            style={styles.input}
            dense
            textColor="#000"
            outlineColor="#E0E0E0"
            activeOutlineColor="#1565C0"
          />
          <TextInput
            label="ชื่อสินค้า"
            value={addName}
            onChangeText={setAddName}
            mode="outlined"
            style={styles.input}
            dense
            textColor="#000"
            outlineColor="#E0E0E0"
            activeOutlineColor="#1565C0"
          />
          <Text style={styles.pickerLabel}>ประเภท</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={addCategory} onValueChange={(v) => setAddCategory(v as Product['category'])} style={[styles.picker, { color: '#000' }]}>
              {CATEGORIES.map((c) => <Picker.Item key={c} label={c} value={c} color="#000" />)}
            </Picker>
          </View>
          <Button mode="contained" onPress={handleAdd} style={styles.addBtn} icon="plus" buttonColor="#1565C0" textColor="#ffffff">
            เพิ่มสินค้า
          </Button>
        </Card.Content>
      </Card>

      {/* Product List */}
      <Text style={styles.listTitle}>📋 รายการสินค้า ({products.length})</Text>
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(i) => String(i.id)}
        ListEmptyComponent={<Text style={styles.empty}>ยังไม่มีสินค้า</Text>}
      />

      {/* Edit Modal */}
      <Portal>
        <Modal visible={editModalVisible} onDismiss={() => setEditModalVisible(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>✏️ แก้ไขสินค้า</Text>
          <TextInput label="ชื่อสินค้า" value={editForm.name} onChangeText={(t) => setEditForm({ ...editForm, name: t })} mode="outlined" style={styles.input} dense />
          <Text style={styles.pickerLabel}>ประเภท</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v as Product['category'] })} style={styles.picker}>
              {CATEGORIES.map((c) => <Picker.Item key={c} label={c} value={c} />)}
            </Picker>
          </View>
          <TextInput label="หน่วยนับ" value={editForm.unit} onChangeText={(t) => setEditForm({ ...editForm, unit: t })} mode="outlined" style={styles.input} dense />
          <TextInput label="Reorder Point" value={editForm.reorderPoint} onChangeText={(t) => setEditForm({ ...editForm, reorderPoint: t })} keyboardType="numeric" mode="outlined" style={styles.input} dense />
          <TextInput label="รายละเอียด" value={editForm.description} onChangeText={(t) => setEditForm({ ...editForm, description: t })} mode="outlined" style={styles.input} multiline dense />
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setEditModalVisible(false)} style={styles.cancelBtn} textColor="#546E7A">ยกเลิก</Button>
            <Button mode="contained" onPress={handleSaveEdit} style={styles.saveBtn} buttonColor="#1565C0" textColor="#ffffff">บันทึก</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 12 },
  formCard: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  formTitle: { fontSize: 16, fontWeight: '600', color: '#37474F', marginBottom: 10 },
  input: { marginBottom: 8, backgroundColor: '#fff' },
  pickerLabel: { fontSize: 12, color: '#666', marginBottom: 4, marginTop: 4 },
  pickerContainer: { backgroundColor: '#F5F5F5', borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 8, justifyContent: 'center' },
  picker: { height: 52, color: '#000' },
  addBtn: { marginTop: 4, backgroundColor: '#1565C0', borderRadius: 8 },
  listTitle: { fontSize: 15, fontWeight: '600', color: '#455A64', marginBottom: 8 },
  itemCard: { marginBottom: 8, borderRadius: 10, elevation: 1 },
  lowStockCard: { backgroundColor: '#FFF3E0', borderLeftWidth: 4, borderLeftColor: '#FF9800' },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemId: { fontSize: 12, color: '#fff', fontWeight: '600', backgroundColor: '#90CAF9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  itemName: { fontSize: 15, fontWeight: '600', color: '#000' },
  itemDetail: { fontSize: 12, color: '#78909C', marginTop: 4 },
  actions: { flexDirection: 'row' },
  empty: { textAlign: 'center', marginTop: 40, color: '#90A4AE', fontSize: 15 },
  modal: { backgroundColor: '#fff', margin: 20, padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#263238' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  cancelBtn: { borderColor: '#90A4AE' },
  saveBtn: { backgroundColor: '#1565C0' },
});

export default ProductScreen;
