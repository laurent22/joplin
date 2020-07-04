import CommandService from '../../CommandService';
export default class SandboxJoplinCommands {
	execute(commandName: string, args: any) {
		CommandService.instance().execute(commandName, args);
	}
}
