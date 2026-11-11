export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface Size {
	width: number;
	height: number;
}

export interface FindEmptySpotOptions {
	// Existing node rectangles the new node must not overlap.
	existing: Rect[];
	// Visible viewport in canvas coordinates. If null, the function returns
	// the preferred-size rect centred on `centre` (used when the viewport
	// hasn't been measured yet).
	viewport: Rect | null;
	// Point around which the search spirals — typically the viewport centre.
	centre: { x: number; y: number };
	preferred: Size;
	// Minimum acceptable size. The search shrinks from preferred toward min
	// (preserving aspect ratio) and only falls back to offscreen placement
	// if even the min size doesn't fit anywhere in view.
	min: Size;
	// Spiral step in canvas coordinates.
	step?: number;
	// Shrink increment (applied to width; height shrinks proportionally).
	shrinkStep?: number;
	// Gap between the new node and the AABB of existing nodes when placed
	// adjacent to it in the offscreen-fallback path.
	gap?: number;
}

const rectsOverlap = (a: Rect, b: Rect): boolean => {
	return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
};

const overlapsAny = (candidate: Rect, existing: Rect[]): boolean => {
	for (const e of existing) {
		if (rectsOverlap(candidate, e)) return true;
	}
	return false;
};

export const buildSizes = (preferred: Size, min: Size, shrinkStep: number): Size[] => {
	const sizes: Size[] = [];
	const ratio = preferred.height / preferred.width;
	// Keep shrinking while EITHER dimension is still above its minimum, so the
	// other one can be clamped instead of terminating the search early. This
	// matters for non-square preferred/min pairs where one axis reaches its
	// minimum well before the other.
	let w = preferred.width;
	let h = preferred.height;
	while (w > min.width || h > min.height) {
		sizes.push({ width: Math.max(w, min.width), height: Math.max(h, min.height) });
		w -= shrinkStep;
		h -= Math.round(shrinkStep * ratio);
	}
	const last = sizes[sizes.length - 1];
	if (!last || last.width !== min.width || last.height !== min.height) sizes.push({ width: min.width, height: min.height });
	return sizes;
};

// Finds an empty spot for a new rectangular node. Tries the preferred size
// first, spiralling out from `centre` inside `viewport`; if nothing fits, it
// shrinks toward `min` and tries again. If even the min size doesn't fit
// anywhere in view, falls back to placing a preferred-size rect adjacent to
// the AABB of existing nodes (with a gap) on whichever side is closest to the
// viewport, so the new node stays partially visible.
const findEmptySpot = (options: FindEmptySpotOptions): Rect => {
	const { existing, viewport, centre, preferred, min } = options;
	const step = options.step ?? 40;
	const shrinkStep = options.shrinkStep ?? 40;
	const gap = options.gap ?? 40;

	if (!viewport) {
		return { x: centre.x - preferred.width / 2, y: centre.y - preferred.height / 2, ...preferred };
	}

	const sizes = buildSizes(preferred, min, shrinkStep);

	for (const size of sizes) {
		const cornerX = centre.x - size.width / 2;
		const cornerY = centre.y - size.height / 2;
		const maxX = viewport.x + viewport.width - size.width;
		const maxY = viewport.y + viewport.height - size.height;
		if (maxX < viewport.x || maxY < viewport.y) continue;

		const centred: Rect = { x: cornerX, y: cornerY, ...size };
		if (viewport.x <= cornerX && cornerX <= maxX && viewport.y <= cornerY && cornerY <= maxY && !overlapsAny(centred, existing)) {
			return centred;
		}

		const maxRings = Math.ceil(Math.max(viewport.width, viewport.height) / step);
		for (let ring = 1; ring <= maxRings; ring++) {
			for (let dy = -ring; dy <= ring; dy++) {
				for (let dx = -ring; dx <= ring; dx++) {
					if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
					const x = cornerX + dx * step;
					const y = cornerY + dy * step;
					if (x < viewport.x || x > maxX || y < viewport.y || y > maxY) continue;
					const candidate: Rect = { x, y, ...size };
					if (!overlapsAny(candidate, existing)) return candidate;
				}
			}
		}
	}

	if (!existing.length) {
		return { x: centre.x - preferred.width / 2, y: centre.y - preferred.height / 2, ...preferred };
	}

	let minCX = Infinity, minCY = Infinity, maxCX = -Infinity, maxCY = -Infinity;
	for (const e of existing) {
		minCX = Math.min(minCX, e.x);
		minCY = Math.min(minCY, e.y);
		maxCX = Math.max(maxCX, e.x + e.width);
		maxCY = Math.max(maxCY, e.y + e.height);
	}

	const viewR = viewport.x + viewport.width;
	const viewB = viewport.y + viewport.height;
	const cyMid = Math.max(viewport.y, Math.min(viewB - preferred.height, (minCY + maxCY) / 2 - preferred.height / 2));
	const cxMid = Math.max(viewport.x, Math.min(viewR - preferred.width, (minCX + maxCX) / 2 - preferred.width / 2));
	const candidates = [
		{ x: maxCX + gap, y: cyMid, dist: Math.max(0, maxCX + gap - viewR) },
		{ x: cxMid, y: maxCY + gap, dist: Math.max(0, maxCY + gap - viewB) },
		{ x: minCX - gap - preferred.width, y: cyMid, dist: Math.max(0, viewport.x - (minCX - gap - preferred.width)) },
		{ x: cxMid, y: minCY - gap - preferred.height, dist: Math.max(0, viewport.y - (minCY - gap - preferred.height)) },
	];
	candidates.sort((a, b) => a.dist - b.dist);
	return { x: candidates[0].x, y: candidates[0].y, ...preferred };
};

export default findEmptySpot;
