import { LayoutItem, LayoutItemDirection } from './types';
import {
	buildResizeSnapshot,
	computeEdges,
	isSubtreeFlexible,
	lastVisibleChildIndex,
	nextVisibleSibling,
	planResize,
	ResizeStartSnapshot,
} from './resizeLogic';

describe('resizeLogic', () => {

	const sampleSizes = {
		sideBar: { width: 250, height: 800 },
		noteList: { width: 400, height: 800 },
		editor: { width: 300, height: 800 },
		chatPanel: { width: 340, height: 800 },
	};

	test.each([
		['flag directly on item', { key: 'a', flexible: true } as LayoutItem, true],
		['flag on nested descendant', { key: 'a', children: [{ key: 'b', children: [{ key: 'c', flexible: true }] }] } as LayoutItem, true],
		['no flag anywhere in subtree', { key: 'a', children: [{ key: 'b' }] } as LayoutItem, false],
		['leaf without flag', { key: 'a' } as LayoutItem, false],
	])('isSubtreeFlexible: %s', (_label, item, expected) => {
		expect(isSubtreeFlexible(item)).toBe(expected);
	});

	test('nextVisibleSibling skips hidden siblings in normal mode', () => {
		const parent: LayoutItem = {
			key: 'root',
			children: [
				{ key: 'a' },
				{ key: 'b', visible: false },
				{ key: 'c' },
			],
		};
		expect(nextVisibleSibling(parent.children[0], parent, false)?.key).toBe('c');
	});

	test('nextVisibleSibling includes hidden siblings in moveMode', () => {
		const parent: LayoutItem = {
			key: 'root',
			children: [
				{ key: 'a' },
				{ key: 'b', visible: false },
				{ key: 'c' },
			],
		};
		expect(nextVisibleSibling(parent.children[0], parent, true)?.key).toBe('b');
	});

	test('lastVisibleChildIndex is moveMode-aware', () => {
		const item: LayoutItem = {
			key: 'root',
			children: [{ key: 'a' }, { key: 'b' }, { key: 'c', visible: false }],
		};
		expect(lastVisibleChildIndex(item, false)).toBe(1);
		expect(lastVisibleChildIndex(item, true)).toBe(2);
	});

	test('computeEdges: middle row child gets an own right edge only', () => {
		const parent: LayoutItem = { key: 'root', direction: LayoutItemDirection.Row };
		expect(computeEdges(parent, false)).toEqual({ ownRight: true, ownBottom: false, parentRight: false, parentBottom: false });
	});

	test('computeEdges: last row child inherits parent right', () => {
		const parent: LayoutItem = { key: 'root', direction: LayoutItemDirection.Row };
		const parentEdges = { ownRight: false, ownBottom: false, parentRight: true, parentBottom: false };
		expect(computeEdges(parent, true, parentEdges)).toEqual({ ownRight: false, ownBottom: false, parentRight: true, parentBottom: false });
	});

	test('computeEdges: every column child sits at the column right edge, so parentRight propagates through', () => {
		const parent: LayoutItem = { key: 'col', direction: LayoutItemDirection.Column };
		const parentEdges = { ownRight: true, ownBottom: false, parentRight: false, parentBottom: false };
		expect(computeEdges(parent, false, parentEdges).parentRight).toBe(true);
	});

	test('computeEdges: same-axis nesting propagates outer own-right to a last row-in-row child', () => {
		// Unusual but valid nesting: the inner container's right edge
		// coincides with the outer's, so the outer's own right divider gap
		// must flow to the inner's descendants.
		const parent: LayoutItem = { key: 'inner', direction: LayoutItemDirection.Row };
		const parentEdges = { ownRight: true, ownBottom: false, parentRight: false, parentBottom: false };
		expect(computeEdges(parent, true, parentEdges).parentRight).toBe(true);
	});

	test('buildResizeSnapshot: only truly-flexible subtrees are flagged as absorbers', () => {
		const parent: LayoutItem = { key: 'root', direction: LayoutItemDirection.Row, children: [
			{ key: 'sideBar', width: 250 },
			{ key: 'editor', flexible: true },
		] };
		const snap = buildResizeSnapshot(parent.children[0], parent, false, sampleSizes);
		expect(snap.itemAbsorbsAlongAxis.width).toBe(false); // sideBar
		expect(snap.nextAbsorbsAlongAxis.width).toBe(true); // editor
	});

	test('buildResizeSnapshot: width-less non-flexible next sibling is not an absorber', () => {
		// Regression: dragging noteList↔chatPanel where chatPanel is unsized
		// in state but not marked flexible. Old code treated any unsized
		// panel as an absorber and skipped writes to it.
		const parent: LayoutItem = { key: 'root', direction: LayoutItemDirection.Row, children: [
			{ key: 'noteList', width: 400 },
			{ key: 'chatPanel' },
		] };
		const snap = buildResizeSnapshot(parent.children[0], parent, false, sampleSizes);
		expect(snap.nextAbsorbsAlongAxis.width).toBe(false);
	});

	test('buildResizeSnapshot: picks the next sibling that is hidden in state when in moveMode', () => {
		const parent: LayoutItem = { key: 'root', direction: LayoutItemDirection.Row, children: [
			{ key: 'noteList', width: 400 },
			{ key: 'chatPanel', visible: false },
		] };
		const snap = buildResizeSnapshot(parent.children[0], parent, true, sampleSizes);
		expect(snap.nextSiblingKey).toBe('chatPanel');
	});

	const baseSnap = (overrides: Partial<ResizeStartSnapshot> = {}): ResizeStartSnapshot => ({
		key: 'a',
		initialWidth: 300,
		initialHeight: 200,
		nextSiblingKey: 'b',
		nextSiblingInitialWidth: 400,
		nextSiblingInitialHeight: 200,
		itemAbsorbsAlongAxis: { width: false, height: false },
		nextAbsorbsAlongAxis: { width: false, height: false },
		...overrides,
	});

	test('planResize: drag right by 50 grows the dragged panel and shrinks the next', () => {
		expect(planResize(baseSnap(), 'right', { width: 50, height: 0 })).toEqual([
			{ key: 'a', props: { width: 350 } },
			{ key: 'b', props: { width: 350 } },
		]);
	});

	test('planResize: skips write to the next sibling when it is the absorber', () => {
		const snap = baseSnap({ nextAbsorbsAlongAxis: { width: true, height: false } });
		expect(planResize(snap, 'right', { width: 50, height: 0 })).toEqual([
			{ key: 'a', props: { width: 350 } },
		]);
	});

	test('planResize: redirects to the next sibling (inverse) when dragged is the absorber', () => {
		// Editor is flexible and unsized; dragging its right edge should
		// resize the panel to its right instead so the editor stays flex.
		const snap = baseSnap({ itemAbsorbsAlongAxis: { width: true, height: false } });
		expect(planResize(snap, 'right', { width: 50, height: 0 })).toEqual([
			{ key: 'b', props: { width: 350 } },
		]);
	});

	test('planResize: writes to the dragged panel when both sides are absorbers (#15934)', () => {
		// Sidebar and note list stacked in a column, both unsized. Without
		// the bothAbsorb branch, neither was written and the divider never
		// moved.
		const snap = baseSnap({
			itemAbsorbsAlongAxis: { width: false, height: true },
			nextAbsorbsAlongAxis: { width: false, height: true },
		});
		expect(planResize(snap, 'bottom', { width: 0, height: 40 })).toEqual([
			{ key: 'a', props: { height: 240 } },
		]);
	});

	test('planResize: no next sibling means only the dragged is written', () => {
		const snap = baseSnap({ nextSiblingKey: null });
		expect(planResize(snap, 'right', { width: 50, height: 0 })).toEqual([
			{ key: 'a', props: { width: 350 } },
		]);
	});

	test('planResize: clamps a shared delta so both sides respect min and the combined size is preserved', () => {
		const snap = baseSnap();
		const originalSum = snap.initialWidth + snap.nextSiblingInitialWidth;
		const updates = planResize(snap, 'right', { width: -500, height: 0 });
		// itemMinWidth is 40; dragged clamps to 40, next grows by the same
		// amount so the two sizes sum to the original combined width.
		expect(updates[0].props.width).toBe(40);
		expect(updates[1].props.width).toBe(originalSum - 40);
		expect(updates[0].props.width + updates[1].props.width).toBe(originalSum);
	});

	test('planResize: preserves the combined size when the delta would push the next sibling below min', () => {
		const snap = baseSnap();
		const originalSum = snap.initialWidth + snap.nextSiblingInitialWidth;
		const updates = planResize(snap, 'right', { width: 500, height: 0 });
		// The next sibling clamps to itemMinWidth (40); the dragged panel
		// grows by exactly the same amount so the sum is preserved.
		expect(updates[1].props.width).toBe(40);
		expect(updates[0].props.width).toBe(originalSum - 40);
		expect(updates[0].props.width + updates[1].props.width).toBe(originalSum);
	});

});
