import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import CommandService from '@joplin/lib/services/CommandService';
import { ChangeEvent, useCallback, useContext, useRef } from 'react';
import NoteToolbar from '../../NoteToolbar/NoteToolbar';
import { buildStyle } from '@joplin/lib/theme';
import time from '@joplin/lib/time';
import { WindowIdContext } from '../../NewWindowOrIFrame';

interface Props {
	themeId: number;
	noteUserUpdatedTime: number;
	noteTitle: string;
	noteIsTodo: number;
	isProvisional: boolean;
	titleInputRef: React.RefObject<HTMLInputElement>;
	onTitleChange(event: ChangeEvent<HTMLInputElement>): void;
	disabled: boolean;
}

function styles_(props: Props) {
	return buildStyle(['NoteEditorTitleBar'], props.themeId, theme => {
		return {
			titleInput: {
				flex: 1,
				display: 'inline-block',
				paddingTop: 5,
				minHeight: 38,
				boxSizing: 'border-box',
				fontWeight: 'bold',
				paddingBottom: 5,
				paddingLeft: 0,
				paddingRight: 8,
				color: theme.textStyle.color,
				fontSize: Math.round(theme.textStyle.fontSize * 1.5),
				backgroundColor: theme.backgroundColor,
				border: 'none',
				width: '100%',
			},

			titleDate: {
				...theme.textStyle,
				color: theme.colorFaded,
				paddingLeft: 8,
				whiteSpace: 'nowrap',
			},
			toolbarStyle: {
				marginBottom: 0,
				minWidth: 0,
			},
		};
	});
}

const useReselectHandlers = () => {
	const lastTitleFocus = useRef([0, 0]);
	const lastTitleValue = useRef('');

	const onTitleBlur: React.FocusEventHandler<HTMLInputElement> = useCallback((event) => {
		const titleElement = event.currentTarget;
		lastTitleFocus.current = [titleElement.selectionStart, titleElement.selectionEnd];
		lastTitleValue.current = titleElement.value;
	}, []);

	const onTitleFocus: React.FocusEventHandler<HTMLInputElement> = useCallback((event) => {
		const titleElement = event.currentTarget;
		// By default, focusing the note title bar can cause its content to become selected. We override
		// this with a more reasonable default:
		if (titleElement.selectionStart === 0 && titleElement.selectionEnd === titleElement.value.length) {
			if (lastTitleValue.current !== titleElement.value) {
				titleElement.selectionStart = titleElement.value.length;
			} else {
				titleElement.selectionStart = lastTitleFocus.current[0];
				titleElement.selectionEnd = lastTitleFocus.current[1];
			}
		}
	}, []);

	return { onTitleBlur, onTitleFocus };
};

export default function NoteTitleBar(props: Props) {
	const styles = styles_(props);

	const onTitleKeydown: React.KeyboardEventHandler<HTMLInputElement> = useCallback((event) => {
		const titleElement = event.currentTarget;
		const selectionAtEnd = titleElement.selectionEnd === titleElement.value.length;
		if ((event.key === 'ArrowDown' && selectionAtEnd) || event.key === 'Enter') {
			event.preventDefault();
			const moveCursorToStart = event.key === 'ArrowDown';
			void CommandService.instance().execute('focusElement', 'noteBody', { moveCursorToStart });
		}
	}, []);

	const { onTitleFocus, onTitleBlur } = useReselectHandlers();

	function renderTitleBarDate() {
		return <span className="updated-time-label" style={styles.titleDate}>{time.formatMsToLocal(props.noteUserUpdatedTime)}</span>;
	}

	const windowId = useContext(WindowIdContext);

	function renderNoteToolbar() {
		return <NoteToolbar
			themeId={props.themeId}
			style={styles.toolbarStyle}
			disabled={props.disabled}
			windowId={windowId}
		/>;
	}

	return (
		<div className='note-title-wrapper'>
			<input
				className="title-input"
				type="text"
				ref={props.titleInputRef}
				placeholder={props.isProvisional ? (props.noteIsTodo ? _('Creating new to-do...') : _('Creating new note...')) : ''}
				style={styles.titleInput}
				readOnly={props.disabled}
				onChange={props.onTitleChange}
				onKeyDown={onTitleKeydown}
				onFocus={onTitleFocus}
				onBlur={onTitleBlur}
				value={props.noteTitle}
			/>
			<div className='note-title-info-group'>
				{renderTitleBarDate()}
				{renderNoteToolbar()}
			</div>
		</div>
	);
}
