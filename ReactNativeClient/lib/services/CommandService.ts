import KeymapService from './KeymapService';
const BaseService = require('lib/services/BaseService');
const eventManager = require('lib/eventManager');

export interface CommandRuntime {
	execute(props:any):void
	isEnabled?(props:any):boolean
	mapStateToProps?(state:any):any
	// Used for the (optional) toolbar button title
	title?(props:any):string,
	props?:any
}

export interface CommandDeclaration {
	name: string
	// Used for the menu item label, and toolbar button tooltip
	label?():string,
	iconName?: string,
	// Same as `role` key in Electron MenuItem:
	// https://www.electronjs.org/docs/api/menu-item#new-menuitemoptions
	// Note that due to a bug in Electron, menu items with a role cannot
	// be disabled.
	role?: string,
}

export interface Command {
	declaration: CommandDeclaration,
	runtime?: CommandRuntime,
}

interface Commands {
	[key:string]: Command;
}

interface ReduxStore {
	dispatch(action:any):void;
	getState():any;
}

interface Utils {
	store: ReduxStore;
}

export const utils:Utils = {
	store: {
		dispatch: () => {},
		getState: () => {},
	},
};

interface CommandByNameOptions {
	mustExist?:boolean,
	runtimeMustBeRegistered?:boolean,
}

interface CommandState {
	title: string,
	enabled: boolean,
}

interface CommandStates {
	[key:string]: CommandState
}

export default class CommandService extends BaseService {

	private static instance_:CommandService;

	static instance():CommandService {
		if (this.instance_) return this.instance_;
		this.instance_ = new CommandService();
		return this.instance_;
	}

	private commands_:Commands = {};
	private commandPreviousStates_:CommandStates = {};
	private mapStateToPropsIID_:any = null;

	private keymapService:KeymapService = null;

	initialize(store:any, keymapService:KeymapService) {
		utils.store = store;
		this.keymapService = keymapService;
	}

	public on(eventName:string, callback:Function) {
		eventManager.on(eventName, callback);
	}

	public off(eventName:string, callback:Function) {
		eventManager.off(eventName, callback);
	}

	private propsHaveChanged(previous:any, next:any) {
		if (!previous && next) return true;

		for (const n in previous) {
			if (previous[n] !== next[n]) return true;
		}

		return false;
	}

	scheduleMapStateToProps(state:any) {
		if (this.mapStateToPropsIID_) clearTimeout(this.mapStateToPropsIID_);

		this.mapStateToPropsIID_ = setTimeout(() => {
			this.mapStateToProps(state);
		}, 50);
	}

	private mapStateToProps(state:any) {
		const newState = state;

		const changedCommands:any = {};

		for (const name in this.commands_) {
			const command = this.commands_[name];

			if (!command.runtime) continue;

			if (!command.runtime.mapStateToProps) {
				command.runtime.props = {};
				continue;
			}

			const newProps = command.runtime.mapStateToProps(state);

			const haveChanged = this.propsHaveChanged(command.runtime.props, newProps);

			if (haveChanged) {
				const previousState = this.commandPreviousStates_[name];

				command.runtime.props = newProps;

				const newState:CommandState = {
					enabled: this.isEnabled(name),
					title: this.title(name),
				};

				if (!previousState || previousState.title !== newState.title || previousState.enabled !== newState.enabled) {
					changedCommands[name] = newState;
				}

				this.commandPreviousStates_[name] = newState;
			}
		}

		if (Object.keys(changedCommands).length) {
			eventManager.emit('commandsEnabledStateChange', { commands: changedCommands });
		}

		return newState;
	}

	private commandByName(name:string, options:CommandByNameOptions = null):Command {
		options = {
			mustExist: true,
			runtimeMustBeRegistered: false,
		};

		const command = this.commands_[name];

		if (!command) {
			if (options.mustExist) throw new Error(`Command not found: ${name}. Make sure the declaration has been registered.`);
			return null;
		}

		if (options.runtimeMustBeRegistered && !command.runtime) throw new Error(`Runtime is not registered for command ${name}`);
		return command;
	}

