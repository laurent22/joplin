import { RefObject, useEffect } from 'react';
import { FormNote, NoteBodyEditorRef, ScrollOptionTypes } from './types';
import editorCommandDeclarations, { enabledCondition } from '../editorCommandDeclarations';
import CommandService, { CommandDeclaration, CommandRuntime, CommandContext } from '@joplin/lib/services/CommandService';
import time from '@joplin/lib/time';
import { reg } from '@joplin/lib/registry';

const commandsWithDependencies = [
	require('../commands/showLocalSearch'),
	require('../commands/focusElementNoteTitle'),
	require('../commands/focusElementNoteBody'),
	require('../commands/pasteAsText'),
];

type SetFormNoteCallback = (callback: (prev: FormNote)=> FormNote)=> void;

interface HookDependencies {
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	setShowLocalSearch: Function;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	dispatch: Function;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	noteSearchBarRef: any;
	editorRef: RefObject<NoteBodyEditorRef>;
	titleInputRef: RefObject<HTMLInputElement>;
	setFormNote: SetFormNoteCallback;
}

function editorCommandRuntime(
	declaration: CommandDeclaration,
	editorRef: RefObject<NoteBodyEditorRef>,
	setFormNote: SetFormNoteCallback,
): CommandRuntime {
	return {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		execute: async (_context: CommandContext, ...args: any[]) => {
			if (!editorRef.current) {
				reg.logger().warn('Received command, but editor is gone', declaration.name);
				return;
			}

			if (!editorRef.current.execCommand) {
				reg.logger().warn('Received command, but editor cannot execute commands', declaration.name);
				return;
			}

			if (declaration.name === 'insertDateTime') {
				return editorRef.current.execCommand({
					name: 'insertText',
					value: time.formatMsToLocal(new Date().getTime()),
				});
			} else if (declaration.name === 'scrollToHash') {
				return editorRef.current.scrollTo({
					type: ScrollOptionTypes.Hash,
					value: args[0],
				});
			} else if (declaration.name === 'editor.setText') {
				setFormNote((prev: FormNote) => {
					return { ...prev, body: args[0] };
				});
			} else {
				return editorRef.current.execCommand({
					name: declaration.name,
					value: args[0],
				});
			}
		},

		// We disable the editor commands whenever a modal dialog is visible,
		// otherwise the user might type something in a dialog and accidentally
		// change something in the editor. However, we still enable them for
		// GotoAnything so that it's possible to type eg `textBold` and bold the
		// currently selected text.
		//
		// https://github.com/laurent22/joplin/issues/5707
		enabledCondition: enabledCondition(declaration.name),
	};
}

export default function useWindowCommandHandler(dependencies: HookDependencies) {
	const { setShowLocalSearch, noteSearchBarRef, editorRef, titleInputRef, setFormNote } = dependencies;

	useEffect(() => {
		for (const declaration of editorCommandDeclarations) {
			CommandService.instance().registerRuntime(declaration.name, editorCommandRuntime(declaration, editorRef, setFormNote));
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
	}, [editorRef, setShowLocalSearch, noteSearchBarRef, titleInputRef, setFormNote]);
}
