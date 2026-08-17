/**
 * Tests for FilterBar component
 *
 * Validates Requirements: 1.4
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { FilterBar, FilterValues } from '../FilterBar';

describe('FilterBar', () => {
  const mockOnFilterChange = jest.fn();
  const defaultFilters: FilterValues = {};

  const mockSuppliers = [
    { id: 'sup-1', name: 'ซัพพลายเออร์ A' },
    { id: 'sup-2', name: 'ซัพพลายเออร์ B' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders status filter tabs', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <FilterBar
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );
    });

    const texts = tree!.root.findAllByType('Text' as any);
    const textContents = texts.map((t) => t.props.children);

    expect(textContents).toContain('ทั้งหมด');
    expect(textContents).toContain('ร่าง');
    expect(textContents).toContain('ยืนยัน');
    expect(textContents).toContain('คลาดเคลื่อน');
  });

  it('calls onFilterChange when status tab is tapped', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <FilterBar
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );
    });

    const statusButtons = tree!.root.findAll(
      (node) =>
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.includes('กรองสถานะ'),
    );

    // Tap "ยืนยัน" tab
    const confirmTab = statusButtons.find(
      (btn) => btn.props.accessibilityLabel === 'กรองสถานะ ยืนยัน',
    );

    act(() => {
      confirmTab!.props.onPress();
    });

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      status: 'confirmed',
    });
  });

  it('renders supplier chips when suppliers are provided', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <FilterBar
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          suppliers={mockSuppliers}
        />,
      );
    });

    const texts = tree!.root.findAllByType('Text' as any);
    const textContents = texts.map((t) => t.props.children);

    expect(textContents).toContain('ซัพพลายเออร์ A');
    expect(textContents).toContain('ซัพพลายเออร์ B');
  });

  it('renders date inputs', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <FilterBar
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />,
      );
    });

    const dateFromInput = tree!.root.findAll(
      (node) =>
        node.props.accessibilityLabel === 'วันที่เริ่มต้น' &&
        node.props.onChangeText !== undefined,
    );
    const dateToInput = tree!.root.findAll(
      (node) =>
        node.props.accessibilityLabel === 'วันที่สิ้นสุด' &&
        node.props.onChangeText !== undefined,
    );

    expect(dateFromInput.length).toBeGreaterThanOrEqual(1);
    expect(dateToInput.length).toBeGreaterThanOrEqual(1);
  });

  it('highlights active status tab', () => {
    const filters: FilterValues = { status: 'confirmed' };

    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <FilterBar
          filters={filters}
          onFilterChange={mockOnFilterChange}
        />,
      );
    });

    const confirmTab = tree!.root.findAll(
      (node) =>
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel === 'กรองสถานะ ยืนยัน',
    )[0];

    expect(confirmTab.props.accessibilityState?.selected).toBe(true);
  });
});