	registerDeclaration(declaration:CommandDeclaration) {
		// if (this.commands_[declaration.name]) throw new Error(`There is already a command with name ${declaration.name}`);

		declaration = { ...declaration };
		if (!declaration.label) declaration.label = () => '';
		if (!declaration.iconName) declaration.iconName = '';

		// In TypeScript it's not an issue, but in JavaScript it's easy to accidentally set the label
		// to a string instead of a function, and it will cause strange errors that are hard to debug.
		// So here check early that we have the right type.
		if (typeof declaration.label !== 'function') throw new Error(`declaration.label must be a function: ${declaration.name}`);

		this.commands_[declaration.name] = {
			declaration: declaration,
		};

		delete this.commandPreviousStates_[declaration.name];
	}

	registerRuntime(commandName:string, runtime:CommandRuntime) {
		if (typeof commandName !== 'string') throw new Error(`Command name must be a string. Got: ${JSON.stringify(commandName)}`);

		const command = this.commandByName(commandName);

		runtime = Object.assign({}, runtime);
		if (!runtime.isEnabled) runtime.isEnabled = () => true;
		if (!runtime.title) runtime.title = () => null;
		command.runtime = runtime;

		delete this.commandPreviousStates_[commandName];
	}

	componentRegisterCommands(component:any, commands:any[]) {
		for (const command of commands) {
			CommandService.instance().registerRuntime(command.declaration.name, command.runtime(component));
		}
	}

	componentUnregisterCommands(commands:any[]) {
		for (const command of commands) {
			CommandService.instance().unregisterRuntime(command.declaration.name);
		}
	}

	unregisterRuntime(commandName:string) {
		const command = this.commandByName(commandName, { mustExist: false });
		if (!command || !command.runtime) return;
		delete command.runtime;

		delete this.commandPreviousStates_[commandName];
	}

	execute(commandName:string, args:any = null) {
		console.info('CommandService::execute:', commandName, args);

		const command = this.commandByName(commandName);
		command.runtime.execute(args ? args : {});
	}

	scheduleExecute(commandName:string, args:any = null) {
		setTimeout(() => {
			this.execute(commandName, args);
		}, 10);
	}

	isEnabled(commandName:string):boolean {
		const command = this.commandByName(commandName);
		if (!command || !command.runtime) return false;
		if (!command.runtime.props) return false;
		return command.runtime.isEnabled(command.runtime.props);
	}

	title(commandName:string):string {
		const command = this.commandByName(commandName);
		if (!command || !command.runtime || !command.runtime.props) return null;
		return command.runtime.title(command.runtime.props);
	}

	private extractExecuteArgs(command:Command, executeArgs:any) {
		if (executeArgs) return executeArgs;
		if (!command.runtime) throw new Error(`Command: ${command.declaration.name}: Runtime is not defined - make sure it has been registered.`);
		if (command.runtime.props) return command.runtime.props;
		return {};
	}

	commandToToolbarButton(commandName:string, executeArgs:any = null) {
		const command = this.commandByName(commandName, { runtimeMustBeRegistered: true });

		return {
			tooltip: command.declaration.label(),
			iconName: command.declaration.iconName,
			enabled: this.isEnabled(commandName),
			onClick: () => {
				this.execute(commandName, this.extractExecuteArgs(command, executeArgs));
			},
			title: this.title(commandName),
		};
	}

	commandToMenuItem(commandName:string, executeArgs:any = null) {
		const command = this.commandByName(commandName);

		const item:any = {
			id: command.declaration.name,
			label: command.declaration.label(),
			click: () => {
				this.execute(commandName, this.extractExecuteArgs(command, executeArgs));
			},
		};

		if (command.declaration.role) item.role = command.declaration.role;
		if (this.keymapService.hasAccelerator(commandName)) {
			item.accelerator = this.keymapService.getAccelerator(commandName);
		}

		return item;
	}

	commandsEnabledState(previousState:any = null):any {
		const output:any = {};

		for (const name in this.commands_) {
			const enabled = this.isEnabled(name);
			if (!previousState || previousState[name] !== enabled) {
				output[name] = enabled;
			}
		}

		return output;
	}

}
