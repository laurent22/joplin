import * as React from 'react';
import ToolbarButton from './ToolbarButton/ToolbarButton';
import ToggleEditorsButton, { Value } from './ToggleEditorsButton/ToggleEditorsButton';
import ToolbarSpace from './ToolbarSpace';
import { ToolbarItem } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import { AppState } from '../app.reducer';
import { connect } from 'react-redux';
import { useCallback, useMemo, useRef, useState } from 'react';
import { focus } from '@joplin/lib/utils/focusHandler';

interface Props {
	themeId: number;
	scrollable: boolean;
	style: React.CSSProperties;
	items: ToolbarItem[];
	disabled: boolean;
	'aria-label': string;
	id?: string;
}

const getItemType = (item: ToolbarItem) => {
	return item.type ?? 'button';
};

const isFocusable = (item: ToolbarItem) => {
	if (!item.enabled) {
		return false;
	}

	return getItemType(item) === 'button';
};

const useCategorizedItems = (items: ToolbarItem[]) => {
	return useMemo(() => {
		const itemsLeft: ToolbarItem[] = [];
		const itemsCenter: ToolbarItem[] = [];
		const itemsRight: ToolbarItem[] = [];

		if (items) {
			for (const item of items) {
				const type = getItemType(item);
				if (item.name === 'toggleEditors') {
					itemsRight.push(item);
				} else if (type === 'button') {
					const target = ['historyForward', 'historyBackward', 'toggleExternalEditing'].includes(item.name) ? itemsLeft : itemsCenter;
					target.push(item);
				} else if (type === 'separator') {
					itemsCenter.push(item);
				}
			}
		}

		return {
			itemsLeft,
			itemsCenter,
			itemsRight,
			allItems: itemsLeft.concat(itemsCenter, itemsRight),
		};
	}, [items]);
};

const useKeyboardHandler = (
	setSelectedIndex: React.Dispatch<React.SetStateAction<number>>,
	focusableItems: ToolbarItem[],
) => {
	const onKeyDown: React.KeyboardEventHandler<HTMLElement> = useCallback(event => {
		let direction = 0;
		if (event.code === 'ArrowRight') {
			direction = 1;
		} else if (event.code === 'ArrowLeft') {
			direction = -1;
		}

		let handled = true;
		if (direction !== 0) {
			setSelectedIndex(index => {
				let newIndex = (index + direction) % focusableItems.length;
				if (newIndex < 0) {
					newIndex += focusableItems.length;
				}
				return newIndex;
			});
		} else if (event.code === 'End') {
			setSelectedIndex(focusableItems.length - 1);
		} else if (event.code === 'Home') {
			setSelectedIndex(0);
		} else {
			handled = false;
		}

		if (handled) {
			event.preventDefault();
		}
	}, [focusableItems, setSelectedIndex]);

	return onKeyDown;
};

const ToolbarBaseComponent: React.FC<Props> = props => {
	const { itemsLeft, itemsCenter, itemsRight, allItems } = useCategorizedItems(props.items);

	const [selectedIndex, setSelectedIndex] = useState(0);
	const focusableItems = useMemo(() => {
		return allItems.filter(isFocusable);
	}, [allItems]);
	const containerRef = useRef<HTMLDivElement|null>(null);
	const doc = containerRef.current?.ownerDocument;
	const containerHasFocus = !!containerRef.current?.contains(doc?.activeElement);

	let keyCounter = 0;
	const renderItem = (o: ToolbarItem, indexInFocusable: number) => {
		let key = o.iconName ? o.iconName : '';
		key += o.title ? o.title : '';
		key += o.name ? o.name : '';

		if (!key) key = `${o.type}_${keyCounter++}`;

		const buttonProps = {
			key,
			themeId: props.themeId,
			disabled: props.disabled || !o.enabled,
			...o,
		};

		const tabIndex = indexInFocusable === (selectedIndex % focusableItems.length) ? 0 : -1;
		const setButtonRefCallback = (button: HTMLButtonElement) => {
			if (tabIndex === 0 && containerHasFocus) {
				focus('ToolbarBase', button);
			}
		};

		if (o.type === 'button' && o.name === 'toggleEditors') {
			return <ToggleEditorsButton
				key={o.name}
				buttonRef={setButtonRefCallback}
				value={Value.Markdown}
				themeId={props.themeId}
				toolbarButtonInfo={o}
				tabIndex={tabIndex}
			/>;
		} else if (o.type === 'button') {
			return (
				<ToolbarButton
					tabIndex={tabIndex}
					buttonRef={setButtonRefCallback}
					{...buttonProps}
				/>
			);
		} else if (o.type === 'separator') {
			return <ToolbarSpace {...buttonProps} />;
		}

		return null;
	};

	let focusableIndex = 0;
	const renderList = (items: ToolbarItem[]) => {
		const result: React.ReactNode[] = [];

		for (const item of items) {
			result.push(renderItem(item, focusableIndex));
			if (isFocusable(item)) {
				focusableIndex ++;
			}
		}

		return result;
	};

	const leftItemComps = renderList(itemsLeft);
	const centerItemComps = renderList(itemsCenter);
	const rightItemComps = renderList(itemsRight);

	const onKeyDown = useKeyboardHandler(
		setSelectedIndex,
		focusableItems,
	);

	return (
		<div
			ref={containerRef}
			className={`editor-toolbar ${props.scrollable ? '-scrollable' : ''}`}
			style={props.style}

			id={props.id ?? undefined}
			role='toolbar'
			aria-label={props['aria-label']}

			onKeyDown={onKeyDown}
		>
			<div className='group'>
				{leftItemComps}
			</div>
			<div className='group'>
				{centerItemComps}
			</div>
			<div className='spacer' />
			<div className='group'>
				{rightItemComps}
			</div>
		</div>
	);
};

const mapStateToProps = (state: AppState) => {
	return { themeId: state.settings.theme };
};

export default connect(mapStateToProps)(ToolbarBaseComponent);
