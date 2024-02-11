import { themeStyle } from '@joplin/lib/theme';
import * as React from 'react';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import NoteList2 from '../NoteList/NoteList2';
import NoteListControls from '../NoteListControls/NoteListControls';
import { Size } from '../ResizableLayout/utils/types';
import styled from 'styled-components';
import { getDefaultListRenderer, getListRendererById } from '@joplin/lib/services/noteList/renderers';
import Logger from '@joplin/utils/Logger';
import NoteListHeader, { OnItemClickEventHander } from '../NoteListHeader/NoteListHeader';
import { _ } from '@joplin/lib/locale';
import { BaseBreakpoint, Breakpoints, Column } from '../NoteList/utils/types';
import { ButtonSize, buttonSizePx } from '../Button/Button';
import Setting from '@joplin/lib/models/Setting';

const logger = Logger.create('NoteListWrapper');

interface Props {
	resizableLayoutEventEmitter: any;
	size: Size;
	visible: boolean;
	themeId: number;
	listRendererId: string;
	startupPluginsLoaded: boolean;
	notesSortOrderField: string;
	notesSortOrderReverse: boolean;
}

const StyledRoot = styled.div`
	display: flex;
	flex-direction: column;
	overflow: hidden;
	width: 100%;
`;

// Even though these calculations mostly concern the NoteListControls component, we do them here
// because we need to know the height of that control to calculate the note list height.
const useNoteListControlsBreakpoints = (width: number, newNoteRef: React.MutableRefObject<any>) => {
	const [dynamicBreakpoints, setDynamicBreakpoints] = useState<Breakpoints>({ Sm: BaseBreakpoint.Sm, Md: BaseBreakpoint.Md, Lg: BaseBreakpoint.Lg, Xl: BaseBreakpoint.Xl });

	const getTextWidth = useCallback((text: string): number => {
		const canvas = document.createElement('canvas');
		if (!canvas) throw new Error('Failed to create canvas element');
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Failed to get context');
		const fontWeight = getComputedStyle(newNoteRef.current).getPropertyValue('font-weight');
		const fontSize = getComputedStyle(newNoteRef.current).getPropertyValue('font-size');
		const fontFamily = getComputedStyle(newNoteRef.current).getPropertyValue('font-family');
		ctx.font = `${fontWeight} ${fontSize} ${fontFamily}`;

		return ctx.measureText(text).width;
	}, [newNoteRef]);

	// Initialize language-specific breakpoints
	useEffect(() => {
		if (!newNoteRef.current) return;

		// Use the longest string to calculate the amount of extra width needed
		const smAdditional = getTextWidth(_('note')) > getTextWidth(_('to-do')) ? getTextWidth(_('note')) : getTextWidth(_('to-do'));
		const mdAdditional = getTextWidth(_('New note')) > getTextWidth(_('New to-do')) ? getTextWidth(_('New note')) : getTextWidth(_('New to-do'));

		const Sm = BaseBreakpoint.Sm + smAdditional * 2;
		const Md = BaseBreakpoint.Md + mdAdditional * 2;
		const Lg = BaseBreakpoint.Lg + Md;
		const Xl = BaseBreakpoint.Xl;

		setDynamicBreakpoints({ Sm, Md, Lg, Xl });
	}, [newNoteRef, getTextWidth]);

	const breakpoint: number = useMemo(() => {
		// Find largest breakpoint that width is less than
		const index = Object.values(dynamicBreakpoints).findIndex(x => width < x);

		return index === -1 ? dynamicBreakpoints.Xl : Object.values(dynamicBreakpoints)[index];
	}, [width, dynamicBreakpoints]);

	const lineCount = breakpoint !== dynamicBreakpoints.Xl ? 2 : 1;

	return { breakpoint, dynamicBreakpoints, lineCount };
};

// If the renderer ID that was saved to settings is already registered, we
// return it. If not, we need to wait for all plugins to be loaded, because one
// of them will most likely register the renderer we need. If none of them do,
// we use a default renderer instead of throwing an error.
const useListRenderer = (listRendererId: string, startupPluginsLoaded: boolean) => {
	const listRenderer = getListRendererById(listRendererId);
	if (listRenderer) return listRenderer;
	if (startupPluginsLoaded) {
		logger.error(`Tried to load renderer "${listRendererId}" but none of the registered renderers match this ID - using default renderer instead`);
		return getDefaultListRenderer();
	}
	return null;
};

const columns: Column[] = [
	{
		name: 'note.todo_completed',
		title: ' ',
		width: 40,
	},
	{
		name: 'note.user_updated_time',
		title: 'Updated',
		width: 100,
	},
	{
		name: 'note.title',
		title: 'Title',
		width: 0,
	},
];

export default function NoteListWrapper(props: Props) {
	const theme = themeStyle(props.themeId);
	const [controlHeight] = useState(theme.topRowHeight);
	const listRenderer = useListRenderer(props.listRendererId, props.startupPluginsLoaded);
	const newNoteButtonRef = useRef(null);

	const { breakpoint, dynamicBreakpoints, lineCount } = useNoteListControlsBreakpoints(props.size.width, newNoteButtonRef);

	const noteListControlsButtonSize = ButtonSize.Small;
	const noteListControlsPadding = theme.mainPadding;
	const noteListControlsButtonVerticalGap = 5;

	const noteListControlsHeight = useMemo(() => {
		if (lineCount === 1) {
			return buttonSizePx(noteListControlsButtonSize) + noteListControlsPadding * 2;
		} else {
			return buttonSizePx(noteListControlsButtonSize) * 2 + noteListControlsPadding * 2 + noteListControlsButtonVerticalGap;
		}
	}, [lineCount, noteListControlsButtonSize, noteListControlsPadding, noteListControlsButtonVerticalGap]);

	const noteListSize = useMemo(() => {
		return {
			width: props.size.width,
			height: props.size.height - noteListControlsHeight,
		};
	}, [props.size, noteListControlsHeight]);

	const onHeaderItemClick: OnItemClickEventHander = useCallback(event => {
		const field = event.name.split('.')[1];

		if (Setting.value('notes.sortOrder.field') === field) {
			Setting.toggle('notes.sortOrder.reverse');
		} else {
			Setting.setValue('notes.sortOrder.field', field);
		}
	}, []);

	const renderHeader = () => {
		return <NoteListHeader
			height={listRenderer.headerHeight}
			template={listRenderer.headerTemplate}
			onClick={listRenderer.onHeaderClick}
			columns={columns}
			notesSortOrderField={props.notesSortOrderField}
			notesSortOrderReverse={props.notesSortOrderReverse}
			onItemClick={onHeaderItemClick}
		/>;
	};

	const renderNoteList = () => {
		if (!listRenderer) return null;
		return <NoteList2
			listRenderer={listRenderer}
			resizableLayoutEventEmitter={props.resizableLayoutEventEmitter}
			size={noteListSize}
			visible={props.visible}
			columns={columns}
		/>;
	};

	return (
		<StyledRoot>
			<NoteListControls
				height={controlHeight}
				width={noteListSize.width}
				newNoteButtonRef={newNoteButtonRef}
				breakpoint={breakpoint}
				dynamicBreakpoints={dynamicBreakpoints}
				lineCount={lineCount}
				buttonSize={noteListControlsButtonSize}
				padding={noteListControlsPadding}
				buttonVerticalGap={noteListControlsButtonVerticalGap}
			/>
			{renderHeader()}
			{renderNoteList()}
		</StyledRoot>
	);
}
