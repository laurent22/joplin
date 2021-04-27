import * as React from 'react';
import { useCallback } from 'react';
import CommandService from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';

import StyledInput from '../../style/StyledInput';
const styled = require('styled-components').default;

export const Root = styled.div`
	position: relative;
	display: flex;
	width: 100%;
`;

export const SearchButton = styled.button`
	position: absolute;
	right: 0;
	background: none;
	border: none;
	height: 100%;
	opacity: ${(props: any) => props.disabled ? 0.5 : 1};
`;

export const SearchButtonIcon = styled.span`
	font-size: ${(props: any) => props.theme.toolbarIconSize}px;
	color: ${(props: any) => props.theme.color4};
`;

export const SearchInput = styled(StyledInput)`
	padding-right: 20px;
	flex: 1;
	width: 10px;
`;

interface Props {
	className?: string;
	inputRef?: any;
	value: string;
	onChange(event: OnChangeEvent): void;
	onFocus?: Function;
	onBlur?: Function;
	onKeyDown?: Function;
	onSearchButtonClick: Function;
	searchStarted: boolean;
	placeholder?: string;
	disabled?: boolean;
}

export interface OnChangeEvent {
	value: string;
}

export default function(props: Props) {
	const iconName = !props.searchStarted ? CommandService.instance().iconName('search') : 'fa fa-times';

	const onChange = useCallback((event: any) => {
		props.onChange({ value: event.currentTarget.value });
	}, [props.onChange]);

	return (
		<Root className={`${props.className || ''} search-input`}>
			<SearchInput
				className="search-input__element"
				ref={props.inputRef}
				value={props.value}
				type="text"
				placeholder={props.placeholder || _('Search...')}
				onChange={onChange}
				onFocus={props.onFocus}
				onBlur={props.onBlur}
				onKeyDown={props.onKeyDown}
				spellCheck={false}
				disabled={props.disabled}
			/>
			<SearchButton onClick={props.onSearchButtonClick} className={`search-input__button ${!props.searchStarted ? 'search-input__button--search' : 'search-input__button--reset'}`}>
				<SearchButtonIcon className={`search-input__icon  ${iconName}`}/>
			</SearchButton>
		</Root>
	);
}
