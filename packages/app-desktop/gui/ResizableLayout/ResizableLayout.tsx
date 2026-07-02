import * as React from 'react';
import { useRef, useState, useEffect, useCallback } from 'react';
import useWindowResizeEvent from './utils/useWindowResizeEvent';
import setLayoutItemProps from './utils/setLayoutItemProps';
import useLayoutItemSizes, { LayoutItemSizes, itemSize, calculateMaxSizeAvailableForItem, itemMinWidth, itemMinHeight } from './utils/useLayoutItemSizes';
import validateLayout from './utils/validateLayout';
import { Size, LayoutItem } from './utils/types';
import { canMove, MoveDirection } from './utils/movements';
import MoveButtons, { MoveButtonClickEvent } from './MoveButtons';
import { StyledWrapperRoot, StyledMoveOverlay, MoveModeRootMessage } from './utils/style';
import type { ResizeCallback, ResizeStartCallback } from 're-resizable';
import Dialog from '@joplin/lib/components/Dialog';
import EventEmitter = require('events');
import LayoutItemContainer from './LayoutItemContainer';

interface OnResizeEvent {
	layout: LayoutItem;
}

interface ResizedItem {
	key: string;
	initialWidth: number;
	initialHeight: number;
	maxSize: Size;
	// A divider drag updates the dragged item and its next visible sibling,
	// so the delta stays between the two panels on either side of it.
	nextSiblingKey: string | null;
	nextSiblingInitialWidth: number;
	nextSiblingInitialHeight: number;
	itemAbsorbsAlongAxis: { width: boolean; height: boolean };
	nextAbsorbsAlongAxis: { width: boolean; height: boolean };
}

export interface RenderItemEvent {
	eventEmitter: EventEmitter;
	visible: boolean;
	size: Size;
	item: LayoutItem;
}

interface Props {
	layout: LayoutItem;
	layoutKeyToLabel: (key: string)=> string;
	onResize(event: OnResizeEvent): void;
	width?: number;
	height?: number;
	renderItem: (key: string, event: RenderItemEvent)=> React.ReactNode;
	onMoveButtonClick(event: MoveButtonClickEvent): void;
	moveMode: boolean;
	moveModeMessage: string;
}

function itemVisible(item: LayoutItem, moveMode: boolean) {
	if (moveMode) return true;
	if (item.children && !item.children.length) return false;
	return item.visible !== false;
}

