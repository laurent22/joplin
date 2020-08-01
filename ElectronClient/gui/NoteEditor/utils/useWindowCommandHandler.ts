import { useEffect } from 'react';
import { FormNote } from './types';
import editorCommandDeclarations from '../commands/editorCommandDeclarations';
import CommandService, { CommandDeclaration,  CommandRuntime } from '../../../lib/services/CommandService';
const { time } = require('lib/time-utils.js');
const BaseModel = require('lib/BaseModel');
const { reg } = require('lib/registry.js');
const { MarkupToHtml } = require('lib/joplin-renderer');

const commandsWithDependencies = [
	require('../commands/showLocalSearch'),
	require('../commands/focusElementNoteTitle'),
	require('../commands/focusElementNoteBody'),
];

interface HookDependencies {
	formNote:FormNote,
	setShowLocalSearch:Function,
	dispatch:Function,
	noteSearchBarRef:any,
	editorRef:any,
	titleInputRef:any,
	saveNoteAndWait: Function,
}

function editorCommandRuntime(declaration:CommandDeclaration, editorRef:any):CommandRuntime {
	return {
		execute: (props:any) => {
			console.info('Running editor command:', declaration.name, props);
			if (!editorRef.current.execCommand) {
				reg.logger().warn('Received command, but editor cannot execute commands', declaration.name);
			} else {
				const execArgs = {
					name: declaration.name,
					value: props.value,
				};

				if (declaration.name === 'insertDateTime') {
					execArgs.name = 'insertText';
					execArgs.value = time.formatMsToLocal(new Date().getTime());
				}

				editorRef.current.execCommand(execArgs);
			}
		},
		isEnabled: (props:any) => {
			if (props.markdownEditorViewerOnly) return false;
			if (!props.noteId) return false;
			const note = BaseModel.byId(props.notes, props.noteId);
			if (!note) return false;
			return note.markup_language === MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN;
		},
		mapStateToProps: (state:any) => {
			return {
				// True when the Markdown editor is active, and only the viewer pane is visible
				// In this case, all editor-related shortcuts are disabled.
				markdownEditorViewerOnly: state.settings['editor.codeView'] && state.noteVisiblePanes.length === 1 && state.noteVisiblePanes[0] === 'viewer',
				noteVisiblePanes: state.noteVisiblePanes,
				notes: state.notes,
				noteId: state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null,
			};
		},
	};
}

export default function useWindowCommandHandler(dependencies:HookDependencies) {
	const { setShowLocalSearch, noteSearchBarRef, editorRef, titleInputRef } = dependencies;

	useEffect(() => {
		for (const declaration of editorCommandDeclarations) {
			CommandService.instance().registerRuntime(declaration.name, editorCommandRuntime(declaration, editorRef));
		}

		const dependencies = {
			editorRef,
			setShowLocalSearch,
			noteSearchBarRef,
			titleInputRef,
		};

		for (const command of commandsWithDependencies) {
			CommandService.instance().registerRuntime(command.declaration.name, command.runtime(dependencies));
		}

		return () => {
			for (const declaration of editorCommandDeclarations) {
				CommandService.instance().unregisterRuntime(declaration.name);
			}

			for (const command of commandsWithDependencies) {
				CommandService.instance().unregisterRuntime(command.declaration.name);
			}
		};
	}, [editorRef, setShowLocalSearch, noteSearchBarRef, titleInputRef]);
}
