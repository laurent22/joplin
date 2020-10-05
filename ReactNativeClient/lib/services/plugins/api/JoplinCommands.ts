import CommandService, { CommandDeclaration, CommandRuntime } from 'lib/services/CommandService';

interface Command {
	name: string
	label: string
	iconName?: string,
	execute(props:any):Promise<any>
	isEnabled?(props:any):boolean
	mapStateToProps?(state:any):any
}

export default class JoplinCommands {

	/**
	 * <span class="platform-desktop">desktop</span> Executes the given command.
	 */
	async execute(commandName: string, args: any) {
		CommandService.instance().execute(commandName, args);
	}

	/**
	 * <span class="platform-desktop">desktop</span> Registers the given command.
	 */
	async register(command:Command) {
		const declaration:CommandDeclaration = {
			name: command.name,
			label: command.label,
		};

		if ('iconName' in command) declaration.iconName = command.iconName;

		const runtime:CommandRuntime = {
			execute: command.execute,
		};

		if ('isEnabled' in command) runtime.isEnabled = command.isEnabled;
		if ('mapStateToProps' in command) runtime.mapStateToProps = command.mapStateToProps;

		CommandService.instance().registerDeclaration(declaration);
		CommandService.instance().registerRuntime(declaration.name, runtime);
	}

}
