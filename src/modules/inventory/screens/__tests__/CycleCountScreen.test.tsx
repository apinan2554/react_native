/**
 * Tests for CycleCountScreen
 *
 * Validates Requirements: 3.5
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { CycleCountScreen } from '../CycleCountScreen';
import { CycleCount } from '../../types';

describe('CycleCountScreen', () => {
  const mockCycleCount: CycleCount = {
    id: 'cc-1',
    scheduledDate: new Date('2024-01-20'),
    status: 'in_progress',
    groupBy: 'bin_zone',
    items: [
      {
        id: 'item-1',
        cycleCountId: 'cc-1',
        skuId: 'SKU001',
        binId: 'BIN-A-01',
        systemQuantity: 50,
        syncStatus: 'synced',
      },
      {
        id: 'item-2',
        cycleCountId: 'cc-1',
        skuId: 'SKU002',
        binId: 'BIN-A-02',
        systemQuantity: 30,
        syncStatus: 'synced',
      },
      {
        id: 'item-3',
        cycleCountId: 'cc-1',
        skuId: 'SKU003',
        binId: 'BIN-A-03',
        systemQuantity: 20,
        syncStatus: 'synced',
      },
    ],
    createdBy: 'user-1',
    syncStatus: 'synced',
  };

  const mockOnSubmitResults = jest.fn().mockResolvedValue(undefined);

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

  it('renders header with title and status', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <CycleCountScreen
          cycleCount={mockCycleCount}
          onSubmitResults={mockOnSubmitResults}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('นับสต็อก (Cycle Count)');
    expect(allText).toContain('กำลังนับ');
  });

  it('displays cycle count items with SKU, bin, and system quantity', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <CycleCountScreen
          cycleCount={mockCycleCount}
          onSubmitResults={mockOnSubmitResults}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('SKU001');
    expect(allText).toContain('BIN-A-01');
    expect(allText).toContain('50');
    expect(allText).toContain('SKU002');
    expect(allText).toContain('BIN-A-02');
    expect(allText).toContain('30');
  });

  it('provides count input fields for each item', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <CycleCountScreen
          cycleCount={mockCycleCount}
          onSubmitResults={mockOnSubmitResults}
        />,
      );
    });

    const countInputs = tree!.root.findAllByType('TextInput' as any).filter(
      (node) =>
        node.props.accessibilityLabel &&
        node.props.accessibilityLabel.startsWith('จำนวนนับ'),
    );

    expect(countInputs.length).toBe(3);
  });

  it('shows discrepancy after entering counted quantity', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <CycleCountScreen
          cycleCount={mockCycleCount}
          onSubmitResults={mockOnSubmitResults}
        />,
      );
    });

    // Enter counted quantity different from system
    const countInput = tree!.root.findAll(
      (node) => node.props.accessibilityLabel === 'จำนวนนับ SKU001',
    )[0];

    act(() => {
      countInput.props.onChangeText('45');
    });

    const allText = getAllTextContent(tree!.root);
    // discrepancy = 45 - 50 = -5
    expect(allText).toContain('ส่วนต่าง');
    expect(allText).toContain('-5');
  });

  it('shows positive discrepancy with + prefix', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <CycleCountScreen
          cycleCount={mockCycleCount}
          onSubmitResults={mockOnSubmitResults}
        />,
      );
    });

    const countInput = tree!.root.findAll(
      (node) => node.props.accessibilityLabel === 'จำนวนนับ SKU001',
    )[0];

    act(() => {
      countInput.props.onChangeText('55');
    });

    const allText = getAllTextContent(tree!.root);
    // discrepancy = 55 - 50 = +5
    expect(allText).toContain('+5');
  });

  it('does not show discrepancy when counted equals system quantity', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <CycleCountScreen
          cycleCount={mockCycleCount}
          onSubmitResults={mockOnSubmitResults}
        />,
      );
    });

    const countInput = tree!.root.findAll(
      (node) => node.props.accessibilityLabel === 'จำนวนนับ SKU001',
    )[0];

    act(() => {
      countInput.props.onChangeText('50');
    });

    // When discrepancy is 0, we should not show "ส่วนต่าง" for that item
    // Count the number of discrepancy rows - should not have any with value 0
    const allText = getAllTextContent(tree!.root);
    expect(allText).not.toContain('+0');
  });

  it('submit button is disabled when no entries have been made', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <CycleCountScreen
          cycleCount={mockCycleCount}
          onSubmitResults={mockOnSubmitResults}
        />,
      );
    });

    const submitButton = tree!.root.findAll(
      (node) =>
        node.props.accessibilityLabel === 'บันทึกผลนับสต็อก' &&
        node.props.accessibilityRole === 'button',
    );

    expect(submitButton.length).toBeGreaterThanOrEqual(1);
    expect(submitButton[0].props.disabled).toBe(true);
  });

  it('calls onSubmitResults with correct data when submitted', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <CycleCountScreen
          cycleCount={mockCycleCount}
          onSubmitResults={mockOnSubmitResults}
        />,
      );
    });

    // Enter counts for items
    const countInput1 = tree!.root.findAll(
      (node) => node.props.accessibilityLabel === 'จำนวนนับ SKU001',
    )[0];
    const countInput2 = tree!.root.findAll(
      (node) => node.props.accessibilityLabel === 'จำนวนนับ SKU002',
    )[0];

    act(() => {
      countInput1.props.onChangeText('48');
      countInput2.props.onChangeText('32');
    });

    // Submit
    const submitButton = tree!.root.findAll(
      (node) =>
        node.props.accessibilityLabel === 'บันทึกผลนับสต็อก' &&
        node.props.accessibilityRole === 'button',
    )[0];

    await act(async () => {
      submitButton.props.onPress();
    });

    expect(mockOnSubmitResults).toHaveBeenCalledWith(
      expect.arrayContaining([
        { itemId: 'item-1', countedQuantity: 48 },
        { itemId: 'item-2', countedQuantity: 32 },
      ]),
    );
  });

  it('shows status indicators for different statuses', () => {
    const pendingCycleCount: CycleCount = {
      ...mockCycleCount,
      status: 'pending',
    };

    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <CycleCountScreen
          cycleCount={pendingCycleCount}
          onSubmitResults={mockOnSubmitResults}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('รอดำเนินการ');
  });

  it('hides submit button and disables inputs for approved status', () => {
    const approvedCycleCount: CycleCount = {
      ...mockCycleCount,
      status: 'approved',
      items: mockCycleCount.items.map((item) => ({
        ...item,
        countedQuantity: item.systemQuantity,
        discrepancy: 0,
        countedBy: 'user-1',
        countedAt: new Date(),
      })),
    };

    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <CycleCountScreen
          cycleCount={approvedCycleCount}
          onSubmitResults={mockOnSubmitResults}
        />,
      );
    });

    // Submit button should not be rendered
    const submitButton = tree!.root.findAll(
      (node) => node.props.accessibilityLabel === 'บันทึกผลนับสต็อก',
    );
    expect(submitButton.length).toBe(0);

    // Count inputs should not be rendered (read-only shows text instead)
    const countInputs = tree!.root.findAll(
      (node) =>
        node.props.accessibilityLabel &&
        node.props.accessibilityLabel.startsWith('จำนวนนับ'),
    );
    expect(countInputs.length).toBe(0);
  });

  it('shows summary with total items and group type', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <CycleCountScreen
          cycleCount={mockCycleCount}
          onSubmitResults={mockOnSubmitResults}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('3 รายการ');
    expect(allText).toContain('โซนตำแหน่ง');
  });

  it('renders back button when onGoBack is provided', () => {
    const mockGoBack = jest.fn();
    let tree: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <CycleCountScreen
          cycleCount={mockCycleCount}
          onSubmitResults={mockOnSubmitResults}
          onGoBack={mockGoBack}
        />,
      );
    });

    const allText = getAllTextContent(tree!.root);
    expect(allText).toContain('← กลับ');
  });
});
