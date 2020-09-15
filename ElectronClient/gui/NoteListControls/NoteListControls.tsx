import * as React from 'react';
import { useEffect, useRef } from 'react';
import SearchBar from '../SearchBar/SearchBar';
import Button, { ButtonLevel } from '../Button/Button';
import CommandService from 'lib/services/CommandService';
import { runtime as focusSearchRuntime } from './commands/focusSearch';
const styled = require('styled-components').default;

const StyledRoot = styled.div`
	width: 100%;
	/*height: 100%;*/
	display: flex;
	flex-direction: row;
	padding: ${(props:any) => props.theme.mainPadding}px;
	background-color: ${(props:any) => props.theme.backgroundColor3};
`;

const StyledButton = styled(Button)`
	margin-left: 8px;
`;

export default function NoteListControls() {
	const searchBarRef = useRef(null);

	useEffect(function() {
		CommandService.instance().registerRuntime('focusSearch', focusSearchRuntime(searchBarRef));

		return function() {
			CommandService.instance().unregisterRuntime('focusSearch');
		};
	}, []);

	function onNewTodoButtonClick() {
		CommandService.instance().execute('newTodo');
	}

	function onNewNoteButtonClick() {
		CommandService.instance().execute('newNote');
	}

	return (
		<StyledRoot>
			<SearchBar inputRef={searchBarRef}/>
			<StyledButton
				tooltip={CommandService.instance().title('newTodo')}
				iconName="far fa-check-square"
				level={ButtonLevel.Primary}
				onClick={onNewTodoButtonClick}
			/>
			<StyledButton
				tooltip={CommandService.instance().title('newNote')}
				iconName="icon-note"
				level={ButtonLevel.Primary}
				onClick={onNewNoteButtonClick}
			/>
		</StyledRoot>
	);
}
