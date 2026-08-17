/**
 * DamageReportScreen - หน้าจอรายงานสินค้าเสียหาย
 *
 * Allows reporting damaged items with:
 * - Photo capture (camera button + gallery of captured photos)
 * - Reason text input
 * - Quantity input for damaged amount
 * - Save button
 *
 * Requirements: 1.3
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';

interface DamageReportScreenProps {
  itemId: string;
  itemName: string;
  maxQuantity: number;
  onSave: (report: {
    photos: string[];
    reason: string;
    quantity: number;
  }) => void;
  onCapturePhoto: () => Promise<string | null>;
  onGoBack?: () => void;
}

export const DamageReportScreen: React.FC<DamageReportScreenProps> = ({
  itemId,
  itemName,
  maxQuantity,
  onSave,
  onCapturePhoto,
  onGoBack,
}) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [quantity, setQuantity] = useState('1');

  const handleAddPhoto = useCallback(async () => {
    try {
      const photoUri = await onCapturePhoto();
      if (photoUri) {
        setPhotos((prev) => [...prev, photoUri]);
      }
    } catch (error) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถถ่ายรูปได้ กรุณาลองใหม่');
    }
  }, [onCapturePhoto]);

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleQuantityChange = useCallback(
    (text: string) => {
      const num = parseInt(text, 10);
      if (text === '' || (num >= 0 && num <= maxQuantity)) {
        setQuantity(text);
      }
    },
    [maxQuantity],
  );

  const handleSave = useCallback(() => {
    if (photos.length === 0) {
      Alert.alert('กรุณาถ่ายรูป', 'ต้องมีรูปถ่ายอย่างน้อย 1 รูป');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('กรุณาระบุเหตุผล', 'ต้องระบุสาเหตุของความเสียหาย');
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('จำนวนไม่ถูกต้อง', 'กรุณาระบุจำนวนสินค้าเสียหาย');
      return;
    }

    onSave({
      photos,
      reason: reason.trim(),
      quantity: qty,
    });
  }, [photos, reason, quantity, onSave]);

  const isValid =
    photos.length > 0 &&
    reason.trim().length > 0 &&
    parseInt(quantity, 10) > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onGoBack && (
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← กลับ</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>รายงานสินค้าเสียหาย</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Item Info */}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{itemName}</Text>
          <Text style={styles.itemId}>รหัส: {itemId}</Text>
        </View>

        {/* Photo Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            รูปถ่ายความเสียหาย *
          </Text>
          <Text style={styles.sectionHint}>
            ถ่ายรูปสินค้าที่เสียหายอย่างน้อย 1 รูป
          </Text>

          <View style={styles.photoGrid}>
            {photos.map((uri, index) => (
              <View key={`photo-${index}`} style={styles.photoItem}>
                <Image
                  source={{ uri }}
                  style={styles.photoImage}
                  accessibilityLabel={`รูปถ่ายที่ ${index + 1}`}
                />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => handleRemovePhoto(index)}
                  accessibilityLabel={`ลบรูปถ่ายที่ ${index + 1}`}
                >
                  <Text style={styles.removePhotoText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Add Photo Button */}
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={handleAddPhoto}
              accessibilityRole="button"
              accessibilityLabel="ถ่ายรูป"
            >
              <Text style={styles.addPhotoIcon}>📷</Text>
              <Text style={styles.addPhotoText}>ถ่ายรูป</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reason Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>สาเหตุความเสียหาย *</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder="ระบุสาเหตุความเสียหาย เช่น กล่องบุบ, สินค้าแตก"
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            accessibilityLabel="สาเหตุความเสียหาย"
          />
        </View>

        {/* Quantity Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>จำนวนที่เสียหาย *</Text>
          <Text style={styles.sectionHint}>
            สูงสุด {maxQuantity} ชิ้น
          </Text>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => {
                const current = parseInt(quantity, 10) || 0;
                if (current > 1) setQuantity(String(current - 1));
              }}
              accessibilityLabel="ลดจำนวน"
            >
              <Text style={styles.quantityButtonText}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.quantityInput}
              value={quantity}
              onChangeText={handleQuantityChange}
              keyboardType="numeric"
              accessibilityLabel="จำนวนสินค้าเสียหาย"
            />
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => {
                const current = parseInt(quantity, 10) || 0;
                if (current < maxQuantity) setQuantity(String(current + 1));
              }}
              accessibilityLabel="เพิ่มจำนวน"
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!isValid}
          accessibilityRole="button"
          accessibilityLabel="บันทึกรายงานความเสียหาย"
          accessibilityState={{ disabled: !isValid }}
        >
          <Text style={styles.saveButtonText}>บันทึกรายงาน</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#D32F2F',
  },
  backButton: {
    marginRight: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  itemInfo: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemId: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CCC',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  addPhotoIcon: {
    fontSize: 24,
  },
  addPhotoText: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  reasonInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  quantityInput: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 60,
    borderBottomWidth: 2,
    borderBottomColor: '#1976D2',
    paddingVertical: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  saveButton: {
    backgroundColor: '#D32F2F',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
