/**
 * StockTransferScreen - หน้าจอย้ายสต็อก
 *
 * Transfer stock between bins screen showing:
 * - Source bin selector (from)
 * - Destination bin selector (to)
 * - SKU display
 * - Quantity input with validation
 * - Current stock display for source bin
 * - Reason text input (optional)
 * - Transfer button with confirmation
 *
 * Requirements: 3.4
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

interface StockTransferScreenProps {
  skuId: string;
  skuName?: string;
  availableBins: { id: string; label: string }[];
  sourceStock?: number;
  onTransfer: (transfer: {
    skuId: string;
    fromBinId: string;
    toBinId: string;
    quantity: number;
    reason?: string;
  }) => Promise<void>;
  onSourceBinChange?: (binId: string) => void;
  onGoBack?: () => void;
}

export const StockTransferScreen: React.FC<StockTransferScreenProps> = ({
  skuId,
  skuName,
  availableBins,
  sourceStock,
  onTransfer,
  onSourceBinChange,
  onGoBack,
}) => {
  const [fromBinId, setFromBinId] = useState('');
  const [toBinId, setToBinId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [transferring, setTransferring] = useState(false);

  const parsedQuantity = parseInt(quantity, 10);
  const isQuantityValid = !isNaN(parsedQuantity) && parsedQuantity > 0;
  const isSamebin = fromBinId !== '' && fromBinId === toBinId;
  const exceedsStock =
    sourceStock !== undefined && isQuantityValid && parsedQuantity > sourceStock;
  const isFormValid =
    fromBinId !== '' &&
    toBinId !== '' &&
    isQuantityValid &&
    !isSamebin &&
    !exceedsStock;

  const handleFromBinSelect = useCallback(
    (binId: string) => {
      setFromBinId(binId);
      onSourceBinChange?.(binId);
    },
    [onSourceBinChange],
  );

  const handleTransfer = useCallback(async () => {
    if (!isFormValid) return;

    Alert.alert(
      'ยืนยันการย้ายสต็อก',
      `ย้าย ${skuId} จำนวน ${parsedQuantity} ชิ้น\nจาก: ${fromBinId}\nไปยัง: ${toBinId}`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ยืนยัน',
          onPress: async () => {
            setTransferring(true);
            try {
              await onTransfer({
                skuId,
                fromBinId,
                toBinId,
                quantity: parsedQuantity,
                reason: reason.trim() || undefined,
              });
              // Reset form on success
              setFromBinId('');
              setToBinId('');
              setQuantity('');
              setReason('');
            } finally {
              setTransferring(false);
            }
          },
        },
      ],
    );
  }, [
    isFormValid,
    skuId,
    parsedQuantity,
    fromBinId,
    toBinId,
    reason,
    onTransfer,
  ]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onGoBack && (
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← กลับ</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>ย้ายสต็อก</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* SKU Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📦 ข้อมูลสินค้า</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>SKU:</Text>
            <Text style={styles.infoValue}>{skuId}</Text>
          </View>
          {skuName && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ชื่อสินค้า:</Text>
              <Text style={styles.infoValue}>{skuName}</Text>
            </View>
          )}
        </View>

        {/* Source Bin */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 ต้นทาง (จาก)</Text>
          <View style={styles.binSelector}>
            {availableBins.map((bin) => (
              <TouchableOpacity
                key={`from-${bin.id}`}
                style={[
                  styles.binOption,
                  fromBinId === bin.id && styles.binOptionSelected,
                ]}
                onPress={() => handleFromBinSelect(bin.id)}
                accessibilityLabel={`เลือกต้นทาง ${bin.label}`}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.binOptionText,
                    fromBinId === bin.id && styles.binOptionTextSelected,
                  ]}
                >
                  {bin.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {sourceStock !== undefined && fromBinId !== '' && (
            <View style={styles.sourceStockInfo}>
              <Text style={styles.sourceStockLabel}>สต็อกปัจจุบัน:</Text>
              <Text style={styles.sourceStockValue}>{sourceStock} ชิ้น</Text>
            </View>
          )}
        </View>

        {/* Destination Bin */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 ปลายทาง (ไปยัง)</Text>
          <View style={styles.binSelector}>
            {availableBins.map((bin) => (
              <TouchableOpacity
                key={`to-${bin.id}`}
                style={[
                  styles.binOption,
                  toBinId === bin.id && styles.binOptionSelected,
                ]}
                onPress={() => setToBinId(bin.id)}
                accessibilityLabel={`เลือกปลายทาง ${bin.label}`}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.binOptionText,
                    toBinId === bin.id && styles.binOptionTextSelected,
                  ]}
                >
                  {bin.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {isSamebin && (
            <Text style={styles.errorText}>
              ตำแหน่งต้นทางและปลายทางต้องไม่เหมือนกัน
            </Text>
          )}
        </View>

        {/* Quantity Input */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 จำนวนที่ต้องการย้าย</Text>
          <TextInput
            style={[styles.quantityInput, exceedsStock && styles.inputError]}
            placeholder="กรอกจำนวน..."
            placeholderTextColor="#999"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            accessibilityLabel="จำนวนที่ต้องการย้าย"
          />
          {exceedsStock && (
            <Text style={styles.errorText}>
              จำนวนเกินสต็อกที่มีอยู่ ({sourceStock} ชิ้น)
            </Text>
          )}
        </View>

        {/* Reason */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📝 เหตุผล (ไม่บังคับ)</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder="ระบุเหตุผลการย้าย..."
            placeholderTextColor="#999"
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            accessibilityLabel="เหตุผลการย้ายสต็อก"
          />
        </View>
      </ScrollView>

      {/* Transfer Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.transferButton, !isFormValid && styles.transferButtonDisabled]}
          onPress={handleTransfer}
          disabled={!isFormValid || transferring}
          accessibilityRole="button"
          accessibilityLabel="ยืนยันย้ายสต็อก"
        >
          {transferring ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.transferButtonText}>ย้ายสต็อก</Text>
          )}
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
    backgroundColor: '#1976D2',
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
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  binSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  binOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  binOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2',
  },
  binOptionText: {
    fontSize: 14,
    color: '#666',
  },
  binOptionTextSelected: {
    color: '#1976D2',
    fontWeight: '600',
  },
  sourceStockInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    padding: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  sourceStockLabel: {
    fontSize: 14,
    color: '#1565C0',
  },
  sourceStockValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
  },
  quantityInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputError: {
    borderColor: '#F44336',
  },
  reasonInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 6,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  transferButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  transferButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  transferButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
