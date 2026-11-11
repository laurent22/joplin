import CommandService, { CommandContext, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { EditorControl } from '@joplin/editor/types';
import useNowEffect from '@joplin/lib/hooks/useNowEffect';
import commandDeclarations, { enabledCondition, visibleCondition } from '../commandDeclarations';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('useEditorCommandHandler');

const commandRuntime = (declaration: CommandDeclaration, editor: EditorControl) => {
	return {
		execute: async (_context: CommandContext, ...args: unknown[]) => {
			// Many editor CodeMirror commands are missing the editor. prefix.
			let commandName = declaration.name.replace(/^editor\./, '');

			if (commandName === 'execCommand') {
				const first = args[0] as { name?: string; args?: unknown[] } | undefined;
				commandName = first?.name;
				args = first?.args ?? [];

				if (!commandName) {
					throw new Error('editor.execCommand is missing the name of the command to execute');
				}
			}

			if (!(await editor.supportsCommand(commandName))) {
				logger.warn('Command not supported by editor: ', commandName);
				return;
			}

			return await editor.execCommand(commandName, ...args);
		},
		enabledCondition: enabledCondition(declaration.name),
		visibleCondition: visibleCondition(declaration.name),
	};
};

const useEditorCommandHandler = (editorControl: EditorControl) => {
	// useNowEffect: The command runtimes need to be registered before child components
	// can render.
	useNowEffect(() => {
		const commandService = CommandService.instance();
		for (const declaration of commandDeclarations) {
			commandService.registerRuntime(declaration.name, commandRuntime(declaration, editorControl));
		}

		return () => {
			for (const declaration of commandDeclarations) {
				commandService.unregisterRuntime(declaration.name);
			}
		};
	}, []);
};

export default useEditorCommandHandler;
