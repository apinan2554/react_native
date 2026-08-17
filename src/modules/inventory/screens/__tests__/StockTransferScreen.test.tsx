/**
 * Tests for StockTransferScreen
 *
 * Validates Requirements: 3.4
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { StockTransferScreen } from '../StockTransferScreen';

describe('StockTransferScreen', () => {
  const mockAvailableBins = [
    { id: 'BIN-A-01', label: 'A-01' },
    { id: 'BIN-A-02', label: 'A-02' },
    { id: 'BIN-B-01', label: 'B-01' },
  ];

  const mockOnTransfer = jest.fn().mockResolvedValue(undefined);
  const mockOnSourceBinChange = jest.fn();

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
        <StockTransferScreen
          skuId="SKU001"
          availableBins={mockAvailableBins}
          onTransfer={mockOnTransfer}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('ย้ายสต็อก');
  });

  it('displays SKU information', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <StockTransferScreen
          skuId="SKU001"
          skuName="สินค้าทดสอบ"
          availableBins={mockAvailableBins}
          onTransfer={mockOnTransfer}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('SKU001');
    expect(allText).toContain('สินค้าทดสอบ');
  });

  it('renders available bins for source and destination selection', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <StockTransferScreen
          skuId="SKU001"
          availableBins={mockAvailableBins}
          onTransfer={mockOnTransfer}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('A-01');
    expect(allText).toContain('A-02');
    expect(allText).toContain('B-01');
  });

  it('shows source stock info when source bin is selected', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <StockTransferScreen
          skuId="SKU001"
          availableBins={mockAvailableBins}
          sourceStock={50}
          onTransfer={mockOnTransfer}
          onSourceBinChange={mockOnSourceBinChange}
        />,
      );
    });

    // Select source bin
    const sourceBtn = tree!.root.findAll(
      (node) =>
        node.props.accessibilityLabel === 'เลือกต้นทาง A-01' &&
        typeof node.props.onPress === 'function',
    );

    expect(sourceBtn.length).toBeGreaterThanOrEqual(1);

    act(() => {
      sourceBtn[0].props.onPress();
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('สต็อกปัจจุบัน');
    expect(allText).toContain('50');
    expect(mockOnSourceBinChange).toHaveBeenCalledWith('BIN-A-01');
  });

  it('renders quantity input field', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <StockTransferScreen
          skuId="SKU001"
          availableBins={mockAvailableBins}
          onTransfer={mockOnTransfer}
        />,
      );
    });

    const quantityInput = tree!.root.findAll(
      (node) => node.props.accessibilityLabel === 'จำนวนที่ต้องการย้าย',
    );

    expect(quantityInput.length).toBeGreaterThanOrEqual(1);
  });

  it('renders reason input field', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <StockTransferScreen
          skuId="SKU001"
          availableBins={mockAvailableBins}
          onTransfer={mockOnTransfer}
        />,
      );
    });

    const reasonInput = tree!.root.findAll(
      (node) => node.props.accessibilityLabel === 'เหตุผลการย้ายสต็อก',
    );

    expect(reasonInput.length).toBeGreaterThanOrEqual(1);
  });

  it('shows error when quantity exceeds source stock', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <StockTransferScreen
          skuId="SKU001"
          availableBins={mockAvailableBins}
          sourceStock={10}
          onTransfer={mockOnTransfer}
          onSourceBinChange={mockOnSourceBinChange}
        />,
      );
    });

    // Select source bin first
    const sourceBtn = tree!.root.findAll(
      (node) =>
        node.props.accessibilityLabel === 'เลือกต้นทาง A-01' &&
        typeof node.props.onPress === 'function',
    );

    act(() => {
      sourceBtn[0].props.onPress();
    });

    // Enter quantity exceeding stock
    const quantityInput = tree!.root.findAll(
      (node) => node.props.accessibilityLabel === 'จำนวนที่ต้องการย้าย',
    )[0];

    act(() => {
      quantityInput.props.onChangeText('20');
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('จำนวนเกินสต็อกที่มีอยู่');
  });

  it('shows error when source and destination bins are the same', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <StockTransferScreen
          skuId="SKU001"
          availableBins={mockAvailableBins}
          onTransfer={mockOnTransfer}
          onSourceBinChange={mockOnSourceBinChange}
        />,
      );
    });

    // Select same bin for source
    const sourceBtn = tree!.root.findAll(
      (node) =>
        node.props.accessibilityLabel === 'เลือกต้นทาง A-01' &&
        typeof node.props.onPress === 'function',
    );
    act(() => {
      sourceBtn[0].props.onPress();
    });

    // Select same bin for destination
    const destBtn = tree!.root.findAll(
      (node) =>
        node.props.accessibilityLabel === 'เลือกปลายทาง A-01' &&
        typeof node.props.onPress === 'function',
    );
    act(() => {
      destBtn[0].props.onPress();
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('ตำแหน่งต้นทางและปลายทางต้องไม่เหมือนกัน');
  });

  it('transfer button is disabled when form is incomplete', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <StockTransferScreen
          skuId="SKU001"
          availableBins={mockAvailableBins}
          onTransfer={mockOnTransfer}
        />,
      );
    });

    const transferButton = tree!.root.findAll(
      (node) =>
        node.props.accessibilityLabel === 'ยืนยันย้ายสต็อก' &&
        node.props.accessibilityRole === 'button',
    );

    expect(transferButton.length).toBeGreaterThanOrEqual(1);
    expect(transferButton[0].props.disabled).toBe(true);
  });

  it('renders back button when onGoBack is provided', () => {
    const mockGoBack = jest.fn();
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <StockTransferScreen
          skuId="SKU001"
          availableBins={mockAvailableBins}
          onTransfer={mockOnTransfer}
          onGoBack={mockGoBack}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('← กลับ');
  });
});
