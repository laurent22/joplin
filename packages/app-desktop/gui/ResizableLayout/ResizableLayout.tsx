import * as React from 'react';
import { useRef, useState, useEffect } from 'react';
import useWindowResizeEvent from './utils/useWindowResizeEvent';
import setLayoutItemProps from './utils/setLayoutItemProps';
import useLayoutItemSizes, { LayoutItemSizes, itemSize } from './utils/useLayoutItemSizes';
import validateLayout from './utils/validateLayout';
import { Size, LayoutItem } from './utils/types';
import { canMove, MoveDirection } from './utils/movements';
import MoveButtons, { MoveButtonClickEvent } from './MoveButtons';
import { StyledWrapperRoot, StyledMoveOverlay, MoveModeRootWrapper, MoveModeRootMessage } from './utils/style';
import { Resizable } from 're-resizable';
const EventEmitter = require('events');

interface onResizeEvent {
	layout: LayoutItem;
}

interface Props {
	layout: LayoutItem;
	onResize(event: onResizeEvent): void;
	width?: number;
	height?: number;
	renderItem: Function;
	onMoveButtonClick(event: MoveButtonClickEvent): void;
	moveMode: boolean;
	moveModeMessage: string;
}

function itemVisible(item: LayoutItem, moveMode: boolean) {
	if (moveMode) return true;
	if (item.children && !item.children.length) return false;
	return item.visible !== false;
}

function renderContainer(item: LayoutItem, parent: LayoutItem | null, sizes: LayoutItemSizes, onResizeStart: Function, onResize: Function, onResizeStop: Function, children: any[], isLastChild: boolean, moveMode: boolean): any {
	const style: any = {
		display: itemVisible(item, moveMode) ? 'flex' : 'none',
		flexDirection: item.direction,
	};

	const size: Size = itemSize(item, parent, sizes, true);

	const className = `resizableLayoutItem rli-${item.key}`;
	if (item.resizableRight || item.resizableBottom) {
		const enable = {
			top: false,
			right: !!item.resizableRight && !isLastChild,
			bottom: !!item.resizableBottom && !isLastChild,
			left: false,
			topRight: false,
			bottomRight: false,
			bottomLeft: false,
			topLeft: false,
		};

		return (
			<Resizable
				key={item.key}
				className={className}
				style={style}
				size={size}
				onResizeStart={onResizeStart as any}
				onResize={onResize as any}
				onResizeStop={onResizeStop as any}
				enable={enable}
				minWidth={sizes[item.key].min.width}
				minHeight={sizes[item.key].min.height}
				maxWidth={sizes[item.key].max.width}
				maxHeight={sizes[item.key].max.height}
			>
				{children}
			</Resizable>
		);
	} else {
		return (
			<div key={item.key} className={className} style={{ ...style, ...size }}>
				{children}
			</div>
		);
	}
}

function ResizableLayout(props: Props) {
	const eventEmitter = useRef(new EventEmitter());

	const [resizedItem, setResizedItem] = useState<any>(null);

	function renderItemWrapper(comp: any, item: LayoutItem, parent: LayoutItem | null, size: Size, moveMode: boolean) {
		const moveOverlay = moveMode ? (
			<StyledMoveOverlay>
				<MoveButtons
					itemKey={item.key}
					onClick={props.onMoveButtonClick}
					canMoveLeft={canMove(MoveDirection.Left, item, parent)}
					canMoveRight={canMove(MoveDirection.Right, item, parent)}
					canMoveUp={canMove(MoveDirection.Up, item, parent)}
					canMoveDown={canMove(MoveDirection.Down, item, parent)}
				/>
			</StyledMoveOverlay>
		) : null;

		return (
			<StyledWrapperRoot key={item.key} size={size}>
				{moveOverlay}
				{comp}
			</StyledWrapperRoot>
		);
	}

	function renderLayoutItem(item: LayoutItem, parent: LayoutItem | null, sizes: LayoutItemSizes, isVisible: boolean, isLastChild: boolean): any {
		function onResizeStart() {
			setResizedItem({
				key: item.key,
				initialSize: sizes[item.key].current,
				maxSize: sizes[item.key].max,
				minSize: sizes[item.key].min,
			});
		}

		function onResize(_event: any, direction: string, _refToElement: any, delta: any) {
			let newWidth = Math.max(resizedItem.minSize.width, resizedItem.initialSize.width + delta.width);
			let newHeight = Math.max(resizedItem.minSize.height, resizedItem.initialSize.height + delta.height);

			newWidth = Math.min(newWidth, resizedItem.maxSize.width);
			newHeight = Math.min(newHeight, resizedItem.maxSize.height);

			const newSize: any = {};

			if (item.width) newSize.width = item.width;
			if (item.height) newSize.height = item.height;

			if (direction === 'bottom') {
				newSize.height = newHeight;
			} else {
				newSize.width = newWidth;
			}

			const newLayout = setLayoutItemProps(props.layout, item.key, newSize);

			props.onResize({ layout: newLayout });
			eventEmitter.current.emit('resize');
		}

		function onResizeStop(_event: any, _direction: any, _refToElement: any, delta: any) {
			onResize(_event, _direction, _refToElement, delta);
			setResizedItem(null);
		}

		if (!item.children) {
			const size = itemSize(item, parent, sizes, false);

			const comp = props.renderItem(item.key, {
				item: item,
				eventEmitter: eventEmitter.current,
				size: size,
				visible: isVisible,
			});

			const wrapper = renderItemWrapper(comp, item, parent, size, props.moveMode);

			return renderContainer(item, parent, sizes, onResizeStart, onResize, onResizeStop, [wrapper], isLastChild, props.moveMode);
		} else {
			const childrenComponents = [];
			for (let i = 0; i < item.children.length; i++) {
				const child = item.children[i];
				childrenComponents.push(renderLayoutItem(child, item, sizes, isVisible && itemVisible(child, props.moveMode), i === item.children.length - 1));
			}

			return renderContainer(item, parent, sizes, onResizeStart, onResize, onResizeStop, childrenComponents, isLastChild, props.moveMode);
		}
	}

	useEffect(() => {
		validateLayout(props.layout);
	}, [props.layout]);

	useWindowResizeEvent(eventEmitter);
	const sizes = useLayoutItemSizes(props.layout, props.moveMode);

	function renderMoveModeBox(rootComp: any) {
		return (
			<MoveModeRootWrapper>
				<MoveModeRootMessage>{props.moveModeMessage}</MoveModeRootMessage>
				{rootComp}
			</MoveModeRootWrapper>
		);
	}

	const rootComp = renderLayoutItem(props.layout, null, sizes, itemVisible(props.layout, props.moveMode), true);

	if (props.moveMode) {
		return renderMoveModeBox(rootComp);
	} else {
		return rootComp;
	}
}

export default ResizableLayout;
