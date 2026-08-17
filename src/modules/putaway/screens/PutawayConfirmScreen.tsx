/**
 * PutawayConfirmScreen - หน้าจอยืนยันการจัดเก็บ
 *
 * Confirm putaway placement screen showing:
 * - Selected bin details (code, zone, aisle, rack, level)
 * - Item being stored (name, quantity)
 * - Temperature zone info if applicable
 * - Current occupancy progress bar
 * - "ยืนยันจัดเก็บ" (Confirm) button
 * - "เปลี่ยนตำแหน่ง" (Change) button to go back to suggestions
 *
 * Requirements: 2.4, 2.5
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Bin, ReceivedItem } from '../types';

interface PutawayConfirmScreenProps {
  bin: Bin;
  item: ReceivedItem & { name: string };
  onConfirmPutaway: (itemId: string, binId: string) => Promise<void>;
  onChangeBin: () => void;
  onGoBack?: () => void;
}

export const PutawayConfirmScreen: React.FC<PutawayConfirmScreenProps> = ({
  bin,
  item,
  onConfirmPutaway,
  onChangeBin,
  onGoBack,
}) => {
  const [confirming, setConfirming] = useState(false);

  const isTemperatureControlled = bin.temperatureControlled;
  const occupancyRatio = bin.capacity > 0 ? bin.currentOccupancy / bin.capacity : 0;
  const occupancyPercentage = Math.min(Math.round(occupancyRatio * 100), 100);

  let occupancyBarColor = '#4CAF50';
  if (occupancyPercentage >= 80) occupancyBarColor = '#F44336';
  else if (occupancyPercentage >= 60) occupancyBarColor = '#FF9800';

  const handleConfirm = useCallback(async () => {
    setConfirming(true);
    try {
      await onConfirmPutaway(item.id, bin.id);
    } finally {
      setConfirming(false);
    }
  }, [onConfirmPutaway, item.id, bin.id]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onGoBack && (
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← กลับ</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>ยืนยันการจัดเก็บ</Text>
          <Text style={styles.headerSubtitle}>ตรวจสอบข้อมูลก่อนยืนยัน</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Bin Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 ตำแหน่งจัดเก็บ</Text>

          <View style={styles.binCodeContainer}>
            <Text style={styles.binCodeLabel}>รหัสตำแหน่ง</Text>
            <Text style={styles.binCodeValue}>{bin.code}</Text>
          </View>

          <View style={styles.detailGrid}>
            <View style={styles.detailGridItem}>
              <Text style={styles.detailLabel}>โซน</Text>
              <Text style={styles.detailValue}>{bin.zone}</Text>
            </View>
            <View style={styles.detailGridItem}>
              <Text style={styles.detailLabel}>ทางเดิน</Text>
              <Text style={styles.detailValue}>{bin.aisle}</Text>
            </View>
            <View style={styles.detailGridItem}>
              <Text style={styles.detailLabel}>ชั้นวาง</Text>
              <Text style={styles.detailValue}>{bin.rack}</Text>
            </View>
            <View style={styles.detailGridItem}>
              <Text style={styles.detailLabel}>ระดับ</Text>
              <Text style={styles.detailValue}>{bin.level}</Text>
            </View>
          </View>

          {/* Temperature Zone */}
          {isTemperatureControlled && bin.temperatureRange && (
            <View style={styles.tempInfoContainer}>
              <Text style={styles.tempInfoText}>
                🌡️ โซนควบคุมอุณหภูมิ: {bin.temperatureRange.min}°C -{' '}
                {bin.temperatureRange.max}°C
              </Text>
            </View>
          )}

          {/* Occupancy Bar */}
          <View style={styles.occupancySection}>
            <View style={styles.occupancyHeader}>
              <Text style={styles.occupancyLabel}>ความจุปัจจุบัน</Text>
              <Text style={styles.occupancyValue}>
                {bin.currentOccupancy}/{bin.capacity} ({occupancyPercentage}%)
              </Text>
            </View>
            <View style={styles.occupancyBarBackground}>
              <View
                style={[
                  styles.occupancyBarFill,
                  {
                    width: `${occupancyPercentage}%`,
                    backgroundColor: occupancyBarColor,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Item Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📦 สินค้าที่จัดเก็บ</Text>

          <View style={styles.itemInfoRow}>
            <Text style={styles.itemInfoLabel}>ชื่อสินค้า</Text>
            <Text style={styles.itemInfoValue}>{item.name}</Text>
          </View>
          <View style={styles.itemInfoRow}>
            <Text style={styles.itemInfoLabel}>SKU</Text>
            <Text style={styles.itemInfoValue}>{item.skuId}</Text>
          </View>
          <View style={styles.itemInfoRow}>
            <Text style={styles.itemInfoLabel}>จำนวน</Text>
            <Text style={styles.itemInfoValue}>{item.quantity} ชิ้น</Text>
          </View>

          {item.temperatureRequirement && (
            <View style={styles.itemTempBadge}>
              <Text style={styles.itemTempBadgeText}>
                🌡️ ต้องการอุณหภูมิ {item.temperatureRequirement.min}°C -{' '}
                {item.temperatureRequirement.max}°C
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
          disabled={confirming}
          accessibilityRole="button"
          accessibilityLabel="ยืนยันจัดเก็บสินค้าที่ตำแหน่งนี้"
        >
          {confirming ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmButtonText}>ยืนยันจัดเก็บ</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.changeButton}
          onPress={onChangeBin}
          disabled={confirming}
          accessibilityRole="button"
          accessibilityLabel="เปลี่ยนตำแหน่งจัดเก็บ"
        >
          <Text style={styles.changeButtonText}>เปลี่ยนตำแหน่ง</Text>
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
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#B3D4FC',
    marginTop: 2,
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
  binCodeContainer: {
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  binCodeLabel: {
    fontSize: 12,
    color: '#1565C0',
    marginBottom: 4,
  },
  binCodeValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1976D2',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailGridItem: {
    width: '50%',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tempInfoContainer: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  tempInfoText: {
    fontSize: 13,
    color: '#1565C0',
    fontWeight: '500',
  },
  occupancySection: {
    marginTop: 16,
  },
  occupancyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  occupancyLabel: {
    fontSize: 13,
    color: '#666',
  },
  occupancyValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  occupancyBarBackground: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  occupancyBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  itemInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemInfoLabel: {
    fontSize: 14,
    color: '#666',
  },
  itemInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  itemTempBadge: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  itemTempBadgeText: {
    fontSize: 13,
    color: '#1565C0',
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  changeButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  changeButtonText: {
    color: '#1976D2',
    fontSize: 16,
    fontWeight: '600',
  },
});
