/**
 * Tests for BinSuggestionScreen
 *
 * Validates Requirements: 2.1, 2.5
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { BinSuggestionScreen } from '../BinSuggestionScreen';
import { BinSuggestion, ReceivedItem } from '../../types';

describe('BinSuggestionScreen', () => {
  const mockItem: ReceivedItem & { name: string } = {
    id: 'item-1',
    skuId: 'SKU001',
    name: 'สินค้าทดสอบ A',
    quantity: 50,
    movementRate: 'fast',
    temperatureRequirement: undefined,
  };

  const mockSuggestions: BinSuggestion[] = [
    {
      bin: {
        id: 'bin-1',
        code: 'A-01-01-01',
        zone: 'A',
        aisle: '01',
        rack: '01',
        level: '01',
        capacity: 100,
        currentOccupancy: 30,
        temperatureControlled: false,
        distanceFromDoor: 5,
        isActive: true,
        syncStatus: 'synced',
      },
      score: 95,
      reason: 'ใกล้ประตู เหมาะกับสินค้าเคลื่อนไหวเร็ว',
      isAlternative: false,
    },
    {
      bin: {
        id: 'bin-2',
        code: 'B-02-03-02',
        zone: 'B',
        aisle: '02',
        rack: '03',
        level: '02',
        capacity: 80,
        currentOccupancy: 60,
        temperatureControlled: false,
        distanceFromDoor: 20,
        isActive: true,
        syncStatus: 'synced',
      },
      score: 72,
      reason: 'ตำแหน่งสำรอง มีพื้นที่เพียงพอ',
      isAlternative: true,
    },
  ];

  const mockOnSelectBin = jest.fn();

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

  it('renders item info with name, SKU, and quantity', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <BinSuggestionScreen
          item={mockItem}
          suggestions={mockSuggestions}
          onSelectBin={mockOnSelectBin}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);

    expect(allText).toContain('สินค้าทดสอบ A');
    expect(allText).toContain('SKU001');
    expect(allText).toContain('50');
    expect(allText).toContain('ชิ้น');
  });

  it('shows fast-moving badge for fast-moving items', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <BinSuggestionScreen
          item={mockItem}
          suggestions={mockSuggestions}
          onSelectBin={mockOnSelectBin}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('สินค้าเคลื่อนไหวเร็ว');
  });

  it('shows temperature badge for temperature-controlled items', () => {
    const tempItem: ReceivedItem & { name: string } = {
      ...mockItem,
      movementRate: 'slow',
      temperatureRequirement: { min: 2, max: 8 },
    };

    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <BinSuggestionScreen
          item={tempItem}
          suggestions={mockSuggestions}
          onSelectBin={mockOnSelectBin}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('ควบคุมอุณหภูมิ');
  });

  it('marks first suggestion as recommended and others as alternative', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <BinSuggestionScreen
          item={mockItem}
          suggestions={mockSuggestions}
          onSelectBin={mockOnSelectBin}
        />,
      );
    });

    const root = tree!.root;
    const texts = root.findAllByType('Text' as any);
    const recommendedTexts = texts.filter(
      (t) => t.props.children === 'แนะนำ',
    );
    const alternativeTexts = texts.filter(
      (t) => t.props.children === 'ทางเลือก',
    );

    expect(recommendedTexts.length).toBe(1);
    expect(alternativeTexts.length).toBe(1);
  });

  it('displays bin code and score for each suggestion', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <BinSuggestionScreen
          item={mockItem}
          suggestions={mockSuggestions}
          onSelectBin={mockOnSelectBin}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);

    expect(allText).toContain('A-01-01-01');
    expect(allText).toContain('B-02-03-02');
    expect(allText).toContain('95.0');
    expect(allText).toContain('72.0');
  });

  it('calls onSelectBin when a bin is selected', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <BinSuggestionScreen
          item={mockItem}
          suggestions={mockSuggestions}
          onSelectBin={mockOnSelectBin}
        />,
      );
    });

    const root = tree!.root;
    const selectButtons = root.findAll(
      (node) =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.includes('เลือกตำแหน่ง') &&
        typeof node.props.onPress === 'function',
    );

    expect(selectButtons.length).toBeGreaterThanOrEqual(2);

    act(() => {
      selectButtons[0].props.onPress();
    });

    // The first bin in sorted order (highest score) should be bin-1
    expect(mockOnSelectBin).toHaveBeenCalledWith(mockSuggestions[0]);
  });

  it('shows empty state when no suggestions available', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <BinSuggestionScreen
          item={mockItem}
          suggestions={[]}
          onSelectBin={mockOnSelectBin}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('ไม่พบตำแหน่งที่เหมาะสม');
  });

  it('sorts suggestions by score (highest first)', () => {
    const unsortedSuggestions: BinSuggestion[] = [
      { ...mockSuggestions[1], score: 50 },
      { ...mockSuggestions[0], score: 90 },
    ];

    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <BinSuggestionScreen
          item={mockItem}
          suggestions={unsortedSuggestions}
          onSelectBin={mockOnSelectBin}
        />,
      );
    });

    const root = tree!.root;
    const texts = root.findAllByType('Text' as any);
    const scoreTexts = texts.filter(
      (t) =>
        typeof t.props.children === 'string' &&
        (t.props.children === '90.0' || t.props.children === '50.0'),
    );

    // The first score displayed should be the highest
    expect(scoreTexts[0].props.children).toBe('90.0');
    expect(scoreTexts[1].props.children).toBe('50.0');
  });
});
