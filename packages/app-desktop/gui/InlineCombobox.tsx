import * as React from 'react';
import { useState, useCallback, CSSProperties, useEffect, useRef, useId } from 'react';
import { _ } from '@joplin/lib/locale';
import { focus } from '@joplin/lib/utils/focusHandler';
import ItemList from './ItemList';

interface Props {
	inputType?: string;
	inputStyle: CSSProperties;

	value: string;
	onChange: (newValue: string)=> void;

	suggestedValues: string[];
	renderOption: (suggestedValue: string)=> React.ReactElement;

	controls?: React.ReactNode;

	inputId: string;
}

const suggestionMatchesFilter = (suggestion: string, filter: string) => {
	return suggestion.toLowerCase().startsWith(filter.toLowerCase());
};

const InlineCombobox: React.FC<Props> = ({ inputType, controls, inputStyle, value, suggestedValues, renderOption, onChange, inputId }) => {
	const [showList, setShowList] = useState(false);
	const containerRef = useRef<HTMLDivElement|null>(null);
	const inputRef = useRef<HTMLInputElement|null>(null);
	const listboxRef = useRef<ItemList<string>|null>(null);

	const [filteredSuggestions, setFilteredSuggestions] = useState(suggestedValues);

	useEffect(() => {
		setFilteredSuggestions(suggestedValues);
	}, [suggestedValues]);

	const selectedIndex = filteredSuggestions.indexOf(value);

	useEffect(() => {
		if (selectedIndex >= 0 && showList) {
			listboxRef.current?.makeItemIndexVisible(selectedIndex);
		}
	}, [selectedIndex, showList]);

	const focusInput = useCallback(() => {
		focus('ComboBox/focus input', inputRef.current);
	}, []);

	const onTextChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((event) => {
		const newValue = event.target.value;
		onChange(newValue);
		setShowList(true);

		const filteredSuggestions = suggestedValues.filter((suggestion: string) =>
			suggestionMatchesFilter(suggestion, newValue),
		);
		// If no suggestions, show all fonts
		setFilteredSuggestions(filteredSuggestions.length > 0 ? filteredSuggestions : suggestedValues);
	}, [onChange, suggestedValues]);

	const onFocus: React.FocusEventHandler<HTMLElement> = useCallback(() => {
		setShowList(true);
	}, []);

	const onBlur = useCallback((event: React.FocusEvent) => {
		const hasHoverOrFocus = !!containerRef.current.querySelector(':focus-within, :hover');
		const movesToContainedItem = containerRef.current.contains(event.relatedTarget);
		if (!hasHoverOrFocus && !movesToContainedItem) {
			setShowList(false);
		}
	}, []);

	const onItemClick: React.MouseEventHandler<HTMLDivElement> = useCallback((event) => {
		const newValue = event.currentTarget.getAttribute('data-key');
		if (!newValue) return;

		focusInput();
		onChange(newValue);
		setFilteredSuggestions(suggestedValues);
		setShowList(false);
	}, [onChange, suggestedValues, focusInput]);

	const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = useCallback(event => {
		if (event.nativeEvent.isComposing) return;

		let closestIndex = selectedIndex;
		if (selectedIndex === -1) {
			closestIndex = filteredSuggestions.findIndex(suggestion => {
				return suggestionMatchesFilter(suggestion, value);
			});
		}

		const isGoToNext = event.code === 'ArrowDown';
		if (isGoToNext || event.code === 'ArrowUp') {
			event.preventDefault();

			if (!event.altKey) {
				let newSelectedIndex;
				if (isGoToNext) {
					newSelectedIndex = (selectedIndex + 1) % filteredSuggestions.length;
				} else {
					newSelectedIndex = selectedIndex - 1;
					if (newSelectedIndex < 0) {
						newSelectedIndex += filteredSuggestions.length;
					}
				}
				const newKey = filteredSuggestions[newSelectedIndex];
				onChange(newKey);
			}
			setShowList(true);
		} else if (event.code === 'Enter') {
			event.preventDefault();
			onChange(filteredSuggestions[closestIndex]);
			setShowList(false);
		} else if (event.code === 'Escape') {
			event.preventDefault();
			setShowList(false);
		}
	}, [filteredSuggestions, value, selectedIndex, onChange]);

	const valuesListId = useId();

	const itemId = (index: number) => {
		if (index < 0) {
			return undefined;
		} else {
			return `combobox-${valuesListId}-option-${index}`;
		}
	};
	const onRenderItem = (key: string, index: number) => {
		const selected = key === value;
		const id = itemId(index);

		return (
			<div
				key={key}
				data-key={key}
				className={`combobox-suggestion-option ${selected ? '-selected' : ''}`}
				role='option'
				aria-posinset={1 + index}
				aria-setsize={filteredSuggestions.length}
				onClick={onItemClick}
				aria-selected={selected}
				id={id}
			>{renderOption(key)}</div>
		);
	};

	return (
		<div
			className={`combobox-wrapper ${showList ? '-expanded' : ''}`}
			onFocus={onFocus}
			onBlur={onBlur}

			onKeyDown={onKeyDown}
			ref={containerRef}
		>
			<input
				type={inputType ?? 'text'}
				style={inputStyle}
				value={value}
				onChange={onTextChange}
				onKeyDown={onKeyDown}
				spellCheck={false}
				id={inputId}
				ref={inputRef}

				role='combobox'
				aria-autocomplete='list'
				aria-controls={valuesListId}
				aria-expanded={showList}
				aria-activedescendant={itemId(selectedIndex)}
			/>
			<div className='suggestions'>
				{
					// Custom controls
					controls
				}
				<ItemList
					role='listbox'
					aria-label={_('Suggestions')}
					style={{ height: 200 }}
					itemHeight={26}

					alwaysRenderSelection={true}
					selectedIndex={selectedIndex >= 0 ? selectedIndex : undefined}

					items={filteredSuggestions}
					itemRenderer={onRenderItem}
					id={valuesListId}
					ref={listboxRef}
				/>
			</div>
		</div>
	);
};

export default InlineCombobox;
