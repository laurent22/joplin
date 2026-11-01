import * as React from 'react';
import { useCallback } from 'react';
import CommandService from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';

import StyledInput from '../../style/StyledInput';

interface Props {
	inputRef?: React.Ref<HTMLInputElement>;
	value: string;
	onChange(event: OnChangeEvent): void;
	onFocus?: React.FocusEventHandler<HTMLInputElement>;
	onBlur?: React.FocusEventHandler<HTMLInputElement>;
	onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
	onSearchButtonClick: ()=> void;
	searchStarted: boolean;
	placeholder?: string;
	disabled?: boolean;
	inputClassName?: string;
	'aria-controls'?: string;
	iconButtonTabIndex?: number;
}

export interface OnChangeEvent {
	value: string;
}

export default function(props: Props) {
	const iconName = !props.searchStarted ? CommandService.instance().iconName('search') : 'fa fa-times';
	const iconLabel = !props.searchStarted ? _('Search') : _('Clear search');

	const onChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		props.onChange({ value: event.currentTarget.value });
	}, [props.onChange]);

	const fieldClassName = ['field'];
	if (props.inputClassName) fieldClassName.push(props.inputClassName);

	return (
		<div className='search-input'>
			<StyledInput
				ref={props.inputRef}
				className={fieldClassName.join(' ')}
				value={props.value}
				type="search"
				placeholder={props.placeholder || _('Search...')}
				onChange={onChange}
				onFocus={props.onFocus}
				onBlur={props.onBlur}
				onKeyDown={props.onKeyDown}
				spellCheck={false}
				disabled={props.disabled}
				aria-label={props.placeholder || _('Search...')}
				aria-controls={props['aria-controls']}
			/>
			<button
				type='button'
				className='button'
				aria-label={iconLabel}
				disabled={props.disabled}
				tabIndex={props.iconButtonTabIndex}
				onClick={props.onSearchButtonClick}
			>
				<span className={`icon ${iconName}`}/>
			</button>
		</div>
	);
}
