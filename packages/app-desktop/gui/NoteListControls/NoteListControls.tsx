import * as React from 'react';
import { useEffect, useRef } from 'react';
import SearchBar from '../SearchBar/SearchBar';
import Button, { ButtonLevel } from '../Button/Button';
import CommandService from '@joplin/lib/services/CommandService';
import { runtime as focusSearchRuntime } from './commands/focusSearch';
const styled = require('styled-components').default;

interface Props {
	showNewNoteButtons: boolean;
	height: number;
}

const StyledRoot = styled.div`
	box-sizing: border-box;
	height: ${(props: any) => props.height}px;
	display: flex;
	flex-direction: row;
	padding: ${(props: any) => props.theme.mainPadding}px;
	background-color: ${(props: any) => props.theme.backgroundColor3};
`;

const StyledButton = styled(Button)`
	margin-left: 8px;
`;

const ButtonContainer = styled.div`
	display: flex;
	flex-direction: row;
`;

export default function NoteListControls(props: Props) {
	const searchBarRef = useRef(null);

	useEffect(function() {
		CommandService.instance().registerRuntime('focusSearch', focusSearchRuntime(searchBarRef));

		return function() {
			CommandService.instance().unregisterRuntime('focusSearch');
		};
	}, []);

	function onNewTodoButtonClick() {
		void CommandService.instance().execute('newTodo');
	}

	function onNewNoteButtonClick() {
		void CommandService.instance().execute('newNote');
	}

	function renderNewNoteButtons() {
		if (!props.showNewNoteButtons) return null;

		return (
			<ButtonContainer className="note-list-controls__button-container">
				<StyledButton
					className="note-list-controls__new-todo button"
					tooltip={CommandService.instance().label('newTodo')}
					iconName="far fa-check-square"
					level={ButtonLevel.Primary}
					onClick={onNewTodoButtonClick}
				/>
				<StyledButton
					className="note-list-controls__new-note button"
					tooltip={CommandService.instance().label('newNote')}
					iconName="icon-note"
					level={ButtonLevel.Primary}
					onClick={onNewNoteButtonClick}
				/>
			</ButtonContainer>
		);
	}

	return (
		<StyledRoot height={props.height} className={`note-list-controls ${!props.showNewNoteButtons ? 'note-list-controls--search-focused' : ''}`}>
			<SearchBar inputRef={searchBarRef} className="note-list-controls__search-bar" />
			{renderNewNoteButtons()}
		</StyledRoot>
	);
}
