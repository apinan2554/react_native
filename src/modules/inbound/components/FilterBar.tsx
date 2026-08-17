/**
 * FilterBar - ตัวกรองสำหรับหน้าจอประวัติ GRN
 *
 * Provides filter controls: status tabs, supplier selection, and date range.
 * Calls onFilterChange when any filter value changes.
 *
 * Requirements: 1.4
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { GRNStatus } from '../types';

export interface FilterValues {
  status?: GRNStatus;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface FilterBarProps {
  filters: FilterValues;
  onFilterChange: (filters: FilterValues) => void;
  suppliers?: Array<{ id: string; name: string }>;
}

const STATUS_OPTIONS: Array<{ value: GRNStatus | undefined; label: string }> = [
  { value: undefined, label: 'ทั้งหมด' },
  { value: 'draft', label: 'ร่าง' },
  { value: 'confirmed', label: 'ยืนยัน' },
  { value: 'discrepancy', label: 'คลาดเคลื่อน' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  suppliers = [],
}) => {
  const handleStatusChange = (status: GRNStatus | undefined) => {
    onFilterChange({ ...filters, status });
  };

  const handleSupplierChange = (supplierId: string) => {
    onFilterChange({
      ...filters,
      supplierId: supplierId || undefined,
    });
  };

  const handleDateFromChange = (dateFrom: string) => {
    onFilterChange({ ...filters, dateFrom: dateFrom || undefined });
  };

  const handleDateToChange = (dateTo: string) => {
    onFilterChange({ ...filters, dateTo: dateTo || undefined });
  };

  return (
    <View style={styles.container}>
      {/* Status Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statusRow}
      >
        {STATUS_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.label}
            style={[
              styles.statusTab,
              filters.status === option.value && styles.statusTabActive,
            ]}
            onPress={() => handleStatusChange(option.value)}
            accessibilityRole="button"
            accessibilityLabel={`กรองสถานะ ${option.label}`}
            accessibilityState={{ selected: filters.status === option.value }}
          >
            <Text
              style={[
                styles.statusTabText,
                filters.status === option.value && styles.statusTabTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Supplier Dropdown */}
      {suppliers.length > 0 && (
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>ผู้จัดจำหน่าย:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.supplierRow}
          >
            <TouchableOpacity
              style={[
                styles.supplierChip,
                !filters.supplierId && styles.supplierChipActive,
              ]}
              onPress={() => handleSupplierChange('')}
            >
              <Text
                style={[
                  styles.supplierChipText,
                  !filters.supplierId && styles.supplierChipTextActive,
                ]}
              >
                ทั้งหมด
              </Text>
            </TouchableOpacity>
            {suppliers.map((supplier) => (
              <TouchableOpacity
                key={supplier.id}
                style={[
                  styles.supplierChip,
                  filters.supplierId === supplier.id &&
                    styles.supplierChipActive,
                ]}
                onPress={() => handleSupplierChange(supplier.id)}
              >
                <Text
                  style={[
                    styles.supplierChipText,
                    filters.supplierId === supplier.id &&
                      styles.supplierChipTextActive,
                  ]}
                >
                  {supplier.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Date Range */}
      <View style={styles.dateRow}>
        <View style={styles.dateInput}>
          <Text style={styles.filterLabel}>จาก:</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/YYYY"
            value={filters.dateFrom ?? ''}
            onChangeText={handleDateFromChange}
            accessibilityLabel="วันที่เริ่มต้น"
          />
        </View>
        <View style={styles.dateInput}>
          <Text style={styles.filterLabel}>ถึง:</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/YYYY"
            value={filters.dateTo ?? ''}
            onChangeText={handleDateToChange}
            accessibilityLabel="วันที่สิ้นสุด"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statusRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  statusTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#E0E0E0',
  },
  statusTabActive: {
    backgroundColor: '#1976D2',
  },
  statusTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusTabTextActive: {
    color: '#FFFFFF',
  },
  filterRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  supplierRow: {
    flexDirection: 'row',
  },
  supplierChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#E0E0E0',
  },
  supplierChipActive: {
    backgroundColor: '#1976D2',
  },
  supplierChipText: {
    fontSize: 13,
    color: '#666',
  },
  supplierChipTextActive: {
    color: '#FFFFFF',
  },
  dateRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  dateInput: {
    flex: 1,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
});
