/**
 * Tests for PutawayConfirmScreen
 *
 * Validates Requirements: 2.4, 2.5
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { PutawayConfirmScreen } from '../PutawayConfirmScreen';
import { Bin, ReceivedItem } from '../../types';

describe('PutawayConfirmScreen', () => {
  const mockBin: Bin = {
    id: 'bin-1',
    code: 'A-01-02-03',
    zone: 'A',
    aisle: '01',
    rack: '02',
    level: '03',
    capacity: 100,
    currentOccupancy: 45,
    temperatureControlled: true,
    temperatureRange: { min: 2, max: 8 },
    distanceFromDoor: 10,
    isActive: true,
    syncStatus: 'synced',
  };

  const mockItem: ReceivedItem & { name: string } = {
    id: 'item-1',
    skuId: 'SKU001',
    name: 'สินค้าแช่เย็น',
    quantity: 30,
    movementRate: 'medium',
    temperatureRequirement: { min: 2, max: 8 },
  };

  const mockOnConfirmPutaway = jest.fn().mockResolvedValue(undefined);
  const mockOnChangeBin = jest.fn();

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

  it('renders bin details (code, zone, aisle, rack, level)', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <PutawayConfirmScreen
          bin={mockBin}
          item={mockItem}
          onConfirmPutaway={mockOnConfirmPutaway}
          onChangeBin={mockOnChangeBin}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);

    expect(allText).toContain('A-01-02-03');
    expect(allText).toContain('A');
    expect(allText).toContain('01');
    expect(allText).toContain('02');
    expect(allText).toContain('03');
  });

  it('renders item info (name, SKU, quantity)', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <PutawayConfirmScreen
          bin={mockBin}
          item={mockItem}
          onConfirmPutaway={mockOnConfirmPutaway}
          onChangeBin={mockOnChangeBin}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);

    expect(allText).toContain('สินค้าแช่เย็น');
    expect(allText).toContain('SKU001');
    expect(allText).toContain('30');
    expect(allText).toContain('ชิ้น');
  });

  it('shows temperature zone info when bin is temperature controlled', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <PutawayConfirmScreen
          bin={mockBin}
          item={mockItem}
          onConfirmPutaway={mockOnConfirmPutaway}
          onChangeBin={mockOnChangeBin}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('โซนควบคุมอุณหภูมิ');
  });

  it('does not show temperature info for non-temperature-controlled bins', () => {
    const normalBin: Bin = {
      ...mockBin,
      temperatureControlled: false,
      temperatureRange: undefined,
    };

    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <PutawayConfirmScreen
          bin={normalBin}
          item={{ ...mockItem, temperatureRequirement: undefined }}
          onConfirmPutaway={mockOnConfirmPutaway}
          onChangeBin={mockOnChangeBin}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).not.toContain('โซนควบคุมอุณหภูมิ');
  });

  it('shows occupancy progress information', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <PutawayConfirmScreen
          bin={mockBin}
          item={mockItem}
          onConfirmPutaway={mockOnConfirmPutaway}
          onChangeBin={mockOnChangeBin}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('45/100');
    expect(allText).toContain('45%');
  });

  it('calls onConfirmPutaway when confirm button is pressed', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <PutawayConfirmScreen
          bin={mockBin}
          item={mockItem}
          onConfirmPutaway={mockOnConfirmPutaway}
          onChangeBin={mockOnChangeBin}
        />,
      );
    });

    const confirmButton = tree!.root.findAll(
      (node) =>
        node.props.accessibilityRole === 'button' &&
        node.props.accessibilityLabel === 'ยืนยันจัดเก็บสินค้าที่ตำแหน่งนี้' &&
        typeof node.props.onPress === 'function',
    );

    expect(confirmButton.length).toBeGreaterThanOrEqual(1);

    await act(async () => {
      confirmButton[0].props.onPress();
    });

    expect(mockOnConfirmPutaway).toHaveBeenCalledWith('item-1', 'bin-1');
  });

  it('calls onChangeBin when change button is pressed', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <PutawayConfirmScreen
          bin={mockBin}
          item={mockItem}
          onConfirmPutaway={mockOnConfirmPutaway}
          onChangeBin={mockOnChangeBin}
        />,
      );
    });

    const changeButton = tree!.root.findAll(
      (node) =>
        node.props.accessibilityRole === 'button' &&
        node.props.accessibilityLabel === 'เปลี่ยนตำแหน่งจัดเก็บ' &&
        typeof node.props.onPress === 'function',
    );

    expect(changeButton.length).toBeGreaterThanOrEqual(1);

    act(() => {
      changeButton[0].props.onPress();
    });

    expect(mockOnChangeBin).toHaveBeenCalled();
  });

  it('renders back button when onGoBack is provided', () => {
    const mockGoBack = jest.fn();
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <PutawayConfirmScreen
          bin={mockBin}
          item={mockItem}
          onConfirmPutaway={mockOnConfirmPutaway}
          onChangeBin={mockOnChangeBin}
          onGoBack={mockGoBack}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('← กลับ');
  });
});
