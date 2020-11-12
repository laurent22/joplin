import * as React from 'react';
import { useRef, useState, useEffect } from 'react';
import produce from 'immer';
import useWindowResizeEvent from './utils/useWindowResizeEvent';
import useLayoutItemSizes, { LayoutItemSizes, itemSize } from './utils/useLayoutItemSizes';
import validateLayout from './utils/validateLayout';
import { Size, LayoutItem } from './utils/types';
import MoveButtons, { MoveButtonClickEvent } from './MoveButtons';
const { Resizable } = require('re-resizable');
const EventEmitter = require('events');

interface onResizeEvent {
	layout: LayoutItem
}

interface Props {
	layout: LayoutItem,
	onResize(event:onResizeEvent):void;
	width?: number,
	height?: number,
	renderItem: Function,
	onMoveButtonClick(event:MoveButtonClickEvent):void;
}

export function allDynamicSizes(layout:LayoutItem):any {
	const output:any = {};

	function recurseProcess(item:LayoutItem) {
		if (item.resizableBottom || item.resizableRight) {
			if ('width' in item || 'height' in item) {
				const size:any = {};
				if ('width' in item) size.width = item.width;
				if ('height' in item) size.height = item.height;
				output[item.key] = size;
			}
		}

		if (item.children) {
			for (const child of item.children) {
				recurseProcess(child);
			}
		}
	}

	recurseProcess(layout);

	return output;
}

export function findItemByKey(layout:LayoutItem, key:string):LayoutItem {
	function recurseFind(item:LayoutItem):LayoutItem {
		if (item.key === key) return item;

		if (item.children) {
			for (const child of item.children) {
				const found = recurseFind(child);
				if (found) return found;
			}
		}
		return null;
	}

	const output = recurseFind(layout);
	if (!output) throw new Error(`Invalid item key: ${key}`);
	return output;
}

function updateLayoutItem(layout:LayoutItem, key:string, props:any) {
	return produce(layout, (draftState:LayoutItem) => {
		function recurseFind(item:LayoutItem) {
			if (item.key === key) {
				for (const n in props) {
					(item as any)[n] = props[n];
				}
			} else {
				if (item.children) {
					for (const child of item.children) {
						recurseFind(child);
					}
				}
			}
		}

		recurseFind(draftState);
	});
}

function itemVisible(item:LayoutItem) {
	if (item.children && !item.children.length) return false;
	return item.visible !== false;
}

function renderContainer(item:LayoutItem, sizes:LayoutItemSizes, onResizeStart:Function, onResize:Function, onResizeStop:Function, children:any[], isLastChild:boolean):any {
	const style:any = {
		display: itemVisible(item) ? 'flex' : 'none',
		flexDirection: item.direction,
	};

	const size:Size = itemSize(item, sizes, true);

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
				onResizeStart={onResizeStart}
				onResize={onResize}
				onResizeStop={onResizeStop}
				enable={enable}
				minWidth={item.minWidth}
				minHeight={item.minHeight}
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

function ResizableLayout(props:Props) {
	const eventEmitter = useRef(new EventEmitter());

	const [resizedItem, setResizedItem] = useState<any>(null);

	function renderWrapper(comp:any, item:LayoutItem, size:Size) {
		return (
			<div key={item.key} style={{ border: '1px solid green', position: 'relative', display: 'flex', width: size.width, height: size.height }}>
				<div style={{ zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex' }}>
					<MoveButtons itemKey={item.key} onClick={props.onMoveButtonClick}/>
				</div>
				{comp}
			</div>
		);
	}

	function renderLayoutItem(item:LayoutItem, parent:LayoutItem, sizes:LayoutItemSizes, isVisible:boolean, isLastChild:boolean):any {

		function onResizeStart() {
			setResizedItem({
				key: item.key,
				initialWidth: sizes[item.key].width,
				initialHeight: sizes[item.key].height,
			});
		}

		function onResize(_event:any, _direction:any, _refToElement: HTMLDivElement, delta:any) {
			const newLayout = updateLayoutItem(props.layout, item.key, {
				width: resizedItem.initialWidth + delta.width,
				height: resizedItem.initialHeight + delta.height,
			});

			props.onResize({ layout: newLayout });
			eventEmitter.current.emit('resize');
		}

		function onResizeStop(_event:any, _direction:any, _refToElement: HTMLDivElement, delta:any) {
			onResize(_event, _direction, _refToElement, delta);
			setResizedItem(null);
		}

		if (!item.children) {
			const size = itemSize(item, sizes, false);

			const comp = props.renderItem(item.key, {
				item: item,
				eventEmitter: eventEmitter.current,
				size: size,
				visible: isVisible,
			});

			const wrapper = parent.children.length > 1 ? renderWrapper(comp, item, size) : comp;

			return renderContainer(item, sizes, onResizeStart, onResize, onResizeStop, [wrapper], isLastChild);
		} else {
			const childrenComponents = [];
			for (let i = 0; i < item.children.length; i++) {
				const child = item.children[i];
				childrenComponents.push(renderLayoutItem(child, item, sizes, isVisible && itemVisible(child), i === item.children.length - 1));
			}

			return renderContainer(item, sizes, onResizeStart, onResize, onResizeStop, childrenComponents, isLastChild);
		}
	}

	useEffect(() => {
		validateLayout(props.layout);
	}, [props.layout]);

	useWindowResizeEvent(eventEmitter);
	const sizes = useLayoutItemSizes(props.layout);

	return renderLayoutItem(props.layout, null, sizes, itemVisible(props.layout), true);
}

export default ResizableLayout;
