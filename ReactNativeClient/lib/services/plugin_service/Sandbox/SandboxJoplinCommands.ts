import CommandService, { CommandDeclaration, CommandRuntime } from 'lib/services/CommandService';

export default class SandboxJoplinCommands {

	execute(commandName: string, args: any) {
		CommandService.instance().execute(commandName, args);
	}

	register(declaration:CommandDeclaration, runtime:CommandRuntime) {
		CommandService.instance().registerDeclaration(declaration);
		CommandService.instance().registerRuntime(declaration.name, runtime);
	}

}
