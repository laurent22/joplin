import * as React from 'react';
import { useEffect, useRef } from 'react';
import SearchBar from '../SearchBar/SearchBar';
import Button, { ButtonLevel } from '../Button/Button';
import CommandService from '@joplin/lib/services/CommandService';
import { runtime as focusSearchRuntime } from './commands/focusSearch';
const styled = require('styled-components').default;

interface Props {
	showNewNoteButtons: boolean,
}

const StyledRoot = styled.div`
	width: 100%;
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
		CommandService.instance().execute('newTodo');
	}

	function onNewNoteButtonClick() {
		CommandService.instance().execute('newNote');
	}

	function renderNewNoteButtons() {
		if (!props.showNewNoteButtons) return null;

		return (
			<ButtonContainer>
				<StyledButton
					tooltip={CommandService.instance().label('newTodo')}
					iconName="far fa-check-square"
					level={ButtonLevel.Primary}
					onClick={onNewTodoButtonClick}
				/>
				<StyledButton
					tooltip={CommandService.instance().label('newNote')}
					iconName="icon-note"
					level={ButtonLevel.Primary}
					onClick={onNewNoteButtonClick}
				/>
			</ButtonContainer>
		);
	}

	return (
		<StyledRoot>
			<SearchBar inputRef={searchBarRef}/>
			{renderNewNoteButtons()}
		</StyledRoot>
	);
}
