import * as React from 'react';
import { useRef } from 'react';
import produce from 'immer';
import useWindowResizeEvent from './hooks/useWindowResizeEvent';
import useLayoutItemSizes, { LayoutItemSizes, itemSize } from './hooks/useLayoutItemSizes';
const { Resizable } = require('re-resizable');
const EventEmitter = require('events');

enum LayoutItemDirection {
	Row = 'row',
	Column = 'column',
}

export interface Size {
	width: number,
	height: number,
}

export interface LayoutItem {
	key: string,
	width?: number,
	height?: number,
	children: LayoutItem[]
	direction: LayoutItemDirection,
	resizable: boolean,
}

interface onResizeEvent {
	layout: LayoutItem
}

interface Props {
	themeId: number,
	style: any,
	layout: LayoutItem,
	renderItem(key:string, event:any):JSX.Element;
	onResize(event:onResizeEvent):void;
	width?: number,
	height?: number,
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

function renderContainer(item:LayoutItem, sizes:LayoutItemSizes, onResize:Function, children:JSX.Element[]):JSX.Element {
	const style:any = {
		display: 'flex',
		flexDirection: item.direction,
	};

	const size:Size = itemSize(item, sizes);

	const className = `resizableLayoutItem rli-${item.key}`;
	if (item.resizable) {
		const enable = { top: false, right: true, bottom: false, left: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false };

		return (
			<Resizable key={item.key} className={className} style={style} size={size} onResizeStop={onResize} enable={enable}>
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

	function renderLayoutItem(item:LayoutItem, sizes:LayoutItemSizes):JSX.Element {

		const onResize = (_event:any, _direction:any, _refToElement: HTMLDivElement, delta:any) => {
			const size = sizes[item.key];
			const newLayout = updateLayoutItem(props.layout, item.key, {
				width: size.width + delta.width,
			});

			props.onResize({ layout: newLayout });
			eventEmitter.current.emit('resize');
		};

		if (!item.children) {
			const comp = props.renderItem(item.key, {
				item: item,
				eventEmitter: eventEmitter.current,
				size: sizes[item.key],
			});

			return renderContainer(item, sizes, onResize, [comp]);
		} else {
			const childrenComponents = [];
			for (const child of item.children) {
				childrenComponents.push(renderLayoutItem(child, sizes));
			}

			return renderContainer(item, sizes, onResize, childrenComponents);
		}
	}

	useWindowResizeEvent(eventEmitter);
	const sizes = useLayoutItemSizes(props.layout);

	return renderLayoutItem(props.layout, sizes);
}

export default ResizableLayout;
