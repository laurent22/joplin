import * as React from 'react';
import { useState, useCallback } from 'react';
import CommandService from 'lib/services/CommandService';
import useSearch from './hooks/useSearch';
import { Root, SearchInput, SearchButton, SearchButtonIcon } from './styles';
const { _ } = require('lib/locale.js');

interface Props {
	inputRef?: any,
}

export default function SearchBar(props:Props) {
	const [query, setQuery] = useState('');
	const iconName = !query ? CommandService.instance().iconName('search') : 'fa fa-times';

	const onChange = (event:any) => {
		setQuery(event.currentTarget.value);
	};

	const onSearchButtonClick = useCallback(() => {
		setQuery('');
	}, []);

	useSearch(query);

	return (
		<Root>
			<SearchInput ref={props.inputRef} value={query} type="text" placeholder={_('Search...')} onChange={onChange}/>
			<SearchButton onClick={onSearchButtonClick}>
				<SearchButtonIcon className={iconName}/>
			</SearchButton>
		</Root>
	);
}
