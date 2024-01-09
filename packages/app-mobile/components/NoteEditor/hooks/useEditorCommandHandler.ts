import CommandService, { CommandContext, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { EditorControl } from '../types';
import { useEffect } from 'react';
import commandDeclarations, { enabledCondition } from '../commandDeclarations';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('useEditorCommandHandler');

const commandRuntime = (declaration: CommandDeclaration, editor: EditorControl) => {
	return {
		execute: async (_context: CommandContext, ...args: any[]) => {
			let commandName = declaration.name.replace(/^editor\./, '');
			if (declaration.name === 'editor.execCommand') {
				commandName = args[0];
				args = args.slice(1);
			}

			// Many editor CodeMirror commands are missing the editor. prefix.
			if (!editor.supportsCommand(commandName)) {
				logger.warn('Command not supported by editor: ', commandName);
				return;
			}

			return await editor.execCommand(commandName, args);
		},
		enabledCondition: enabledCondition(declaration.name),
	};
};

const useEditorCommandHandler = (editorControl: EditorControl) => {
	useEffect(() => {
		const commandService = CommandService.instance();
		for (const declaration of commandDeclarations) {
			commandService.registerRuntime(declaration.name, commandRuntime(declaration, editorControl));
		}

		return () => {
			for (const declaration of commandDeclarations) {
				commandService.unregisterRuntime(declaration.name);
			}
		};
	});
};

export default useEditorCommandHandler;
