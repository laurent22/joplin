import * as React from 'react';
import { Resizable, ResizeCallback, ResizeStartCallback, Size } from 're-resizable';
import { LayoutItem, LayoutItemDirection } from './utils/types';
import { EdgeFlags, itemMinHeight, itemMinWidth, itemSize, LayoutItemSizes } from './utils/useLayoutItemSizes';

interface Props {
	item: LayoutItem;
	parent: LayoutItem|null;
	sizes: LayoutItemSizes;
	resizedItemMaxSize: Size|null;
	onResizeStart: ResizeStartCallback;
	onResize: ResizeCallback;
	onResizeStop: ResizeCallback;
	children: React.ReactNode;
	isLastChild: boolean;
	visible: boolean;
	edges: EdgeFlags;
}

const LayoutItemContainer: React.FC<Props> = ({
	item, visible, parent, sizes, resizedItemMaxSize, onResize, onResizeStart, onResizeStop, children, isLastChild, edges,
}) => {
	const style: React.CSSProperties = {
		display: visible ? 'flex' : 'none',
		flexDirection: item.direction,
	};

	const size: Size = itemSize(item, parent, sizes, true, edges);

	// Drag rules follow the runtime "last visible in render" flag so hidden
	// panels shown by moveMode still get proper dividers.
	const parentDir = parent?.direction;
	const canResizeRight = parentDir === LayoutItemDirection.Row && !isLastChild;
	const canResizeBottom = parentDir === LayoutItemDirection.Column && !isLastChild;

	const className = `resizableLayoutItem rli-${item.key}`;
	if (canResizeRight || canResizeBottom) {
		const enable = {
			top: false,
			right: canResizeRight,
			bottom: canResizeBottom,
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
				onResizeStart={onResizeStart}
				onResize={onResize}
				onResizeStop={onResizeStop}
				enable={enable}
				minWidth={'minWidth' in item ? item.minWidth : itemMinWidth}
				minHeight={'minHeight' in item ? item.minHeight : itemMinHeight}
				maxWidth={resizedItemMaxSize?.width}
				maxHeight={resizedItemMaxSize?.height}
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
};

export default LayoutItemContainer;
