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
import styled from 'styled-components';
import stateToWhenClauseContext from '../../services/commands/stateToWhenClauseContext';
import { getTrashFolderId } from '@joplin/lib/services/trash';
import { Breakpoints } from '../NoteList/utils/types';

interface Props {
	showNewNoteButtons: boolean;
	sortOrderButtonsVisible: boolean;
	sortOrderField: string;
	sortOrderReverse: boolean;
	notesParentType: string;
	height: number;
	width: number;
	newNoteButtonEnabled: boolean;
	newTodoButtonEnabled: boolean;
	setNewNoteButtonElement: React.Dispatch<React.SetStateAction<Element>>;
	lineCount: number;
	breakpoint: number;
	dynamicBreakpoints: Breakpoints;
	buttonSize: ButtonSize;
	padding: number;
	buttonVerticalGap: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied;
type StyleProps = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied;
const StyledRoot: any = styled.div`
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	padding: ${(props: StyleProps) => props.padding}px;
	background-color: ${(props: StyleProps) => props.theme.backgroundColor3};
	gap: ${(props: StyleProps) => props.buttonVerticalGap}px;
`;

const StyledButton = styled(Button)`
	width: auto;
	height: 26px;
	min-height: 26px;
	min-width: 37px;
	max-width: none;
	white-space: nowrap;

  .fa, .fas {
    font-size: 11px;
  }
`;

const StyledPairButtonL = styled(Button)`
	border-radius: 3px 0 0 3px;
	min-width: ${(props: StyleProps) => buttonSizePx(props)}px;
	max-width: ${(props: StyleProps) => buttonSizePx(props)}px;
`;

const StyledPairButtonR = styled(Button)`
	min-width: 8px;
	border-radius: 0 3px 3px 0;
	border-width: 1px 1px 1px 0;
	width: auto;
`;

const TopRow = styled.div`
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
`;

const BottomRow = styled.div`
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
	const newTodoButtonRef = useRef(null);
	const noteControlsRef = useRef(null);
	const searchAndSortRef = useRef(null);

	const breakpoint = props.breakpoint;
	const dynamicBreakpoints = props.dynamicBreakpoints;
	const lineCount = props.lineCount;

	const noteButtonText = useMemo(() => {
		if (breakpoint === dynamicBreakpoints.Sm) {
			return '';
		} else if (breakpoint === dynamicBreakpoints.Md) {
			return _('note');
		} else {
			return _('New note');
		}
	}, [breakpoint, dynamicBreakpoints]);

	const todoButtonText = useMemo(() => {
		if (breakpoint === dynamicBreakpoints.Sm) {
			return '';
		} else if (breakpoint === dynamicBreakpoints.Md) {
			return _('to-do');
		} else {
			return _('New to-do');
		}
	}, [breakpoint, dynamicBreakpoints]);

	const noteIcon = useMemo(() => {
		if (breakpoint === dynamicBreakpoints.Sm) {
			return 'icon-note';
		} else {
			return 'fas fa-plus';
		}
	}, [breakpoint, dynamicBreakpoints]);

	const todoIcon = useMemo(() => {
		if (breakpoint === dynamicBreakpoints.Sm) {
			return 'far fa-check-square';
		} else {
			return 'fas fa-plus';
		}
	}, [breakpoint, dynamicBreakpoints]);

	const showTooltip = useMemo(() => {
		if (breakpoint === dynamicBreakpoints.Sm) {
			return true;
		} else {
			return false;
		}
	}, [breakpoint, dynamicBreakpoints.Sm]);

	useEffect(() => {
		if (lineCount === 1) {
			noteControlsRef.current.style.flexDirection = 'row';
			searchAndSortRef.current.style.flex = '2 1 50%';
		} else {
			noteControlsRef.current.style.flexDirection = 'column';
		}
	}, [lineCount]);

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
		const defaultIcon = 'fas fa-cog';

		const field = props.sortOrderField;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const iconMap: any = {
			user_updated_time: 'far fa-calendar-alt',
			user_created_time: 'far fa-calendar-plus',
			title: 'fas fa-font',
			order: 'fas fa-wrench',
			todo_due: 'fas fa-calendar-check',
			todo_completed: 'fas fa-check',
		};
		return `${iconMap[field] || defaultIcon} ${field}`;
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
			<TopRow className="new-note-todo-buttons">
				<StyledButton
					ref={(el: Element) => {
						props.setNewNoteButtonElement(el);
					}}
					className="new-note-button"
					tooltip={ showTooltip ? CommandService.instance().label('newNote') : '' }
					iconName={noteIcon}
					title={_('%s', noteButtonText)}
					level={ButtonLevel.Primary}
					size={props.buttonSize}
					onClick={onNewNoteButtonClick}
					disabled={!props.newNoteButtonEnabled}
				/>
				<StyledButton ref={newTodoButtonRef}
					className="new-todo-button"
					tooltip={ showTooltip ? CommandService.instance().label('newTodo') : '' }
					iconName={todoIcon}
					title={_('%s', todoButtonText)}
					level={ButtonLevel.Secondary}
					size={props.buttonSize}
					onClick={onNewTodoButtonClick}
					disabled={!props.newTodoButtonEnabled}
				/>
			</TopRow>
		);
	}

	return (
		<StyledRoot ref={noteControlsRef} padding={props.padding} buttonVerticalGap={props.buttonVerticalGap}>
			{renderNewNoteButtons()}
			<BottomRow ref={searchAndSortRef} className="search-and-sort">
				<SearchBar inputRef={searchBarRef}/>
				{showsSortOrderButtons() &&
					<SortOrderButtonsContainer>
						<StyledPairButtonL
							className="sort-order-field-button"
							tooltip={sortOrderFieldTooltip()}
							iconName={sortOrderFieldIcon()}
							level={ButtonLevel.Secondary}
							size={props.buttonSize}
							onClick={onSortOrderFieldButtonClick}
						/>
						<StyledPairButtonR
							className="sort-order-reverse-button"
							tooltip={CommandService.instance().label('toggleNotesSortOrderReverse')}
							iconName={sortOrderReverseIcon()}
							level={ButtonLevel.Secondary}
							size={props.buttonSize}
							onClick={onSortOrderReverseButtonClick}
						/>
					</SortOrderButtonsContainer>
				}
			</BottomRow>
		</StyledRoot>
	);
}

const mapStateToProps = (state: AppState) => {
	const whenClauseContext = stateToWhenClauseContext(state);

	return {
		showNewNoteButtons: state.selectedFolderId !== getTrashFolderId(),
		newNoteButtonEnabled: CommandService.instance().isEnabled('newNote', whenClauseContext),
		newTodoButtonEnabled: CommandService.instance().isEnabled('newTodo', whenClauseContext),
		sortOrderButtonsVisible: state.settings['notes.sortOrder.buttonsVisible'],
		sortOrderField: state.settings['notes.sortOrder.field'],
		sortOrderReverse: state.settings['notes.sortOrder.reverse'],
		notesParentType: state.notesParentType,
	};
};

export default connect(mapStateToProps)(NoteListControls);
