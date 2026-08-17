/**
 * BarcodeScanScreen - หน้าจอสแกนบาร์โค้ด/QR Code
 *
 * Camera-based barcode scanner that:
 * - Shows camera view for scanning barcodes
 * - After scan, displays item details (name, SKU, expected qty)
 * - Shows PO match status
 * - Button to confirm and add to receiving list
 *
 * Requirements: 1.1
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ScannedItemResult } from '../types';

interface BarcodeScanScreenProps {
  onScanBarcode: (code: string) => Promise<ScannedItemResult>;
  onAddToReceivingList: (item: ScannedItemResult) => void;
  onGoBack?: () => void;
}

export const BarcodeScanScreen: React.FC<BarcodeScanScreenProps> = ({
  onScanBarcode,
  onAddToReceivingList,
  onGoBack,
}) => {
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [scannedItem, setScannedItem] = useState<ScannedItemResult | null>(
    null,
  );

  const handleBarcodeScan = useCallback(
    async (code: string) => {
      if (loading || !scanning) return;

      setScanning(false);
      setLoading(true);

      try {
        const result = await onScanBarcode(code);
        setScannedItem(result);
      } catch (error) {
        Alert.alert(
          'เกิดข้อผิดพลาด',
          'ไม่สามารถค้นหาข้อมูลสินค้าได้ กรุณาลองใหม่',
        );
        setScanning(true);
      } finally {
        setLoading(false);
      }
    },
    [loading, scanning, onScanBarcode],
  );

  const handleConfirmAdd = useCallback(() => {
    if (scannedItem) {
      onAddToReceivingList(scannedItem);
      setScannedItem(null);
      setScanning(true);
    }
  }, [scannedItem, onAddToReceivingList]);

  const handleRescan = useCallback(() => {
    setScannedItem(null);
    setScanning(true);
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onGoBack && (
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← กลับ</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>สแกนบาร์โค้ด</Text>
      </View>

      {/* Camera View Area */}
      {scanning && (
        <View style={styles.cameraContainer}>
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.cameraText}>📷 กล้องสแกนบาร์โค้ด</Text>
            <Text style={styles.cameraSubtext}>
              หันกล้องไปที่บาร์โค้ดหรือ QR Code
            </Text>
            {/* Simulated scan button for testing without camera hardware */}
            <TouchableOpacity
              style={styles.simulateScanButton}
              onPress={() => handleBarcodeScan('SIMULATED-BARCODE')}
              accessibilityLabel="จำลองการสแกน"
            >
              <Text style={styles.simulateScanText}>สแกน</Text>
            </TouchableOpacity>
          </View>
          {/* Scan Frame Overlay */}
          <View style={styles.scanFrame} />
        </View>
      )}

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>กำลังค้นหาข้อมูลสินค้า...</Text>
        </View>
      )}

      {/* Scanned Item Details */}
      {scannedItem && !loading && (
        <View style={styles.resultContainer}>
          <View style={styles.itemCard}>
            <Text style={styles.itemName}>
              {scannedItem.name || 'ไม่พบข้อมูลสินค้า'}
            </Text>

            {scannedItem.skuId ? (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>SKU:</Text>
                  <Text style={styles.detailValue}>{scannedItem.skuId}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>บาร์โค้ด:</Text>
                  <Text style={styles.detailValue}>{scannedItem.barcode}</Text>
                </View>
                {scannedItem.category && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>หมวดหมู่:</Text>
                    <Text style={styles.detailValue}>
                      {scannedItem.category}
                    </Text>
                  </View>
                )}
                {scannedItem.expectedQuantity !== undefined && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>จำนวนที่คาดหวัง:</Text>
                    <Text style={styles.detailValue}>
                      {scannedItem.expectedQuantity} ชิ้น
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.notFoundText}>
                ไม่พบสินค้าที่ตรงกับบาร์โค้ดนี้
              </Text>
            )}

            {/* PO Match Status */}
            <View style={styles.poStatusContainer}>
              {scannedItem.matchedPO ? (
                <View style={styles.poMatchBadge}>
                  <Text style={styles.poMatchText}>
                    ✓ ตรงกับ PO: {scannedItem.poId}
                  </Text>
                </View>
              ) : (
                <View style={styles.poNoMatchBadge}>
                  <Text style={styles.poNoMatchText}>
                    ✗ ไม่พบ PO ที่ตรงกัน
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {scannedItem.skuId && (
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmAdd}
                accessibilityRole="button"
                accessibilityLabel="เพิ่มในรายการรับสินค้า"
              >
                <Text style={styles.confirmButtonText}>
                  เพิ่มในรายการรับสินค้า
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={handleRescan}
              accessibilityRole="button"
              accessibilityLabel="สแกนใหม่"
            >
              <Text style={styles.rescanButtonText}>สแกนใหม่</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraPlaceholder: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  cameraText: {
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  cameraSubtext: {
    fontSize: 14,
    color: '#AAA',
    marginBottom: 24,
  },
  simulateScanButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  simulateScanText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scanFrame: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#1976D2',
    borderRadius: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  resultContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  itemCard: {
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
  itemName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  notFoundText: {
    fontSize: 14,
    color: '#F44336',
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  poStatusContainer: {
    marginTop: 12,
  },
  poMatchBadge: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
  },
  poMatchText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  poNoMatchBadge: {
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
  },
  poNoMatchText: {
    color: '#E65100',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
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
  rescanButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  rescanButtonText: {
    color: '#1976D2',
    fontSize: 16,
    fontWeight: '600',
  },
});
