import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import CommandService from 'lib/services/CommandService';
import useSearch from './hooks/useSearch';
import { Root, SearchInput, SearchButton, SearchButtonIcon } from './styles';
const { connect } = require('react-redux');

const { _ } = require('lib/locale.js');

interface Props {
	inputRef?: any,
	notesParentType: string,
}

function SearchBar(props:Props) {
	const [query, setQuery] = useState('');
	const iconName = !query ? CommandService.instance().iconName('search') : 'fa fa-times';

	const onChange = (event:any) => {
		setQuery(event.currentTarget.value);
	};

	const onSearchButtonClick = useCallback(() => {
		setQuery('');
	}, []);

	useSearch(query);

	useEffect(() => {
		if (props.notesParentType !== 'Search') {
			setQuery('');
		}
	}, [props.notesParentType]);

	return (
		<Root>
			<SearchInput ref={props.inputRef} value={query} type="text" placeholder={_('Search...')} onChange={onChange}/>
			<SearchButton onClick={onSearchButtonClick}>
				<SearchButtonIcon className={iconName}/>
			</SearchButton>
		</Root>
	);
}

const mapStateToProps = (state:any) => {
	return {
		notesParentType: state.notesParentType,
	};
};

export default connect(mapStateToProps)(SearchBar);
