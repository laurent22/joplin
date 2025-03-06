import CommandService, { CommandContext, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { EditorControl } from '@joplin/editor/types';
import useNowEffect from '@joplin/lib/hooks/useNowEffect';
import commandDeclarations, { enabledCondition } from '../commandDeclarations';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('useEditorCommandHandler');

const commandRuntime = (declaration: CommandDeclaration, editor: EditorControl) => {
	return {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		execute: async (_context: CommandContext, ...args: any[]) => {
			// Many editor CodeMirror commands are missing the editor. prefix.
			let commandName = declaration.name.replace(/^editor\./, '');

			if (commandName === 'execCommand') {
				commandName = args[0]?.name;
				args = args[0]?.args ?? [];

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
