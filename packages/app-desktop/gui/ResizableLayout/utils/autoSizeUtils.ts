import { AutoSizeContext, LayoutItem } from './types';

export function ensureContext(item: LayoutItem) {
	if (!item.context) item.context = {};
	return item.context;
}

export function ensureAutoSizeContext(item: LayoutItem): AutoSizeContext {
	const context = ensureContext(item);
	if (!context.autoSize) context.autoSize = {};
	return context.autoSize as AutoSizeContext;
}

export function currentAutoSizeContext(item: LayoutItem): AutoSizeContext | null {
	return item.context?.autoSize ? item.context.autoSize as AutoSizeContext : null;
}

export function cleanupAutoSizeContext(item: LayoutItem) {
	if (!item.context?.autoSize) return;
	const autoSize = item.context.autoSize as AutoSizeContext;

	if (autoSize.naturalWidth === undefined) delete autoSize.rootWidth;
	if (autoSize.naturalHeight === undefined) delete autoSize.rootHeight;

	const hasWidthInfo = autoSize.naturalWidth !== undefined || autoSize.rootWidth !== undefined;
	const hasHeightInfo = autoSize.naturalHeight !== undefined || autoSize.rootHeight !== undefined;

	if (!hasWidthInfo && !hasHeightInfo) {
		delete item.context.autoSize;
		if (!Object.keys(item.context).length) delete item.context;
	}
}
