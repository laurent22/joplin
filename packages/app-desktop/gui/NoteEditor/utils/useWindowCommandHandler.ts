import { useEffect } from 'react';
import { FormNote, ScrollOptionTypes } from './types';
import editorCommandDeclarations from '../commands/editorCommandDeclarations';
import CommandService, { CommandDeclaration,  CommandRuntime, CommandContext } from '@joplin/lib/services/CommandService';
const time = require('@joplin/lib/time').default;
const { reg } = require('@joplin/lib/registry.js');

const commandsWithDependencies = [
	require('../commands/showLocalSearch'),
	require('../commands/focusElementNoteTitle'),
	require('../commands/focusElementNoteBody'),
];

interface HookDependencies {
	formNote: FormNote;
	setShowLocalSearch: Function;
	dispatch: Function;
	noteSearchBarRef: any;
	editorRef: any;
	titleInputRef: any;
	saveNoteAndWait: Function;
}

function editorCommandRuntime(declaration: CommandDeclaration, editorRef: any): CommandRuntime {
	return {
		execute: async (_context: CommandContext, ...args: any[]) => {
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
			} else {
				return editorRef.current.execCommand({
					name: declaration.name,
					value: args[0],
				});
			}
		},
		enabledCondition: '!modalDialogVisible && markdownEditorPaneVisible && oneNoteSelected && noteIsMarkdown',
	};
}

export default function useWindowCommandHandler(dependencies: HookDependencies) {
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
