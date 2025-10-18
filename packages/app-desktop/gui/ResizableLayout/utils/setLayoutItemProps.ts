import { produce } from 'immer';
import { AutoSizeContext, LayoutItem } from './types';
import validateLayout from './validateLayout';
import { cleanupAutoSizeContext, ensureAutoSizeContext } from './autoSizeUtils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export default function setLayoutItemProps(layout: LayoutItem, key: string, props: any) {
	const rootWidth = layout.width;
	const rootHeight = layout.height;

	return validateLayout(produce(layout, (draftState: LayoutItem) => {
		function updateAutoSize(item: LayoutItem, propName: string, value: unknown) {
			if (propName === 'width') {
				if (typeof value === 'number') {
					const autoSize = ensureAutoSizeContext(item);
					autoSize.naturalWidth = value;
					if (typeof rootWidth === 'number') autoSize.rootWidth = rootWidth;
				} else if (item.context?.autoSize) {
					const autoSize = item.context.autoSize as AutoSizeContext;
					delete autoSize.naturalWidth;
					delete autoSize.rootWidth;
					cleanupAutoSizeContext(item);
				}
				return;
			}

			if (propName === 'height') {
				if (typeof value === 'number') {
					const autoSize = ensureAutoSizeContext(item);
					autoSize.naturalHeight = value;
					if (typeof rootHeight === 'number') autoSize.rootHeight = rootHeight;
				} else if (item.context?.autoSize) {
					const autoSize = item.context.autoSize as AutoSizeContext;
					delete autoSize.naturalHeight;
					delete autoSize.rootHeight;
					cleanupAutoSizeContext(item);
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
				cleanupAutoSizeContext(item);
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
