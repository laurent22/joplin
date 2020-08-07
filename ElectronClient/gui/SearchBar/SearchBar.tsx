import * as React from 'react';
import { useState, useCallback } from 'react';
import StyledInput from '../style/StyledInput';
import CommandService from 'lib/services/CommandService';
import useSearch from './hooks/useSearch';
const { themeStyle } = require('lib/theme.js');
const { _ } = require('lib/locale.js');
const styled = require('styled-components').default;

interface Props {
	themeId: number,
}

const Root = styled.div`
	position: relative;
	display: flex;
	width: 100%;
	height: ${(props:any) => `${props.theme.toolbarHeight}px`};
`;

const SearchButton = styled.button`
	position: absolute;
	right: 0;
	background: none;
	border: none;
	height: 100%;
	opacity: ${(props:any) => props.disabled ? 0.5 : 1};
`;

const SearchButtonIcon = styled.span`
	font-size: ${(props:any) => props.theme.toolbarIconSize}px;
	color: ${(props:any) => props.theme.color4};
`;

const SearchInput = styled(StyledInput)`
	padding-right: 20px;
	flex: 1;
	width: 10px;
`;

export default function SearchBar(props:Props) {
	const [query, setQuery] = useState('');
	const theme = themeStyle(props.themeId);
	const iconName = !query ? CommandService.instance().iconName('search') : 'fa fa-times';

	const onChange = (event:any) => {
		setQuery(event.currentTarget.value);
	};

	const onSearchButtonClick = useCallback(() => {
		setQuery('');
	}, []);

	useSearch(query);

	return (
		<Root theme={theme}>
			<SearchInput value={query} type="text" theme={theme} placeholder={_('Search...')} onChange={onChange}/>
			<SearchButton theme={theme} onClick={onSearchButtonClick}>
				<SearchButtonIcon className={iconName} theme={theme}/>
			</SearchButton>
		</Root>
	);
}
