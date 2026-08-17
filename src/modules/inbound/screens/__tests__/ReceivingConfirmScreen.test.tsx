/**
 * Tests for ReceivingConfirmScreen
 *
 * Validates Requirements: 1.2, 1.6
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { ReceivingConfirmScreen } from '../ReceivingConfirmScreen';

describe('ReceivingConfirmScreen', () => {
  const mockItems = [
    {
      id: 'item-1',
      skuId: 'SKU001',
      name: 'สินค้า A',
      expectedQuantity: 10,
      receivedQuantity: 10,
      isDamaged: false,
    },
    {
      id: 'item-2',
      skuId: 'SKU002',
      name: 'สินค้า B',
      expectedQuantity: 5,
      receivedQuantity: 3,
      isDamaged: false,
    },
  ];

  const mockQuantityChange = jest.fn();
  const mockMarkDamaged = jest.fn();
  const mockConfirmReceiving = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders item list with expected vs received quantities', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <ReceivingConfirmScreen
          poId="PO001"
          items={mockItems}
          onQuantityChange={mockQuantityChange}
          onMarkDamaged={mockMarkDamaged}
          onConfirmReceiving={mockConfirmReceiving}
        />,
      );
    });

    const root = tree!.root;
    const texts = root.findAllByType('Text' as any);
    const textContents = texts.map((t) => t.props.children);

    expect(textContents).toContain('ยืนยันรับสินค้า');
    expect(textContents).toContain('สินค้า A');
    expect(textContents).toContain('สินค้า B');
  });

  it('shows discrepancy warning when quantities do not match', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <ReceivingConfirmScreen
          poId="PO001"
          items={mockItems}
          onQuantityChange={mockQuantityChange}
          onMarkDamaged={mockMarkDamaged}
          onConfirmReceiving={mockConfirmReceiving}
        />,
      );
    });

    const root = tree!.root;
    const texts = root.findAllByType('Text' as any);
    const discrepancyTexts = texts.filter(
      (t) =>
        typeof t.props.children === 'string' &&
        t.props.children.includes('คลาดเคลื่อน'),
    );

    expect(discrepancyTexts.length).toBeGreaterThan(0);
  });

  it('shows no discrepancy banner when all quantities match', () => {
    const matchingItems = [
      {
        id: 'item-1',
        skuId: 'SKU001',
        name: 'สินค้า A',
        expectedQuantity: 10,
        receivedQuantity: 10,
        isDamaged: false,
      },
    ];

    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <ReceivingConfirmScreen
          poId="PO001"
          items={matchingItems}
          onQuantityChange={mockQuantityChange}
          onMarkDamaged={mockMarkDamaged}
          onConfirmReceiving={mockConfirmReceiving}
        />,
      );
    });

    const root = tree!.root;
    const texts = root.findAllByType('Text' as any);
    const bannerTexts = texts.filter(
      (t) =>
        typeof t.props.children === 'string' &&
        t.props.children.includes('พบความคลาดเคลื่อนระหว่าง'),
    );

    expect(bannerTexts.length).toBe(0);
  });

  it('shows damage report button for each item', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <ReceivingConfirmScreen
          poId="PO001"
          items={mockItems}
          onQuantityChange={mockQuantityChange}
          onMarkDamaged={mockMarkDamaged}
          onConfirmReceiving={mockConfirmReceiving}
        />,
      );
    });

    const root = tree!.root;
    const damageButtons = root.findAll(
      (node) =>
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.includes('รายงานความเสียหาย') &&
        node.props.onPress !== undefined,
    );

    expect(damageButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('shows confirm button', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <ReceivingConfirmScreen
          poId="PO001"
          items={mockItems}
          onQuantityChange={mockQuantityChange}
          onMarkDamaged={mockMarkDamaged}
          onConfirmReceiving={mockConfirmReceiving}
        />,
      );
    });

    const confirmButton = tree!.root.findAll(
      (node) =>
        node.props.accessibilityLabel ===
          'ยืนยันรับสินค้าและสร้าง GRN' &&
        node.props.onPress !== undefined,
    );

    expect(confirmButton.length).toBeGreaterThanOrEqual(1);
  });

  it('displays summary bar with totals', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <ReceivingConfirmScreen
          poId="PO001"
          items={mockItems}
          onQuantityChange={mockQuantityChange}
          onMarkDamaged={mockMarkDamaged}
          onConfirmReceiving={mockConfirmReceiving}
        />,
      );
    });

    const root = tree!.root;
    const texts = root.findAllByType('Text' as any);
    const textContents = texts.map((t) => t.props.children);

    // Total expected: 10 + 5 = 15, Total received: 10 + 3 = 13
    expect(textContents).toContain(15);
    expect(textContents).toContain(13);
  });
});
