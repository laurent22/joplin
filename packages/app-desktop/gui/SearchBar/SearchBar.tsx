import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import CommandService from '@joplin/lib/services/CommandService';
import useSearch from './hooks/useSearch';
import { Root, SearchInput, SearchButton, SearchButtonIcon } from './styles';

import { _ } from '@joplin/lib/locale';
const { connect } = require('react-redux');

interface Props {
	inputRef?: any,
	notesParentType: string,
	dispatch?: Function,
}

function SearchBar(props:Props) {
	const [query, setQuery] = useState('');
	const iconName = !query ? CommandService.instance().iconName('search') : 'fa fa-times';

	function onChange(event:any) {
		setQuery(event.currentTarget.value);
	}

	function onFocus() {
		props.dispatch({
			type: 'FOCUS_SET',
			field: 'globalSearch',
		});
	}

	function onBlur() {
		// Do it after a delay so that the "Clear" button
		// can be clicked on (otherwise the field loses focus
		// and is resized before the click event has been processed)
		setTimeout(() => {
			props.dispatch({
				type: 'FOCUS_CLEAR',
				field: 'globalSearch',
			});
		}, 300);
	}

	function onKeyDown(event:any) {
		if (event.key === 'Escape') {
			setQuery('');
			if (document.activeElement) (document.activeElement as any).blur();
		}
	}

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
			<SearchInput
				ref={props.inputRef}
				value={query}
				type="text"
				placeholder={_('Search...')}
				onChange={onChange}
				onFocus={onFocus}
				onBlur={onBlur}
				onKeyDown={onKeyDown}
			/>
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
