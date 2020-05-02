import { useEffect } from 'react';
import { FormNote, EditorCommand } from './types';
const { time } = require('lib/time-utils.js');
const { reg } = require('lib/registry.js');
const NoteListUtils = require('../../utils/NoteListUtils');

interface HookDependencies {
	windowCommand: any,
	formNote:FormNote,
	setShowLocalSearch:Function,
	dispatch:Function,
	noteSearchBarRef:any,
	editorRef:any,
	titleInputRef:any,
	saveNoteAndWait: Function,
}

export default function useWindowCommandHandler(dependencies:HookDependencies) {
	const { windowCommand, dispatch, formNote, setShowLocalSearch, noteSearchBarRef, editorRef, titleInputRef, saveNoteAndWait } = dependencies;

	useEffect(() => {
		async function processCommand() {
			const command = windowCommand;

			if (!command || !formNote) return;

			reg.logger().debug('NoteEditor::useWindowCommandHandler:', command);

			const editorCmd: EditorCommand = { name: '', value: command.value };
			let fn: Function = null;

			// These commands can be forwarded directly to the note body editor
			// without transformation.
			const directMapCommands = [
				'textCode',
				'textBold',
				'textItalic',
				'textLink',
				'attachFile',
				'textNumberedList',
				'textBulletedList',
				'textCheckbox',
				'textHeading',
				'textHorizontalRule',
			];

			if (directMapCommands.includes(command.name)) {
				editorCmd.name = command.name;
			} else if (command.name === 'commandStartExternalEditing') {
				fn = async () => {
					await saveNoteAndWait(formNote);
					NoteListUtils.startExternalEditing(formNote.id);
				};
			} else if (command.name === 'commandStopExternalEditing') {
				fn = () => {
					NoteListUtils.stopExternalEditing(formNote.id);
				};
			} else if (command.name === 'insertDateTime') {
				editorCmd.name = 'insertText',
				editorCmd.value = time.formatMsToLocal(new Date().getTime());
			} else if (command.name === 'showLocalSearch') {
				setShowLocalSearch(true);
				if (noteSearchBarRef.current) noteSearchBarRef.current.wrappedInstance.focus();
			} else if (command.name === 'insertTemplate') {
				editorCmd.name = 'insertText',
				editorCmd.value = time.formatMsToLocal(new Date().getTime());
			}

			if (command.name === 'focusElement' && command.target === 'noteTitle') {
				fn = () => {
					if (!titleInputRef.current) return;
					titleInputRef.current.focus();
				};
			}

			if (command.name === 'focusElement' && command.target === 'noteBody') {
				editorCmd.name = 'focus';
			}

			reg.logger().debug('NoteEditor::useWindowCommandHandler: Dispatch:', editorCmd, fn);

			if (!editorCmd.name && !fn) return;

			dispatch({
				type: 'WINDOW_COMMAND',
				name: null,
			});

			requestAnimationFrame(() => {
				if (fn) {
					fn();
				} else {
					if (!editorRef.current.execCommand) {
						reg.logger().warn('Received command, but editor cannot execute commands', editorCmd);
					} else {
						editorRef.current.execCommand(editorCmd);
					}
				}
			});
		}

		processCommand();
	}, [windowCommand, dispatch, formNote, saveNoteAndWait]);
}
