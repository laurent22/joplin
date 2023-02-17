import { AppState } from '../../app.reducer';
import * as React from 'react';
import { useEffect, useRef } from 'react';
import SearchBar from '../SearchBar/SearchBar';
import Button, { ButtonLevel, ButtonSize, buttonSizePx } from '../Button/Button';
import CommandService from '@joplin/lib/services/CommandService';
import { runtime as focusSearchRuntime } from './commands/focusSearch';
import Note from '@joplin/lib/models/Note';
import { notesSortOrderNextField } from '../../services/sortOrder/notesSortOrderUtils';
import { _ } from '@joplin/lib/locale';
const { connect } = require('react-redux');
const styled = require('styled-components').default;

interface Props {
	showNewNoteButtons: boolean;
	sortOrderButtonsVisible: boolean;
	sortOrderField: string;
	sortOrderReverse: boolean;
	notesParentType: string;
}

const StyledRoot = styled.div`
	box-sizing: border-box;
	display: flex;
	height: auto;
	flex-direction: column;
	padding: ${(props: any) => props.theme.mainPadding}px;
	background-color: ${(props: any) => props.theme.backgroundColor3};
	gap: 5px;
`;

const StyleNewTodoButton = styled(Button)`
	margin-left: 8px;
	width: fit-content;
	height: 26px;
	min-width: 68px;
	min-height: 26px;
	flex: 1 1 auto;

  .fa, .fas {
    font-size: 11px;
  }
`;

const StyledNewNoteButton = styled(Button)`
	width: fit-content;
	height: 26px;
	min-width: 68px;
	min-height: 26px;
	flex: 1 1 auto;

  .fa, .fas {
    font-size: 11px;
  }
`;

const StyledPairButtonL = styled(Button)`
	margin-left: 8px;
	border-radius: 3px 0 0 3px;
	min-width: ${(props: any) => buttonSizePx(props)}px;
	max-width: ${(props: any) => buttonSizePx(props)}px;
`;

const StyledPairButtonR = styled(Button)`
	min-width: 8px;
	margin-left: 0px;
	border-radius: 0 3px 3px 0;
	border-width: 1px 1px 1px 0;
	width: auto;
`;

const RowContainer = styled.div`
	display: flex;
	flex-direction: row;
	flex: 1 1 auto
`;

function NoteListControls(props: Props) {
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
		void CommandService.instance().execute('toggleNotesSortOrderField');
	}

	function onSortOrderReverseButtonClick() {
		void CommandService.instance().execute('toggleNotesSortOrderReverse');
	}

	function sortOrderFieldTooltip() {
		const term1 = CommandService.instance().label('toggleNotesSortOrderField');
		const field = props.sortOrderField;
		const term2 = Note.fieldToLabel(field);
		const term3 = Note.fieldToLabel(notesSortOrderNextField(field));
		return `${term1}:\n ${term2} -> ${term3}`;
	}

	function sortOrderFieldIcon() {
		const field = props.sortOrderField;
		const iconMap: any = {
			user_updated_time: 'far fa-calendar-alt',
			user_created_time: 'far fa-calendar-plus',
			title: 'fas fa-font',
			order: 'fas fa-wrench',
		};
		return `${iconMap[field] || iconMap['title']} ${field}`;
	}

	function sortOrderReverseIcon() {
		return props.sortOrderReverse ? 'fas fa-long-arrow-alt-up' : 'fas fa-long-arrow-alt-down';
	}

	function showsSortOrderButtons() {
		let visible = props.sortOrderButtonsVisible;
		if (props.notesParentType === 'Search') visible = false;
		return visible;
	}

	function renderNewNoteButtons() {
		if (!props.showNewNoteButtons) return null;

		return (
			<RowContainer>
				<StyledNewNoteButton
					className="new-note-button"
					tooltip={CommandService.instance().label('newNote')}
					iconName="fas fa-plus"
					title={_('%s', 'New note')}
					level={ButtonLevel.Primary}
					size={ButtonSize.Small}
					onClick={onNewNoteButtonClick}
				/>
				<StyleNewTodoButton
					className="new-todo-button"
					tooltip={CommandService.instance().label('newTodo')}
					iconName="fas fa-plus"
					title={_('%s', 'New to-do')}
					level={ButtonLevel.Secondary}
					size={ButtonSize.Small}
					onClick={onNewTodoButtonClick}
				/>
			</RowContainer>
		);
	}

	return (
		<StyledRoot>
			{renderNewNoteButtons()}
			<RowContainer>
				<SearchBar inputRef={searchBarRef}/>
				{showsSortOrderButtons() &&
					<StyledPairButtonL
						className="sort-order-field-button"
						tooltip={sortOrderFieldTooltip()}
						iconName={sortOrderFieldIcon()}
						level={ButtonLevel.Secondary}
						size={ButtonSize.Small}
						onClick={onSortOrderFieldButtonClick}
					/>
				}
				{showsSortOrderButtons() &&
					<StyledPairButtonR
						className="sort-order-reverse-button"
						tooltip={CommandService.instance().label('toggleNotesSortOrderReverse')}
						iconName={sortOrderReverseIcon()}
						level={ButtonLevel.Secondary}
						size={ButtonSize.Small}
						onClick={onSortOrderReverseButtonClick}
					/>
				}
			</RowContainer>
		</StyledRoot>
	);
}

const mapStateToProps = (state: AppState) => {
	return {
		showNewNoteButtons: state.focusedField !== 'globalSearch',
		sortOrderButtonsVisible: state.settings['notes.sortOrder.buttonsVisible'],
		sortOrderField: state.settings['notes.sortOrder.field'],
		sortOrderReverse: state.settings['notes.sortOrder.reverse'],
		notesParentType: state.notesParentType,
	};
};

export default connect(mapStateToProps)(NoteListControls);
