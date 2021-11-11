import { AppState } from '../../app.reducer';
import * as React from 'react';
import { useEffect, useRef } from 'react';
import SearchBar from '../SearchBar/SearchBar';
import Button, { ButtonLevel, ButtonSize, buttonSizePx } from '../Button/Button';
import CommandService from '@joplin/lib/services/CommandService';
import { runtime as focusSearchRuntime } from './commands/focusSearch';
const { connect } = require('react-redux');
const styled = require('styled-components').default;

interface Props {
	showNewNoteButtons: boolean;
	sortOrderButtonsVisible: boolean;
	sortOrderField: string;
	sortOrderReverse: boolean;
	notesParentType: string;
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
	width: 26px;
	height: 26px;
	min-width: 26px;
	min-height: 26px;
`;

const StyledPairButtonL = styled(Button)`
	margin-left: 8px;
	border-radius: 5px 0 0 5px;
	min-width: ${(props: any) => buttonSizePx(props)}px;
	max-width: ${(props: any) => buttonSizePx(props)}px;
`;

const StyledPairButtonR = styled(Button)`
	min-width: 8px;
	margin-left: 0px;
	border-radius: 0 5px 5px 0;
	border-width: 1px 1px 1px 0;
	width: auto;
`;

const ButtonContainer = styled.div`
	display: flex;
	flex-direction: row;
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
			<ButtonContainer>
				{showsSortOrderButtons() &&
					<StyledPairButtonL
						className="sort-order-field-button"
						tooltip={CommandService.instance().label('toggleNotesSortOrderField')}
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
				<StyledButton
					className="new-todo-button"
					tooltip={CommandService.instance().label('newTodo')}
					iconName="far fa-check-square"
					level={ButtonLevel.Primary}
					size={ButtonSize.Small}
					onClick={onNewTodoButtonClick}
				/>
				<StyledButton
					className="new-note-button"
					tooltip={CommandService.instance().label('newNote')}
					iconName="icon-note"
					level={ButtonLevel.Primary}
					size={ButtonSize.Small}
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

const mapStateToProps = (state: AppState) => {
	return {
		sortOrderButtonsVisible: state.settings['notes.sortOrder.buttonsVisible'],
		sortOrderField: state.settings['notes.sortOrder.field'],
		sortOrderReverse: state.settings['notes.sortOrder.reverse'],
		notesParentType: state.notesParentType,
	};
};

export default connect(mapStateToProps)(NoteListControls);
