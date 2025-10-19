import { produce } from 'immer';
import iterateItems from './iterateItems';
import { LayoutItem, LayoutItemDirection, Size } from './types';
import { itemMinHeight, itemMinWidth } from './useLayoutItemSizes';
import validateLayout from './validateLayout';
import { cleanupAutoSizeContext, currentAutoSizeContext, ensureAutoSizeContext } from './autoSizeUtils';

function clampToMinimum(value: number, minimum: number) {
	return Math.max(minimum, Math.round(value));
}

function safeRatio(value: number) {
	if (!Number.isFinite(value) || value <= 0) return 1;
	return value;
}

// Scales panel sizes proportionally when the window is resized.
// Tracks "natural" sizes (before min-size constraints) to avoid cumulative scaling errors
// when the window is repeatedly resized to/from minimum dimensions.
export default function scaleLayoutItemSizes(layout: LayoutItem, newRootSize: Size, widthRatio: number, heightRatio: number): LayoutItem {
	const ratioX = safeRatio(widthRatio);
	const ratioY = safeRatio(heightRatio);

	// Previous window size calculated from ratio
	const referenceRootWidth = newRootSize.width / ratioX;
	const referenceRootHeight = newRootSize.height / ratioY;

	const scaledLayout = produce(layout, (draft: LayoutItem) => {
		iterateItems(draft, (_itemIndex: number, item: LayoutItem, parent: LayoutItem) => {
			if (!parent) {
				item.width = newRootSize.width;
				item.height = newRootSize.height;
				return true;
			}

			const autoSize = currentAutoSizeContext(item);

			if (parent.direction === LayoutItemDirection.Row) {
				const hasExplicitWidth = typeof item.width === 'number';
				const hasNaturalWidth = typeof autoSize?.naturalWidth === 'number';

				if (hasExplicitWidth || hasNaturalWidth) {
					const ensuredAutoSize = autoSize ?? ensureAutoSizeContext(item);

					// Store reference window width for this panel's natural width
					if (typeof ensuredAutoSize.rootWidth !== 'number') {
						ensuredAutoSize.rootWidth = referenceRootWidth;
					}

					// Calculate natural width (before min-size clamping) if not already tracked
					if (typeof ensuredAutoSize.naturalWidth !== 'number' && hasExplicitWidth) {
						const targetReferenceWidth = ensuredAutoSize.rootWidth;
						const sourceReferenceWidth = referenceRootWidth;
						const widthValue = item.width;

						if (sourceReferenceWidth > 0) {
							ensuredAutoSize.naturalWidth = widthValue * (targetReferenceWidth / sourceReferenceWidth);
						} else {
							ensuredAutoSize.naturalWidth = widthValue;
						}
					}

					// Scale from natural width, then apply min-size constraint
					const baseWidth = ensuredAutoSize.naturalWidth ?? (hasExplicitWidth ? item.width : null);
					if (typeof baseWidth === 'number') {
						const referenceWidth = ensuredAutoSize.rootWidth;
						const scaleFactor = newRootSize.width / referenceWidth;
						const scaledWidth = baseWidth * scaleFactor;
						const minimumWidth = item.minWidth || itemMinWidth;
						item.width = clampToMinimum(scaledWidth, minimumWidth);
					}
				}

				cleanupAutoSizeContext(item);
			} else if (parent.direction === LayoutItemDirection.Column) {
				// Same logic as Row, but for height
				const hasExplicitHeight = typeof item.height === 'number';
				const hasNaturalHeight = typeof autoSize?.naturalHeight === 'number';

				if (hasExplicitHeight || hasNaturalHeight) {
					const ensuredAutoSize = autoSize ?? ensureAutoSizeContext(item);

					if (typeof ensuredAutoSize.rootHeight !== 'number') {
						ensuredAutoSize.rootHeight = referenceRootHeight;
					}

					if (typeof ensuredAutoSize.naturalHeight !== 'number' && hasExplicitHeight) {
						const targetReferenceHeight = ensuredAutoSize.rootHeight;
						const sourceReferenceHeight = referenceRootHeight;
						const heightValue = item.height;

						if (sourceReferenceHeight > 0) {
							ensuredAutoSize.naturalHeight = heightValue * (targetReferenceHeight / sourceReferenceHeight);
						} else {
							ensuredAutoSize.naturalHeight = heightValue;
						}
					}

					const baseHeight = ensuredAutoSize.naturalHeight ?? (hasExplicitHeight ? item.height : null);
					if (typeof baseHeight === 'number') {
						const referenceHeight = ensuredAutoSize.rootHeight;
						const scaleFactor = newRootSize.height / referenceHeight;
						const scaledHeight = baseHeight * scaleFactor;
						const minimumHeight = item.minHeight || itemMinHeight;
						item.height = clampToMinimum(scaledHeight, minimumHeight);
					}
				}

				cleanupAutoSizeContext(item);
			}

			return true;
		});
	});

	return validateLayout(scaledLayout);
}
