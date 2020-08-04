import * as React from 'react';
import { useRef, useEffect } from 'react';
import produce from 'immer';
const { Resizable } = require('re-resizable');
const EventEmitter = require('events');
const debounce = require('debounce');

interface LayoutComponent {
	key: string,
}

enum LayoutContainerDirection {
	Row = 'row',
	Column = 'column',
}

interface LayoutContainer {
	key: string,
	children: LayoutComponent[] | LayoutContainer[]
	direction: LayoutContainerDirection,
	resizable: boolean,
	width?: number,
	height?: number,
	widthExpand?: boolean,
	heightExpand?: boolean,
}

interface OnResizeStopEvent {
	layout: LayoutContainer
}

interface Props {
	theme: number,
	style: any,
	layout: LayoutContainer,
	renderItem(key:string, event:any):JSX.Element;
	onResizeStop(event:OnResizeStopEvent):void;
}

export function findItemByKey(layout:LayoutContainer, key:string):LayoutContainer | LayoutComponent {
	function recurseFind(item:LayoutContainer | LayoutComponent):LayoutContainer | LayoutComponent {
		if (item.key === key) {
			return item;
		} else {
			if ('children' in item) {
				const container = item as LayoutContainer;
				for (const child of container.children) {
					const found = recurseFind(child);
					if (found) return found;
				}
			}
		}
		return null;
	}

	const output = recurseFind(layout);
	if (!output) throw new Error(`Invalid item key: ${key}`);
	return output;
}

function updateLayoutItem(layout:LayoutContainer, key:string, props:any) {
	// console.info('Update', key, props);

	return produce(layout, (draftState:LayoutContainer) => {
		function recurseFind(item:LayoutContainer | LayoutComponent) {
			if (item.key === key) {
				for (const n in props) {
					(item as any)[n] = props[n];
				}
			} else {
				if ('children' in item) {
					const container = item as LayoutContainer;
					for (const child of container.children) {
						recurseFind(child);
					}
				}
			}
		}

		recurseFind(draftState);
	});
}

function useWindowResizeEvent(eventEmitter:any) {
	useEffect(() => {
		const window_resize = debounce(() => {
			eventEmitter.current.emit('resize');
		}, 500);

		window.addEventListener('resize', window_resize);

		return () => {
			window_resize.clear();
			window.removeEventListener('resize', window_resize);
		};
	}, []);
}

function ResizableLayout(props:Props) {
	const eventEmitter = useRef(new EventEmitter());

	function renderLayoutItem(item:LayoutContainer | LayoutComponent, isRootContainer:boolean = false) {
		if ('children' in item) {
			const container = item as LayoutContainer;
			const childrenComponents = [];

			for (const child of item.children) {
				childrenComponents.push(renderLayoutItem(child));
			}

			const style:any = {
				display: 'flex',
				flexDirection: container.direction,
			};

			const size:any = {
				height: '100%',
			};

			if ('width' in container) {
				size.width = container.width;
				size.minWidth = container.width;
			} else if (container.widthExpand) {
				size.width = '100%';
			}

			if (isRootContainer) {
				if ('width' in props.style) size.width = props.style.width;
				if ('height' in props.style) size.height = props.style.height;
			}

			if (container.resizable) {
				const onResizeStop = (_event:any, _direction:any, _refToElement: HTMLDivElement, delta:any) => {
					const newLayout = updateLayoutItem(props.layout, container.key, { width: size.width + delta.width });
					props.onResizeStop({ layout: newLayout });
					eventEmitter.current.emit('resize');
				};

				const enable = { top: false, right: true, bottom: false, left: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false };

				return (
					<Resizable key={container.key} style={style} size={size} onResizeStop={onResizeStop} enable={enable}>
						{childrenComponents}
					</Resizable>
				);
			} else {
				return (
					<div key={container.key} style={{ ...style, ...size }}>
						{childrenComponents}
					</div>
				);
			}
		} else {
			const c = item as LayoutComponent;
			return props.renderItem(c.key, {
				item: c,
				eventEmitter: eventEmitter.current,
			});
		}
	}

	useWindowResizeEvent(eventEmitter);

	return renderLayoutItem(props.layout, true);
}

export default ResizableLayout;
