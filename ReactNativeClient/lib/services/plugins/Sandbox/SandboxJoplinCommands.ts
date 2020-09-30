import CommandService, { CommandDeclaration, CommandRuntime } from 'lib/services/CommandService';

export default class SandboxJoplinCommands {

	/**
	 * <span class="platform-desktop">desktop</span> Executes the given command.
	 */
	execute(commandName: string, args: any) {
		CommandService.instance().execute(commandName, args);
	}

	/**
	 * <span class="platform-desktop">desktop</span> Registers the given command.
	 */
	register(declaration:CommandDeclaration, runtime:CommandRuntime) {
		CommandService.instance().registerDeclaration(declaration);
		CommandService.instance().registerRuntime(declaration.name, runtime);
	}

}
