import * as React from 'react';
import ToolbarButton from './ToolbarButton/ToolbarButton';
import ToggleEditorsButton, { Value } from './ToggleEditorsButton/ToggleEditorsButton';
import ToolbarSpace from './ToolbarSpace';
import { ToolbarButtonInfo } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import { AppState } from '../app.reducer';
import { connect } from 'react-redux';
import { useCallback, useMemo, useRef, useState } from 'react';
import { focus } from '@joplin/lib/utils/focusHandler';

interface ToolbarItemInfo extends ToolbarButtonInfo {
	type?: string;
}

interface Props {
	themeId: number;
	style: React.CSSProperties;
	items: ToolbarItemInfo[];
	disabled: boolean;
	'aria-label': string;
}

const getItemType = (item: ToolbarItemInfo) => {
	return item.type ?? 'button';
};

const isFocusable = (item: ToolbarItemInfo) => {
	if (!item.enabled) {
		return false;
	}

	return getItemType(item) === 'button';
};

const useCategorizedItems = (items: ToolbarItemInfo[]) => {
	return useMemo(() => {
		const itemsLeft: ToolbarItemInfo[] = [];
		const itemsCenter: ToolbarItemInfo[] = [];
		const itemsRight: ToolbarItemInfo[] = [];

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
	focusableItems: ToolbarItemInfo[],
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
	const containerHasFocus = !!containerRef.current?.contains(document.activeElement);

	let keyCounter = 0;
	const renderItem = (o: ToolbarItemInfo, indexInFocusable: number) => {
		let key = o.iconName ? o.iconName : '';
		key += o.title ? o.title : '';
		key += o.name ? o.name : '';
		const itemType = !('type' in o) ? 'button' : o.type;

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

		if (o.name === 'toggleEditors') {
			return <ToggleEditorsButton
				key={o.name}
				buttonRef={setButtonRefCallback}
				value={Value.Markdown}
				themeId={props.themeId}
				toolbarButtonInfo={o}
				tabIndex={tabIndex}
			/>;
		} else if (itemType === 'button') {
			return (
				<ToolbarButton
					tabIndex={tabIndex}
					buttonRef={setButtonRefCallback}
					{...buttonProps}
				/>
			);
		} else if (itemType === 'separator') {
			return <ToolbarSpace {...buttonProps} />;
		}

		return null;
	};

	let focusableIndex = 0;
	const renderList = (items: ToolbarItemInfo[]) => {
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
			className='editor-toolbar'
			style={props.style}

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
			<div className='group -right'>
				{rightItemComps}
			</div>
		</div>
	);
};

const mapStateToProps = (state: AppState) => {
	return { themeId: state.settings.theme };
};

export default connect(mapStateToProps)(ToolbarBaseComponent);
