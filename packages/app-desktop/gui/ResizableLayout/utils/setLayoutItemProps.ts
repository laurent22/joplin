import { produce } from 'immer';
import { LayoutItem } from './types';
import validateLayout from './validateLayout';

interface AutoSizeContext {
	naturalWidth?: number;
	naturalHeight?: number;
	rootWidth?: number;
	rootHeight?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export default function setLayoutItemProps(layout: LayoutItem, key: string, props: any) {
	const rootWidth = layout.width;
	const rootHeight = layout.height;

	return validateLayout(produce(layout, (draftState: LayoutItem) => {
		function ensureContext(item: LayoutItem) {
			if (!item.context) item.context = {};
			return item.context;
		}

		function removeEmptyContext(item: LayoutItem) {
			if (item.context && !Object.keys(item.context).length) delete item.context;
		}

		function ensureAutoSize(item: LayoutItem) {
			const context = ensureContext(item);
			if (!context.autoSize) context.autoSize = {};
			return context.autoSize as AutoSizeContext;
		}

		function cleanupAutoSize(item: LayoutItem) {
			if (item.context?.autoSize) {
				const autoSize = item.context.autoSize as AutoSizeContext;
				if (autoSize && typeof autoSize === 'object') {
					if (autoSize.naturalWidth === undefined) delete autoSize.rootWidth;
					if (autoSize.naturalHeight === undefined) delete autoSize.rootHeight;

					const hasWidthInfo = autoSize.naturalWidth !== undefined || autoSize.rootWidth !== undefined;
					const hasHeightInfo = autoSize.naturalHeight !== undefined || autoSize.rootHeight !== undefined;

					if (!hasWidthInfo && !hasHeightInfo) {
						delete item.context.autoSize;
						removeEmptyContext(item);
					}
				}
			}
		}

		function updateAutoSize(item: LayoutItem, propName: string, value: unknown) {
			if (propName === 'width') {
				if (typeof value === 'number') {
					const autoSize = ensureAutoSize(item);
					autoSize.naturalWidth = value;
					if (typeof rootWidth === 'number') autoSize.rootWidth = rootWidth;
				} else if (item.context?.autoSize) {
					const autoSize = item.context.autoSize as AutoSizeContext;
					delete autoSize.naturalWidth;
					delete autoSize.rootWidth;
					cleanupAutoSize(item);
				}
				return;
			}

			if (propName === 'height') {
				if (typeof value === 'number') {
					const autoSize = ensureAutoSize(item);
					autoSize.naturalHeight = value;
					if (typeof rootHeight === 'number') autoSize.rootHeight = rootHeight;
				} else if (item.context?.autoSize) {
					const autoSize = item.context.autoSize as AutoSizeContext;
					delete autoSize.naturalHeight;
					delete autoSize.rootHeight;
					cleanupAutoSize(item);
				}
			}
		}

		function recurseFind(item: LayoutItem) {
			if (item.key === key) {
				for (const n in props) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					(item as any)[n] = props[n];
					updateAutoSize(item, n, props[n]);
				}
				cleanupAutoSize(item);
			} else {
				if (item.children) {
					for (const child of item.children) {
						recurseFind(child);
					}
				}
			}
		}

		recurseFind(draftState);
	}));
}
