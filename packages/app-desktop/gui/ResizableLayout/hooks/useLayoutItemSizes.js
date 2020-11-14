'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.itemSize = void 0;
const react_1 = require('react');
const ResizableLayout_1 = require('../ResizableLayout');
function itemSize(item, sizes) {
	return {
		width: 'width' in item ? item.width : sizes[item.key].width,
		height: 'height' in item ? item.height : sizes[item.key].height,
	};
}
exports.itemSize = itemSize;
function calculateChildrenSizes(item, sizes) {
	if (!item.children) { return sizes; }
	const parentSize = itemSize(item, sizes);
	const remainingSize = {
		width: parentSize.width,
		height: parentSize.height,
	};
	const noWidthChildren = [];
	const noHeightChildren = [];
	for (const child of item.children) {
		let w = 'width' in child ? child.width : null;
		let h = 'height' in child ? child.height : null;
		if (child.visible === false) {
			w = 0;
			h = 0;
		}
		if (item.resizableRight) { w -= ResizableLayout_1.dragBarThickness; }
		if (item.resizableBottom) { h -= ResizableLayout_1.dragBarThickness; }
		sizes[child.key] = { width: w, height: h };
		if (w !== null) { remainingSize.width -= w; }
		if (h !== null) { remainingSize.height -= h; }
		if (w === null) { noWidthChildren.push(child); }
		if (h === null) { noHeightChildren.push(child); }
	}
	if (noWidthChildren.length) {
		const w = item.direction === 'row' ? remainingSize.width / noWidthChildren.length : parentSize.width;
		for (const child of noWidthChildren) {
			sizes[child.key].width = w;
		}
	}
	if (noHeightChildren.length) {
		const h = item.direction === 'column' ? remainingSize.height / noHeightChildren.length : parentSize.height;
		for (const child of noHeightChildren) {
			sizes[child.key].height = h;
		}
	}
	for (const child of item.children) {
		const childrenSizes = calculateChildrenSizes(child, sizes);
		sizes = Object.assign(Object.assign({}, sizes), childrenSizes);
	}
	return sizes;
}
function useLayoutItemSizes(layout) {
	return react_1.useMemo(() => {
		let sizes = {};
		if (!('width' in layout) || !('height' in layout)) { throw new Error('width and height are required on layout root'); }
		sizes[layout.key] = {
			width: layout.width,
			height: layout.height,
		};
		sizes = calculateChildrenSizes(layout, sizes);
		return sizes;
	}, [layout]);
}
exports.default = useLayoutItemSizes;
// # sourceMappingURL=useLayoutItemSizes.js.map
