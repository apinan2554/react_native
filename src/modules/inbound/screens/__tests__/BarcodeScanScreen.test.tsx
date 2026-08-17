/**
 * Tests for BarcodeScanScreen
 *
 * Validates Requirements: 1.1
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { BarcodeScanScreen } from '../BarcodeScanScreen';
import { ScannedItemResult } from '../../types';

describe('BarcodeScanScreen', () => {
  const mockScanBarcode = jest.fn<Promise<ScannedItemResult>, [string]>();
  const mockAddToReceivingList = jest.fn();
  const mockGoBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders camera view in scanning state', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <BarcodeScanScreen
          onScanBarcode={mockScanBarcode}
          onAddToReceivingList={mockAddToReceivingList}
          onGoBack={mockGoBack}
        />,
      );
    });

    const root = tree!.root;
    const texts = root.findAllByType('Text' as any);
    const textContents = texts.map((t) => t.props.children);

    expect(textContents).toContain('สแกนบาร์โค้ด');
    expect(textContents).toContain('📷 กล้องสแกนบาร์โค้ด');
  });

  it('shows back button when onGoBack is provided', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <BarcodeScanScreen
          onScanBarcode={mockScanBarcode}
          onAddToReceivingList={mockAddToReceivingList}
          onGoBack={mockGoBack}
        />,
      );
    });

    const root = tree!.root;
    const texts = root.findAllByType('Text' as any);
    const backTexts = texts.filter((t) => t.props.children === '← กลับ');
    expect(backTexts.length).toBe(1);
  });

  it('calls onScanBarcode when scan is triggered', async () => {
    const mockResult: ScannedItemResult = {
      skuId: 'SKU001',
      name: 'Test Product',
      barcode: 'BC123',
      matchedPO: true,
      poId: 'PO001',
      expectedQuantity: 10,
    };
    mockScanBarcode.mockResolvedValue(mockResult);

    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <BarcodeScanScreen
          onScanBarcode={mockScanBarcode}
          onAddToReceivingList={mockAddToReceivingList}
        />,
      );
    });

    const root = tree!.root;
    const scanButton = root.findAll(
      (node) =>
        node.props.accessibilityLabel === 'จำลองการสแกน',
    )[0];

    await act(async () => {
      scanButton.props.onPress();
    });

    expect(mockScanBarcode).toHaveBeenCalledWith('SIMULATED-BARCODE');
  });

  it('displays item details after successful scan', async () => {
    const mockResult: ScannedItemResult = {
      skuId: 'SKU001',
      name: 'สินค้าทดสอบ',
      barcode: 'BC123',
      matchedPO: true,
      poId: 'PO001',
      expectedQuantity: 10,
      category: 'อิเล็กทรอนิกส์',
    };
    mockScanBarcode.mockResolvedValue(mockResult);

    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <BarcodeScanScreen
          onScanBarcode={mockScanBarcode}
          onAddToReceivingList={mockAddToReceivingList}
        />,
      );
    });

    const scanButton = tree!.root.findAll(
      (node) =>
        node.props.accessibilityLabel === 'จำลองการสแกน',
    )[0];

    await act(async () => {
      scanButton.props.onPress();
    });

    const texts = tree!.root.findAllByType('Text' as any);
    const textContents = texts.map((t) => t.props.children);

    expect(textContents).toContain('สินค้าทดสอบ');
    expect(textContents).toContain('SKU001');
  });

  it('shows PO match status after scan', async () => {
    const mockResult: ScannedItemResult = {
      skuId: 'SKU001',
      name: 'Product A',
      barcode: 'BC123',
      matchedPO: true,
      poId: 'PO001',
      expectedQuantity: 5,
    };
    mockScanBarcode.mockResolvedValue(mockResult);

    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <BarcodeScanScreen
          onScanBarcode={mockScanBarcode}
          onAddToReceivingList={mockAddToReceivingList}
        />,
      );
    });

    const scanButton = tree!.root.findAll(
      (node) =>
        node.props.accessibilityLabel === 'จำลองการสแกน',
    )[0];

    await act(async () => {
      scanButton.props.onPress();
    });

    const texts = tree!.root.findAllByType('Text' as any);
    const allTextContent = texts.map((t) =>
      Array.isArray(t.props.children)
        ? t.props.children.join('')
        : String(t.props.children ?? ''),
    );
    const hasPOMatch = allTextContent.some((t) => t.includes('ตรงกับ PO'));
    expect(hasPOMatch).toBe(true);
  });

  it('shows confirm button for valid scanned items', async () => {
    const mockResult: ScannedItemResult = {
      skuId: 'SKU001',
      name: 'Product A',
      barcode: 'BC123',
      matchedPO: true,
      poId: 'PO001',
      expectedQuantity: 5,
    };
    mockScanBarcode.mockResolvedValue(mockResult);

    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <BarcodeScanScreen
          onScanBarcode={mockScanBarcode}
          onAddToReceivingList={mockAddToReceivingList}
        />,
      );
    });

    const scanButton = tree!.root.findAll(
      (node) =>
        node.props.accessibilityLabel === 'จำลองการสแกน',
    )[0];

    await act(async () => {
      scanButton.props.onPress();
    });

    const addButton = tree!.root.findAll(
      (node) =>
        node.props.accessibilityLabel === 'เพิ่มในรายการรับสินค้า' &&
        node.props.onPress !== undefined,
    );
    expect(addButton.length).toBeGreaterThanOrEqual(1);
  });
});
