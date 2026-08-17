/**
 * GRNListItem - แสดงข้อมูล GRN แต่ละรายการในรายการ
 *
 * Displays a single GRN row with GRN number, date, status, and supplier info.
 * Supports onPress for navigation to detail view.
 *
 * Requirements: 1.4
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GRN } from '../types';

interface GRNListItemProps {
  grn: GRN;
  supplierName?: string;
  onPress: (grn: GRN) => void;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#FFA500',
  confirmed: '#4CAF50',
  discrepancy: '#F44336',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'ร่าง',
  confirmed: 'ยืนยันแล้ว',
  discrepancy: 'คลาดเคลื่อน',
};

export const GRNListItem: React.FC<GRNListItemProps> = ({
  grn,
  supplierName,
  onPress,
}) => {
  const statusColor = STATUS_COLORS[grn.status] ?? '#999';
  const statusLabel = STATUS_LABELS[grn.status] ?? grn.status;
  const dateStr = grn.receivedAt
    ? new Date(grn.receivedAt).toLocaleDateString('th-TH')
    : '-';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(grn)}
      accessibilityRole="button"
      accessibilityLabel={`GRN ${grn.id}, สถานะ ${statusLabel}`}
    >
      <View style={styles.header}>
        <Text style={styles.grnId} numberOfLines={1}>
          GRN: {grn.id}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.detailText}>PO: {grn.poId}</Text>
        {supplierName && (
          <Text style={styles.detailText}>ผู้จัดจำหน่าย: {supplierName}</Text>
        )}
        <Text style={styles.detailText}>วันที่: {dateStr}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.quantityText}>
          รับ {grn.totalQuantityReceived}/{grn.totalQuantityExpected} ชิ้น
        </Text>
        <Text style={styles.receivedBy}>โดย: {grn.receivedBy}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  grnId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  details: {
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 8,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  receivedBy: {
    fontSize: 12,
    color: '#999',
  },
});
