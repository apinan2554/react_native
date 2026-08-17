/**
 * BinSuggestionScreen - หน้าจอแนะนำตำแหน่งจัดเก็บ
 *
 * Shows bin suggestions for an item that was just received:
 * - Header with received item info (name, SKU, quantity)
 * - Badges for fast-moving or temperature-controlled items
 * - List of suggested bins sorted by score (best first)
 * - Each bin shows: bin code, zone, score, reason text, occupancy bar
 * - First bin marked as "แนะนำ" (recommended), others as "ทางเลือก" (alternative)
 * - Button to select a bin → navigates to confirmation
 *
 * Requirements: 2.1, 2.4, 2.5
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { BinSuggestion, ReceivedItem } from '../types';

interface BinSuggestionScreenProps {
  item: ReceivedItem & { name: string };
  suggestions: BinSuggestion[];
  onSelectBin: (suggestion: BinSuggestion) => void;
  onGoBack?: () => void;
}

export const BinSuggestionScreen: React.FC<BinSuggestionScreenProps> = ({
  item,
  suggestions,
  onSelectBin,
  onGoBack,
}) => {
  const isFastMoving = item.movementRate === 'fast';
  const isTemperatureControlled = !!item.temperatureRequirement;

  const sortedSuggestions = [...suggestions].sort((a, b) => b.score - a.score);

  const renderOccupancyBar = (current: number, capacity: number) => {
    const ratio = capacity > 0 ? current / capacity : 0;
    const percentage = Math.min(Math.round(ratio * 100), 100);

    let barColor = '#4CAF50';
    if (percentage >= 80) barColor = '#F44336';
    else if (percentage >= 60) barColor = '#FF9800';

    return (
      <View style={styles.occupancyContainer}>
        <View style={styles.occupancyBarBackground}>
          <View
            style={[
              styles.occupancyBarFill,
              { width: `${percentage}%`, backgroundColor: barColor },
            ]}
          />
        </View>
        <Text style={styles.occupancyText}>
          {current}/{capacity} ({percentage}%)
        </Text>
      </View>
    );
  };

  const renderSuggestionItem = ({
    item: suggestion,
    index,
  }: {
    item: BinSuggestion;
    index: number;
  }) => {
    const isRecommended = index === 0;

    return (
      <View
        style={[styles.binCard, isRecommended && styles.binCardRecommended]}
        accessibilityLabel={`ตำแหน่ง ${suggestion.bin.code} โซน ${suggestion.bin.zone} คะแนน ${suggestion.score}`}
      >
        {/* Badge */}
        <View style={styles.binCardHeader}>
          <View
            style={[
              styles.badge,
              isRecommended ? styles.badgeRecommended : styles.badgeAlternative,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isRecommended
                  ? styles.badgeTextRecommended
                  : styles.badgeTextAlternative,
              ]}
            >
              {isRecommended ? 'แนะนำ' : 'ทางเลือก'}
            </Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>คะแนน</Text>
            <Text style={styles.scoreValue}>{suggestion.score.toFixed(1)}</Text>
          </View>
        </View>

        {/* Bin Details */}
        <View style={styles.binDetails}>
          <View style={styles.binCodeRow}>
            <Text style={styles.binCode}>{suggestion.bin.code}</Text>
            <Text style={styles.binZone}>โซน {suggestion.bin.zone}</Text>
          </View>

          <Text style={styles.reasonText}>{suggestion.reason}</Text>

          {/* Occupancy */}
          {renderOccupancyBar(
            suggestion.bin.currentOccupancy,
            suggestion.bin.capacity,
          )}
        </View>

        {/* Select Button */}
        <TouchableOpacity
          style={[
            styles.selectButton,
            isRecommended
              ? styles.selectButtonRecommended
              : styles.selectButtonAlternative,
          ]}
          onPress={() => onSelectBin(suggestion)}
          accessibilityRole="button"
          accessibilityLabel={`เลือกตำแหน่ง ${suggestion.bin.code}`}
        >
          <Text
            style={[
              styles.selectButtonText,
              isRecommended
                ? styles.selectButtonTextRecommended
                : styles.selectButtonTextAlternative,
            ]}
          >
            เลือกตำแหน่งนี้
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

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
          <Text style={styles.headerTitle}>แนะนำตำแหน่งจัดเก็บ</Text>
          <Text style={styles.headerSubtitle}>เลือกตำแหน่งที่เหมาะสม</Text>
        </View>
      </View>

      {/* Item Info Card */}
      <View style={styles.itemInfoCard}>
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={styles.itemDetailRow}>
          <Text style={styles.itemDetailLabel}>SKU:</Text>
          <Text style={styles.itemDetailValue}>{item.skuId}</Text>
        </View>
        <View style={styles.itemDetailRow}>
          <Text style={styles.itemDetailLabel}>จำนวน:</Text>
          <Text style={styles.itemDetailValue}>{item.quantity} ชิ้น</Text>
        </View>

        {/* Item Badges */}
        <View style={styles.itemBadges}>
          {isFastMoving && (
            <View style={styles.fastMovingBadge}>
              <Text style={styles.fastMovingBadgeText}>
                ⚡ สินค้าเคลื่อนไหวเร็ว
              </Text>
            </View>
          )}
          {isTemperatureControlled && (
            <View style={styles.tempBadge}>
              <Text style={styles.tempBadgeText}>
                🌡️ ควบคุมอุณหภูมิ ({item.temperatureRequirement!.min}°-
                {item.temperatureRequirement!.max}°C)
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Suggestions List */}
      <FlatList
        data={sortedSuggestions}
        renderItem={renderSuggestionItem}
        keyExtractor={(suggestion) => suggestion.bin.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={styles.listHeader}>
            ตำแหน่งที่แนะนำ ({sortedSuggestions.length} ตำแหน่ง)
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              ไม่พบตำแหน่งที่เหมาะสมในขณะนี้
            </Text>
          </View>
        }
      />
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
  itemInfoCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  itemDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  itemDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  itemBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 8,
  },
  fastMovingBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fastMovingBadgeText: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '600',
  },
  tempBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tempBadgeText: {
    fontSize: 12,
    color: '#1565C0',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  listHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    marginTop: 8,
  },
  binCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  binCardRecommended: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  binCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeRecommended: {
    backgroundColor: '#E8F5E9',
  },
  badgeAlternative: {
    backgroundColor: '#F5F5F5',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextRecommended: {
    color: '#2E7D32',
  },
  badgeTextAlternative: {
    color: '#666',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#888',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976D2',
  },
  binDetails: {
    marginBottom: 12,
  },
  binCodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  binCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  binZone: {
    fontSize: 13,
    color: '#666',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reasonText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 10,
    lineHeight: 18,
  },
  occupancyContainer: {
    marginTop: 4,
  },
  occupancyBarBackground: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  occupancyBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  occupancyText: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  selectButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonRecommended: {
    backgroundColor: '#4CAF50',
  },
  selectButtonAlternative: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectButtonTextRecommended: {
    color: '#FFFFFF',
  },
  selectButtonTextAlternative: {
    color: '#1976D2',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
  },
});
