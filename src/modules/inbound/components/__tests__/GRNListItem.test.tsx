/**
 * Tests for GRNListItem component
 *
 * Validates Requirements: 1.4
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { GRNListItem } from '../GRNListItem';
import { GRN } from '../../types';

describe('GRNListItem', () => {
  const mockGRN: GRN = {
    id: 'GRN-001',
    poId: 'PO-123',
    receivedAt: new Date('2024-01-15'),
    receivedBy: 'สมชาย',
    items: [],
    status: 'confirmed',
    totalQuantityExpected: 100,
    totalQuantityReceived: 95,
    syncStatus: 'synced',
  };

  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders GRN ID and PO ID', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <GRNListItem grn={mockGRN} onPress={mockOnPress} />,
      );
    });

    const texts = tree!.root.findAllByType('Text' as any);
    const textContents = texts.map((t) =>
      Array.isArray(t.props.children)
        ? t.props.children.join('')
        : t.props.children,
    );

    expect(
      textContents.some(
        (t) => typeof t === 'string' && t.includes('GRN-001'),
      ),
    ).toBe(true);
    expect(
      textContents.some(
        (t) => typeof t === 'string' && t.includes('PO-123'),
      ),
    ).toBe(true);
  });

  it('renders status badge with correct text', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <GRNListItem grn={mockGRN} onPress={mockOnPress} />,
      );
    });

    const texts = tree!.root.findAllByType('Text' as any);
    const textContents = texts.map((t) => t.props.children);
    expect(textContents).toContain('ยืนยันแล้ว');
  });

  it('renders supplier name when provided', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <GRNListItem
          grn={mockGRN}
          supplierName="บริษัท ABC"
          onPress={mockOnPress}
        />,
      );
    });

    const texts = tree!.root.findAllByType('Text' as any);
    const textContents = texts.map((t) =>
      Array.isArray(t.props.children)
        ? t.props.children.join('')
        : String(t.props.children ?? ''),
    );
    expect(
      textContents.some((t) => t.includes('ABC')),
    ).toBe(true);
  });

  it('renders quantity info', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <GRNListItem grn={mockGRN} onPress={mockOnPress} />,
      );
    });

    const texts = tree!.root.findAllByType('Text' as any);
    const textContents = texts.map((t) =>
      Array.isArray(t.props.children)
        ? t.props.children.join('')
        : t.props.children,
    );
    expect(
      textContents.some(
        (t) => typeof t === 'string' && t.includes('95/100'),
      ),
    ).toBe(true);
  });

  it('calls onPress when tapped', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <GRNListItem grn={mockGRN} onPress={mockOnPress} />,
      );
    });

    const touchable = tree!.root.findAll(
      (node) => node.props.accessibilityRole === 'button',
    )[0];

    act(() => {
      touchable.props.onPress();
    });

    expect(mockOnPress).toHaveBeenCalledWith(mockGRN);
  });

  it('shows discrepancy status correctly', () => {
    const discrepancyGRN: GRN = {
      ...mockGRN,
      status: 'discrepancy',
    };

    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <GRNListItem grn={discrepancyGRN} onPress={mockOnPress} />,
      );
    });

    const texts = tree!.root.findAllByType('Text' as any);
    const textContents = texts.map((t) => t.props.children);
    expect(textContents).toContain('คลาดเคลื่อน');
  });
});
