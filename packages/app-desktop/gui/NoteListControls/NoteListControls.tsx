import { AppState } from '../../app.reducer';
import * as React from 'react';
import { useEffect, useRef, useMemo } from 'react';
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
	height: number;
	width: number;
}

const StyledRoot = styled.div`
	box-sizing: border-box;
	height: ${(props: any) => props.height}px;
	display: flex;
	flex-direction: column;
	padding: ${(props: any) => props.theme.mainPadding}px;
	background-color: ${(props: any) => props.theme.backgroundColor3};
	gap: 5px;
`;

const StyledButton = styled(Button)`
	width: auto;
	height: 26px;
	min-height: 26px;
	flex: 1 0 auto;
	min-width: 0;

  .fa, .fas {
    font-size: 11px;
  }
`;

const StyledPairButtonL = styled(Button)`
	border-radius: 3px 0 0 3px;
	min-width: ${(props: any) => buttonSizePx(props)}px;
	max-width: ${(props: any) => buttonSizePx(props)}px;
`;

const StyledPairButtonR = styled(Button)`
	min-width: 8px;
	border-radius: 0 3px 3px 0;
	border-width: 1px 1px 1px 0;
	width: auto;
`;

const RowContainer = styled.div`
	display: flex;
	flex-direction: row;
	flex: 1 1 auto;
	gap: 8px;
`;

const SortOrderButtonsContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1 1 auto;
`;

function NoteListControls(props: Props) {
	const searchBarRef = useRef(null);
	const newNoteRef = useRef(null);
	const newTodoRef = useRef(null);
	const noteControlsRef = useRef(null);
	const searchAndSortRef = useRef(null);

	const breakpoint = useMemo(() => {
		const breakpoints = [{ s: 135 }, { md: 189 }, { l: 470 }, { xl: 500 }];
		// Find largest breakpoint that width is less than
		const index = breakpoints.map(x => Object.values(x)[0])
			.findIndex(x => props.width < x);

		return index === -1 ? Object.keys(breakpoints[breakpoints.length - 1])[0] : Object.keys(breakpoints[index])[0];
	}, [props.width]);

	const noteButtonText = useMemo(() => {
		if (breakpoint === 's') {
			return '';
		} else if (breakpoint === 'md') {
			return _('note');
		} else {
			return _('New note');
		}
	}, [breakpoint]);

	const todoButtonText = useMemo(() => {
		if (breakpoint === 's') {
			return '';
		} else if (breakpoint === 'md') {
			return _('to-do');
		} else {
			return _('New to-do');
		}
	}, [breakpoint]);

	const noteIcon = useMemo(() => {
		if (breakpoint === 's') {
			return 'icon-note';
		} else {
			return 'fas fa-plus';
		}
	}, [breakpoint]);

	const todoIcon = useMemo(() => {
		if (breakpoint === 's') {
			return 'far fa-check-square';
		} else {
			return 'fas fa-plus';
		}
	}, [breakpoint]);

	useEffect(() => {
		if (breakpoint === 's') {
			newNoteRef.current.style.padding = '0px 18px 0px 18px';
			newTodoRef.current.style.padding = '0px 18px 0px 18px';
		} else {
			newNoteRef.current.style.padding = '0px 4px 0px 4px';
			newTodoRef.current.style.padding = '0px 4px 0px 4px';
		}

		if (breakpoint === 'xl') {
			noteControlsRef.current.style.flexDirection = 'row';
			searchAndSortRef.current.style.flex = '2 1 auto';
		} else {
			noteControlsRef.current.style.flexDirection = 'column';
		}
	}, [breakpoint]);

	useEffect(() => {
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
				<StyledButton ref={newNoteRef}
					className="new-note-button"
					tooltip={CommandService.instance().label('newNote')}
					iconName={noteIcon}
					title={_('%s', noteButtonText)}
					level={ButtonLevel.Primary}
					size={ButtonSize.Small}
					onClick={onNewNoteButtonClick}
				/>
				<StyledButton ref={newTodoRef}
					className="new-todo-button"
					tooltip={CommandService.instance().label('newTodo')}
					iconName={todoIcon}
					title={_('%s', todoButtonText)}
					level={ButtonLevel.Secondary}
					size={ButtonSize.Small}
					onClick={onNewTodoButtonClick}
				/>
			</RowContainer>
		);
	}

	return (
		<StyledRoot ref={noteControlsRef}>
			{renderNewNoteButtons()}
			<RowContainer ref={searchAndSortRef}>
				<SearchBar inputRef={searchBarRef}/>
				<SortOrderButtonsContainer>
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
				</SortOrderButtonsContainer>
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
