import { MutableRefObject, RefObject, Dispatch, SetStateAction, useEffect, useContext } from 'react';
import { Dispatch as ReduxDispatch } from 'redux';
import { WindowCommandDependencies, NoteBodyEditorRef, OnChangeEvent, ScrollOptionTypes } from './types';
import editorCommandDeclarations, { enabledCondition } from '../editorCommandDeclarations';
import CommandService, { CommandDeclaration, CommandRuntime, CommandContext, RegisteredRuntime } from '@joplin/lib/services/CommandService';
import { formatMsToLocal } from '@joplin/utils/time';
import { reg } from '@joplin/lib/registry';
import getWindowCommandPriority from './getWindowCommandPriority';
import { State } from '@joplin/lib/reducer';
import { WindowIdContext } from '../../NewWindowOrIFrame';

const commandsWithDependencies = [
	require('../commands/showLocalSearch'),
	require('../commands/focusElementNoteTitle'),
	require('../commands/focusElementNoteBody'),
	require('../commands/focusElementNoteViewer'),
	require('../commands/focusElementToolbar'),
	require('../commands/pasteAsText'),
	require('../commands/pasteAsMarkdown'),
];

type OnBodyChange = (event: OnChangeEvent)=> void;

interface HookDependencies {
	setShowLocalSearch: Dispatch<SetStateAction<boolean>>;
	dispatch: ReduxDispatch;
	noteSearchBarRef: MutableRefObject<HTMLInputElement | null>;
	editorRef: RefObject<NoteBodyEditorRef>;
	titleInputRef: RefObject<HTMLInputElement>;
	onBodyChange: OnBodyChange;
	containerRef: RefObject<HTMLDivElement|null>;
}

function editorCommandRuntime(
	declaration: CommandDeclaration,
	editorRef: RefObject<NoteBodyEditorRef>,
	onBodyChange: OnBodyChange,
): CommandRuntime {
	return {
		execute: async (_context: CommandContext, ...args: unknown[]) => {
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
					value: formatMsToLocal(Date.now()),
				});
			} else if (declaration.name === 'scrollToHash') {
				return editorRef.current.scrollTo({
					type: ScrollOptionTypes.Hash,
					value: args[0],
				});
			} else if (declaration.name === 'editor.setText') {
				onBodyChange({ content: args[0], changeId: 0 });
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
	const { setShowLocalSearch, noteSearchBarRef, editorRef, titleInputRef, onBodyChange, containerRef } = dependencies;
	const windowId = useContext(WindowIdContext);

	useEffect(() => {
		const getRuntimePriority = (_state: State, targetWindowId: string|null) => {
			return getWindowCommandPriority(containerRef, windowId === targetWindowId);
		};

		const deregisterCallbacks: RegisteredRuntime[] = [];
		for (const declaration of editorCommandDeclarations) {
			const runtime = editorCommandRuntime(declaration, editorRef, onBodyChange);
			deregisterCallbacks.push(CommandService.instance().registerRuntime(
				declaration.name,
				{ ...runtime, getPriority: getRuntimePriority },
				true,
			));
		}

		const dependencies: WindowCommandDependencies = {
			editorRef,
			setShowLocalSearch,
			noteSearchBarRef,
			titleInputRef,
			containerRef,
		};

		for (const command of commandsWithDependencies) {
			const runtime = command.runtime(dependencies);
			deregisterCallbacks.push(CommandService.instance().registerRuntime(
				command.declaration.name,
				{ ...runtime, getPriority: getRuntimePriority },
				true,
			));
		}

		return () => {
			for (const runtime of deregisterCallbacks) {
				runtime.deregister();
			}
		};
	}, [editorRef, windowId, setShowLocalSearch, noteSearchBarRef, titleInputRef, onBodyChange, containerRef]);
}
