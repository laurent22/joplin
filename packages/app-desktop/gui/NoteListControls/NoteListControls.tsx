import { AppState } from '../../app.reducer';
import * as React from 'react';
import { useEffect, useRef, useMemo, useState } from 'react';
import SearchBar from '../SearchBar/SearchBar';
import Button, { ButtonLevel, ButtonSize, buttonSizePx } from '../Button/Button';
import CommandService from '@joplin/lib/services/CommandService';
import { runtime as focusSearchRuntime } from './commands/focusSearch';
import Note from '@joplin/lib/models/Note';
import { notesSortOrderNextField } from '../../services/sortOrder/notesSortOrderUtils';
import { _ } from '@joplin/lib/locale';
const { connect } = require('react-redux');
const styled = require('styled-components').default;

enum BaseBreakpoint {
	Sm = 160,
	Md = 190,
	Lg = 40,
	Xl = 474,
}

interface Props {
	showNewNoteButtons: boolean;
	sortOrderButtonsVisible: boolean;
	sortOrderField: string;
	sortOrderReverse: boolean;
	notesParentType: string;
	height: number;
	width: number;
	onContentHeightChange: (sameRow: boolean)=> void;
}

interface Breakpoints {
	Sm: number;
	Md: number;
	Lg: number;
	Xl: number;
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
	max-width: none;
	white-space: nowrap;

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
	const [dynamicBreakpoints, setDynamicBreakpoints] = useState<Breakpoints>({ Sm: BaseBreakpoint.Sm, Md: BaseBreakpoint.Md, Lg: BaseBreakpoint.Lg, Xl: BaseBreakpoint.Xl });

	const searchBarRef = useRef(null);
	const newNoteRef = useRef(null);
	const newTodoRef = useRef(null);
	const noteControlsRef = useRef(null);
	const searchAndSortRef = useRef(null);

	const getTextWidth = (text: string): number => {
		const canvas = document.createElement('canvas');
		if (!canvas) throw new Error('Failed to create canvas element');
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Failed to get context');
		const fontWeight = getComputedStyle(newNoteRef.current).getPropertyValue('font-weight');
		const fontSize = getComputedStyle(newNoteRef.current).getPropertyValue('font-size');
		const fontFamily = getComputedStyle(newNoteRef.current).getPropertyValue('font-family');
		ctx.font = `${fontWeight} ${fontSize} ${fontFamily}`;

		return ctx.measureText(text).width;
	};

	// Initialize language-specific breakpoints
	useEffect(() => {
		// Use the longest string to calculate the amount of extra width needed
		const smAdditional = getTextWidth(_('note')) > getTextWidth(_('to-do')) ? getTextWidth(_('note')) : getTextWidth(_('to-do'));
		const mdAdditional = getTextWidth(_('New note')) > getTextWidth(_('New to-do')) ? getTextWidth(_('New note')) : getTextWidth(_('New to-do'));

		const Sm = BaseBreakpoint.Sm + smAdditional * 2;
		const Md = BaseBreakpoint.Md + mdAdditional * 2;
		const Lg = BaseBreakpoint.Lg + Md;
		const Xl = BaseBreakpoint.Xl;

		setDynamicBreakpoints({ Sm, Md, Lg, Xl });
	}, []);

	const breakpoint = useMemo(() => {
		// Find largest breakpoint that width is less than
		const index = Object.values(dynamicBreakpoints).findIndex(x => props.width < x);

		return index === -1 ? dynamicBreakpoints.Xl : Object.values(dynamicBreakpoints)[index];
	}, [props.width, dynamicBreakpoints]);

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
		if (breakpoint === dynamicBreakpoints.Xl) {
			noteControlsRef.current.style.flexDirection = 'row';
			searchAndSortRef.current.style.flex = '2 1 auto';
			props.onContentHeightChange(true);
		} else {
			noteControlsRef.current.style.flexDirection = 'column';
			props.onContentHeightChange(false);
		}
	}, [breakpoint, dynamicBreakpoints, props.onContentHeightChange]);

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
			<TopRow className="new-note-todo-buttons">
				<StyledButton ref={newNoteRef}
					className="new-note-button"
					tooltip={ showTooltip ? CommandService.instance().label('newNote') : '' }
					iconName={noteIcon}
					title={_('%s', noteButtonText)}
					level={ButtonLevel.Primary}
					size={ButtonSize.Small}
					onClick={onNewNoteButtonClick}
				/>
				<StyledButton ref={newTodoRef}
					className="new-todo-button"
					tooltip={ showTooltip ? CommandService.instance().label('newTodo') : '' }
					iconName={todoIcon}
					title={_('%s', todoButtonText)}
					level={ButtonLevel.Secondary}
					size={ButtonSize.Small}
					onClick={onNewTodoButtonClick}
				/>
			</TopRow>
		);
	}

	return (
		<StyledRoot ref={noteControlsRef}>
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
							size={ButtonSize.Small}
							onClick={onSortOrderFieldButtonClick}
						/>
						<StyledPairButtonR
							className="sort-order-reverse-button"
							tooltip={CommandService.instance().label('toggleNotesSortOrderReverse')}
							iconName={sortOrderReverseIcon()}
							level={ButtonLevel.Secondary}
							size={ButtonSize.Small}
							onClick={onSortOrderReverseButtonClick}
						/>
					</SortOrderButtonsContainer>
				}
			</BottomRow>
		</StyledRoot>
	);
}

const mapStateToProps = (state: AppState) => {
	return {
		// TODO: showNewNoteButtons and the logic associated is not needed anymore.
		showNewNoteButtons: true,
		sortOrderButtonsVisible: state.settings['notes.sortOrder.buttonsVisible'],
		sortOrderField: state.settings['notes.sortOrder.field'],
		sortOrderReverse: state.settings['notes.sortOrder.reverse'],
		notesParentType: state.notesParentType,
	};
};

export default connect(mapStateToProps)(NoteListControls);
