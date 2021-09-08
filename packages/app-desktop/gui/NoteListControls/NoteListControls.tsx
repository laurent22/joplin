import * as React from 'react';
import { useEffect, useRef } from 'react';
import SearchBar from '../SearchBar/SearchBar';
import Button, { ButtonLevel } from '../Button/Button';
import CommandService from '@joplin/lib/services/CommandService';
import { runtime as focusSearchRuntime } from './commands/focusSearch';
import Setting from '@joplin/lib/models/Setting';
import Note from '@joplin/lib/models/Note';
import { notesSortOrderNextField, SETTING_FIELD, SETTING_REVERSE, NOTES_SORT_ORDER_SWITCH }
	from '../MainScreen/commands/notesSortOrderSwitch';
import { NOTES_SORT_ORDER_TOGGLE_REVERSE } from '../MainScreen/commands/notesSortOrderToggleReverse';
import app from '../../app';
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

const StyledPairButtonL = styled(Button)`
	margin-left: 8px;
	border-radius: 5px 0 0 5px;
	padding: 0 2px 0 4px;
`;

const StyledPairButtonR = styled(Button)`
	margin-left: 0px;
	border-radius: 0 5px 5px 0;
	border-width: 1px 1px 1px 0;
	padding: 0 4px 0 2px;
	min-width: 8px;
	width: auto;
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

	function onSortOrderFieldButtonClick() {
		void CommandService.instance().execute(NOTES_SORT_ORDER_SWITCH);
	}

	function onSortOrderReverseButtonClick() {
		void CommandService.instance().execute(NOTES_SORT_ORDER_TOGGLE_REVERSE);
	}

	function sortOrderFieldTooltip() {
		const term1 = CommandService.instance().label(NOTES_SORT_ORDER_SWITCH);
		const field = Setting.value(SETTING_FIELD);
		const term2 = Note.fieldToLabel(field);
		const term3 = Note.fieldToLabel(notesSortOrderNextField(field));
		return `${term1}:\n ${term2} -> ${term3}`;
	}

	function sortOrderFieldIcon() {
		const field = Setting.value(SETTING_FIELD);
		const iconMap: any = {
			user_updated_time: 'far fa-calendar-alt',
			user_created_time: 'far fa-calendar-plus',
			title: 'fas fa-font',
			order: 'fas fa-wrench',
		};
		return `${iconMap[field] || iconMap['title']} ${field}`;
	}

	function sortOrderReverseIcon() {
		return Setting.value(SETTING_REVERSE) ? 'fas fa-long-arrow-alt-up' : 'fas fa-long-arrow-alt-down';
	}

	function sortOrderButtonsVisible() {
		let visible = Setting.value('notes.sortOrder.buttonsVisible');
		if (app().store().getState().notesParentType === 'Search') visible = false;
		return visible;
	}

	function renderNewNoteButtons() {
		if (!props.showNewNoteButtons) return null;

		const soButtonsVisible = sortOrderButtonsVisible();

		return (
			<ButtonContainer>
				{soButtonsVisible &&
					<StyledPairButtonL
						className="sort-order-field-button"
						tooltip={sortOrderFieldTooltip()}
						iconName={sortOrderFieldIcon()}
						level={ButtonLevel.Secondary}
						onClick={onSortOrderFieldButtonClick}
					/>
				}
				{soButtonsVisible &&
					<StyledPairButtonR
						className="sort-order-reverse-button"
						tooltip={CommandService.instance().label(NOTES_SORT_ORDER_TOGGLE_REVERSE)}
						iconName={sortOrderReverseIcon()}
						level={ButtonLevel.Secondary}
						onClick={onSortOrderReverseButtonClick}
					/>
				}
				<StyledButton
					className="new-todo-button"
					tooltip={CommandService.instance().label('newTodo')}
					iconName="far fa-check-square"
					level={ButtonLevel.Primary}
					onClick={onNewTodoButtonClick}
				/>
				<StyledButton
					className="new-note-button"
					tooltip={CommandService.instance().label('newNote')}
					iconName="icon-note"
					level={ButtonLevel.Primary}
					onClick={onNewNoteButtonClick}
				/>
			</ButtonContainer>
		);
	}

	return (
		<StyledRoot height={props.height}>
			<SearchBar inputRef={searchBarRef}/>
			{renderNewNoteButtons()}
		</StyledRoot>
	);
}