function ResizableLayout(props: Props) {
	const eventEmitter = useRef(new EventEmitter());

	const [resizedItem, setResizedItem] = useState<ResizedItem|null>(null);
	const lastUsedMoveButtonKey = useRef<string|null>(null);

	const onMoveButtonClick = useCallback((event: MoveButtonClickEvent) => {
		lastUsedMoveButtonKey.current = event.buttonKey;
		props.onMoveButtonClick(event);
	}, [props.onMoveButtonClick]);

	const renderMoveControls = (item: LayoutItem, parent: LayoutItem | null, size: Size) => {
		return (
			<StyledWrapperRoot key={item.key} size={size}>
				<StyledMoveOverlay>
					<MoveButtons
						autoFocusKey={lastUsedMoveButtonKey.current}
						itemKey={item.key}
						itemLabel={props.layoutKeyToLabel(item.key)}
						onClick={onMoveButtonClick}
						canMoveLeft={canMove(MoveDirection.Left, item, parent)}
						canMoveRight={canMove(MoveDirection.Right, item, parent)}
						canMoveUp={canMove(MoveDirection.Up, item, parent)}
						canMoveDown={canMove(MoveDirection.Down, item, parent)}
					/>
				</StyledMoveOverlay>
			</StyledWrapperRoot>
		);
	};

	function renderItemWrapper(comp: React.ReactNode, item: LayoutItem, size: Size) {
		return (
			<StyledWrapperRoot key={item.key} size={size}>
				{comp}
			</StyledWrapperRoot>
		);
	}

	function renderLayoutItem(
		item: LayoutItem, parent: LayoutItem | null, sizes: LayoutItemSizes, isVisible: boolean, isLastChild: boolean, onlyMoveControls: boolean,
	): React.ReactNode {
		const onResizeStart: ResizeStartCallback = () => {
			let nextSiblingKey: string | null = null;
			const nextAbsorbsAlongAxis = { width: false, height: false };
			if (parent) {
				const siblings = parent.children;
				const idx = siblings.findIndex(c => c.key === item.key);
				for (let i = idx + 1; i < siblings.length; i++) {
					if (siblings[i].visible !== false) {
						nextSiblingKey = siblings[i].key;
						nextAbsorbsAlongAxis.width = !('width' in siblings[i]);
						nextAbsorbsAlongAxis.height = !('height' in siblings[i]);
						break;
					}
				}
			}

			setResizedItem({
				key: item.key,
				initialWidth: sizes[item.key].width,
				initialHeight: sizes[item.key].height,
				maxSize: calculateMaxSizeAvailableForItem(item, parent, sizes),
				nextSiblingKey,
				nextSiblingInitialWidth: nextSiblingKey ? sizes[nextSiblingKey].width : 0,
				nextSiblingInitialHeight: nextSiblingKey ? sizes[nextSiblingKey].height : 0,
				itemAbsorbsAlongAxis: {
					width: !('width' in item),
					height: !('height' in item),
				},
				nextAbsorbsAlongAxis,
			});
		};

		const onResize: ResizeCallback = (_event, direction, _refToElement, delta) => {
			// The absorber (width/height-less side) is skipped so the layout
			// system keeps it flexible.
			const isHorizontal = direction !== 'bottom';
			const minSize = isHorizontal ? itemMinWidth : itemMinHeight;
			const rawDelta = isHorizontal ? delta.width : delta.height;

			const itemIsAbsorber = isHorizontal ? resizedItem.itemAbsorbsAlongAxis.width : resizedItem.itemAbsorbsAlongAxis.height;
			const nextIsAbsorber = isHorizontal ? resizedItem.nextAbsorbsAlongAxis.width : resizedItem.nextAbsorbsAlongAxis.height;

			let newLayout = props.layout;

			if (!itemIsAbsorber) {
				const initial = isHorizontal ? resizedItem.initialWidth : resizedItem.initialHeight;
				const newSize = Math.max(minSize, initial + rawDelta);
				newLayout = setLayoutItemProps(newLayout, resizedItem.key, isHorizontal ? { width: newSize } : { height: newSize });
			}

			if (!nextIsAbsorber && resizedItem.nextSiblingKey) {
				const initial = isHorizontal ? resizedItem.nextSiblingInitialWidth : resizedItem.nextSiblingInitialHeight;
				const newSize = Math.max(minSize, initial - rawDelta);
				newLayout = setLayoutItemProps(newLayout, resizedItem.nextSiblingKey, isHorizontal ? { width: newSize } : { height: newSize });
			}

			props.onResize({ layout: newLayout });
			eventEmitter.current.emit('resize');
		};

		const onResizeStop: ResizeCallback = (_event, _direction, _refToElement, delta) => {
			onResize(_event, _direction, _refToElement, delta);
			setResizedItem(null);
		};

		const resizedItemMaxSize = resizedItem && item.key === resizedItem.key ? resizedItem.maxSize : null;
		const visible = itemVisible(item, props.moveMode);
		const itemContainerProps = {
			key: item.key, item, parent, sizes, resizedItemMaxSize, onResizeStart, onResizeStop, onResize, isLastChild, visible,
		};
		if (!item.children) {
			const size = itemSize(item, parent, sizes, false);

			const comp = props.renderItem(item.key, {
				item: item,
				eventEmitter: eventEmitter.current,
				size: size,
				visible: isVisible,
			});

			const wrapper = onlyMoveControls ? renderMoveControls(item, parent, size) : renderItemWrapper(comp, item, size);
			return <LayoutItemContainer {...itemContainerProps}>
				{wrapper}
			</LayoutItemContainer>;
		} else {
			const childrenComponents = [];
			for (let i = 0; i < item.children.length; i++) {
				const child = item.children[i];
				childrenComponents.push(
					renderLayoutItem(child, item, sizes, isVisible && itemVisible(child, props.moveMode), i === item.children.length - 1, onlyMoveControls),
				);
			}

			return <LayoutItemContainer {...itemContainerProps}>
				{childrenComponents}
			</LayoutItemContainer>;
		}
	}

	useEffect(() => {
		validateLayout(props.layout);
	}, [props.layout]);

	useWindowResizeEvent(eventEmitter);
	const sizes = useLayoutItemSizes(props.layout, props.moveMode);

	const renderRoot = (moveControlsOnly: boolean) => {
		return renderLayoutItem(props.layout, null, sizes, itemVisible(props.layout, props.moveMode), true, moveControlsOnly);
	};

	function renderMoveModeBox() {
		return <div>
			<Dialog contentFillsScreen={true} className='change-app-layout-dialog'>
				<MoveModeRootMessage>{props.moveModeMessage}</MoveModeRootMessage>
				{renderRoot(true)}
			</Dialog>
			{renderRoot(false)}
		</div>;
	}

	if (props.moveMode) {
		return renderMoveModeBox();
	} else {
		return renderRoot(false);
	}
}

export default ResizableLayout;
