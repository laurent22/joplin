import findEmptySpot, { buildSizes, Rect } from './findEmptySpot';

const viewport: Rect = { x: 0, y: 0, width: 1000, height: 800 };
const centre = { x: 500, y: 400 };
const preferred = { width: 320, height: 240 };
const min = { width: 100, height: 100 };

const rectsOverlap = (a: Rect, b: Rect) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const rectInside = (r: Rect, container: Rect) => r.x >= container.x && r.y >= container.y && r.x + r.width <= container.x + container.width && r.y + r.height <= container.y + container.height;

describe('findEmptySpot', () => {
	test('places at viewport centre on empty canvas', () => {
		const result = findEmptySpot({ existing: [], viewport, centre, preferred, min });
		expect(result).toEqual({ x: 340, y: 280, width: 320, height: 240 });
	});

	test('avoids overlap with an existing node near the centre', () => {
		const blocker: Rect = { x: 400, y: 350, width: 200, height: 150 };
		const result = findEmptySpot({ existing: [blocker], viewport, centre, preferred, min });
		expect(rectsOverlap(result, blocker)).toBe(false);
		expect(rectInside(result, viewport)).toBe(true);
	});

	test('shrinks toward min size when preferred does not fit', () => {
		// Leave a narrow horizontal strip on the right (width ~110px) where only
		// a shrunken node can fit; the rest of the viewport is fully blocked.
		const existing: Rect[] = [
			{ x: 0, y: 0, width: 890, height: 800 },
		];
		const result = findEmptySpot({ existing, viewport, centre, preferred, min });
		expect(rectsOverlap(result, existing[0])).toBe(false);
		expect(rectInside(result, viewport)).toBe(true);
		expect(result.width).toBeLessThan(preferred.width);
		expect(result.width).toBeGreaterThanOrEqual(min.width);
	});

	test('falls back offscreen adjacent to content AABB when nothing fits in view', () => {
		const existing: Rect[] = [
			{ x: 0, y: 0, width: viewport.width, height: viewport.height },
		];
		const result = findEmptySpot({ existing, viewport, centre, preferred, min });
		expect(rectsOverlap(result, existing[0])).toBe(false);
		// Should sit adjacent to the AABB with the configured gap. Since the
		// AABB fills the viewport, the closest side to viewport bounds is a tie
		// — any side is acceptable, but it must NOT be far from the AABB.
		const nearRight = result.x === existing[0].x + existing[0].width + 40;
		const nearBottom = result.y === existing[0].y + existing[0].height + 40;
		const nearLeft = result.x === existing[0].x - 40 - preferred.width;
		const nearTop = result.y === existing[0].y - 40 - preferred.height;
		expect(nearRight || nearBottom || nearLeft || nearTop).toBe(true);
		// Falls back to preferred size in the offscreen path.
		expect(result.width).toBe(preferred.width);
		expect(result.height).toBe(preferred.height);
	});

	test('offscreen fallback picks the side closest to the viewport', () => {
		// Block the entire viewport plus have far-away content on the right.
		// Combined AABB: x [0..2500], y [0..300]. Distances from viewport
		// (0,0,300,300) with gap=40: right=2240, bottom=40, left=360, top=280.
		// Bottom wins → y = maxCY + gap = 340.
		const existing: Rect[] = [
			{ x: 0, y: 0, width: 300, height: 300 },
			{ x: 2000, y: 0, width: 500, height: 300 },
		];
		const shrunkViewport: Rect = { x: 0, y: 0, width: 300, height: 300 };
		const result = findEmptySpot({ existing, viewport: shrunkViewport, centre: { x: 150, y: 150 }, preferred, min });
		expect(result.y).toBe(340);
	});

	test('returns centre-based rect when viewport is null', () => {
		const result = findEmptySpot({ existing: [], viewport: null, centre, preferred, min });
		expect(result).toEqual({ x: 340, y: 280, width: 320, height: 240 });
	});

	test('buildSizes keeps shrinking width when height clamps first (non-square)', () => {
		// Preferred 320x80, min 100x50, step 40. Height decrement is round(40 *
		// 0.25) = 10. Height reaches min (50) at width=200, and the old
		// implementation stopped there — skipping intermediate widths like 160
		// and 120. The fix must keep shrinking width while clamping height.
		const sizes = buildSizes({ width: 320, height: 80 }, { width: 100, height: 50 }, 40);
		const widths = sizes.map(s => s.width);
		expect(widths).toContain(120);
		expect(widths).toContain(160);
		for (const s of sizes) expect(s.height).toBeGreaterThanOrEqual(50);
		expect(sizes[sizes.length - 1]).toEqual({ width: 100, height: 50 });
	});

	test('spiral finds an empty cell adjacent to a centred blocker', () => {
		// A blocker covering the centre but small enough that the preferred
		// 320×240 still fits somewhere in the 1000×800 viewport — the spiral
		// must find that clear position.
		const blocker: Rect = { x: 400, y: 300, width: 200, height: 200 };
		const result = findEmptySpot({ existing: [blocker], viewport, centre, preferred, min });
		expect(rectsOverlap(result, blocker)).toBe(false);
		expect(rectInside(result, viewport)).toBe(true);
		expect(result.width).toBe(preferred.width);
	});
});
