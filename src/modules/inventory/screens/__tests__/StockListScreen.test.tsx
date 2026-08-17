/**
 * Tests for StockListScreen
 *
 * Validates Requirements: 3.1
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { StockListScreen } from '../StockListScreen';
import { StockLevel } from '../../types';

describe('StockListScreen', () => {
  const mockStockLevels: StockLevel[] = [
    {
      skuId: 'SKU001',
      binId: 'BIN-A-01',
      quantity: 100,
      reservedQuantity: 20,
      availableQuantity: 80,
      minThreshold: 10,
      maxThreshold: 200,
      lastUpdated: new Date('2024-01-15'),
      syncStatus: 'synced',
    },
    {
      skuId: 'SKU002',
      binId: 'BIN-B-02',
      quantity: 5,
      reservedQuantity: 2,
      availableQuantity: 3,
      minThreshold: 10,
      maxThreshold: 200,
      lastUpdated: new Date('2024-01-15'),
      syncStatus: 'synced',
    },
    {
      skuId: 'SKU003',
      binId: 'BIN-C-03',
      quantity: 15,
      reservedQuantity: 3,
      availableQuantity: 12,
      minThreshold: 11,
      maxThreshold: 200,
      lastUpdated: new Date('2024-01-15'),
      syncStatus: 'synced',
    },
  ];

  const mockOnRefresh = jest.fn().mockResolvedValue(undefined);
  const mockOnFilterChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function getAllTextContent(root: ReactTestRenderer.ReactTestInstance): string {
    const texts = root.findAllByType('Text' as any);
    return texts
      .map((t) => {
        if (typeof t.props.children === 'string') return t.props.children;
        if (Array.isArray(t.props.children))
          return t.props.children
            .map((c: unknown) => (typeof c === 'string' || typeof c === 'number' ? String(c) : ''))
            .join('');
        if (typeof t.props.children === 'number') return String(t.props.children);
        return '';
      })
      .join(' | ');
  }

  it('renders header with title', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <StockListScreen
          stockLevels={mockStockLevels}
          onRefresh={mockOnRefresh}
          onFilterChange={mockOnFilterChange}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('สต็อกสินค้า');
  });

  it('renders stock items with SKU, bin, quantity, available, reserved', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <StockListScreen
          stockLevels={mockStockLevels}
          onRefresh={mockOnRefresh}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);

    // First item
    expect(allText).toContain('SKU001');
    expect(allText).toContain('BIN-A-01');
    expect(allText).toContain('100');
    expect(allText).toContain('80');
    expect(allText).toContain('20');
  });

  it('shows critical alert badge when stock is below min threshold', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <StockListScreen
          stockLevels={mockStockLevels}
          onRefresh={mockOnRefresh}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);
    // SKU002 has availableQuantity 3 < minThreshold 10 → critical
    expect(allText).toContain('สต็อกต่ำ');
  });

  it('shows warning badge when stock is near low threshold', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <StockListScreen
          stockLevels={mockStockLevels}
          onRefresh={mockOnRefresh}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);
    // SKU003 has availableQuantity 12, minThreshold 11, nearLow = 11*1.2 = 13.2
    // 12 < 13.2 → warning
    expect(allText).toContain('ใกล้ต่ำ');
  });

  it('renders filter inputs for SKU and bin/zone', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <StockListScreen
          stockLevels={mockStockLevels}
          onRefresh={mockOnRefresh}
          onFilterChange={mockOnFilterChange}
        />,
      );
    });

    const textInputs = tree!.root.findAllByType('TextInput' as any);
    expect(textInputs.length).toBeGreaterThanOrEqual(2);

    const skuInput = textInputs.find(
      (input) => input.props.accessibilityLabel === 'ค้นหา SKU',
    );
    const binInput = textInputs.find(
      (input) => input.props.accessibilityLabel === 'กรองตามตำแหน่ง',
    );

    expect(skuInput).toBeDefined();
    expect(binInput).toBeDefined();
  });

  it('filters stock items by SKU search', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <StockListScreen
          stockLevels={mockStockLevels}
          onRefresh={mockOnRefresh}
          onFilterChange={mockOnFilterChange}
        />,
      );
    });

    const skuInput = tree!.root.findAll(
      (node) => node.props.accessibilityLabel === 'ค้นหา SKU',
    )[0];

    act(() => {
      skuInput.props.onChangeText('SKU001');
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('SKU001');
    expect(allText).not.toContain('SKU002');
  });

  it('shows empty state when no items match filter', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <StockListScreen
          stockLevels={mockStockLevels}
          onRefresh={mockOnRefresh}
          onFilterChange={mockOnFilterChange}
        />,
      );
    });

    const skuInput = tree!.root.findAll(
      (node) => node.props.accessibilityLabel === 'ค้นหา SKU',
    )[0];

    act(() => {
      skuInput.props.onChangeText('NONEXISTENT');
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('ไม่พบรายการสต็อก');
  });

  it('renders back button when onGoBack is provided', () => {
    const mockGoBack = jest.fn();
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <StockListScreen
          stockLevels={mockStockLevels}
          onRefresh={mockOnRefresh}
          onGoBack={mockGoBack}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('← กลับ');
  });
});
