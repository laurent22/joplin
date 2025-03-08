import * as React from 'react';
import { useCallback } from 'react';
import CommandService from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';

import StyledInput from '../../style/StyledInput';
const styled = require('styled-components').default;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
type StyleProps = any;

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
	opacity: ${(props: StyleProps) => props.disabled ? 0.5 : 1};
`;

export const SearchButtonIcon = styled.span`
	font-size: ${(props: StyleProps) => props.theme.toolbarIconSize}px;
	color: ${(props: StyleProps) => props.theme.color4};
`;

export const SearchInput = styled(StyledInput)`
	padding-right: 20px;
	flex: 1;
	width: 10px;

	&::-webkit-search-cancel-button {
		display: none;
	}
`;

interface Props {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	inputRef?: any;
	value: string;
	onChange(event: OnChangeEvent): void;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onFocus?: Function;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onBlur?: Function;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onKeyDown?: Function;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onSearchButtonClick: Function;
	searchStarted: boolean;
	placeholder?: string;
	disabled?: boolean;
	'aria-controls'?: string;
}

export interface OnChangeEvent {
	value: string;
}

export default function(props: Props) {
	const iconName = !props.searchStarted ? CommandService.instance().iconName('search') : 'fa fa-times';
	const iconLabel = !props.searchStarted ? _('Search') : _('Clear search');

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const onChange = useCallback((event: any) => {
		props.onChange({ value: event.currentTarget.value });
	}, [props.onChange]);

	return (
		<Root>
			<SearchInput
				ref={props.inputRef}
				value={props.value}
				type="search"
				placeholder={props.placeholder || _('Search...')}
				onChange={onChange}
				onFocus={props.onFocus}
				onBlur={props.onBlur}
				onKeyDown={props.onKeyDown}
				spellCheck={false}
				disabled={props.disabled}
				aria-controls={props['aria-controls']}
			/>
			<SearchButton
				aria-label={iconLabel}
				onClick={props.onSearchButtonClick}
			>
				<SearchButtonIcon className={iconName}/>
			</SearchButton>
		</Root>
	);
}
