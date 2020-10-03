import KeymapService from './KeymapService';
import eventManager from 'lib/eventManager';
import BaseService from 'lib/services/BaseService';
import shim from 'lib/shim';

type LabelFunction = () => string;

export interface CommandRuntime {
	execute(props:any):Promise<any>
	isEnabled?(props:any):boolean

	// "state" type is "AppState" but in order not to introduce a
	// dependency to the desktop app (so that the service can
	// potentially be used by the mobile app too), we keep it as "any".
	// Individual commands can define it as state:AppState when relevant.
	//
	// In general this method should reduce the provided state to only
	// what's absolutely necessary. For example, if the property of a
	// note is needed, return only that particular property and not the
	// whole note object. This will ensure that components that depends
	// on this command are not uncessarily re-rendered. A note object for
	// example might change frequently but its markdown_language property
	// will almost never change.
	mapStateToProps?(state:any):any

	// Used for the (optional) toolbar button title
	title?(props:any):string,
	props?:any
}

export interface CommandDeclaration {
	name: string

	// Used for the menu item label, and toolbar button tooltip
	label?: LabelFunction | string,

	// This is a bit of a hack because some labels don't make much sense in isolation. For example,
	// the commmand to focus the note list is called just "Note list". This makes sense within the menu
	// but not so much within the keymap config screen, where the parent item is not displayed. Because
	// of this we have this "parentLabel()" property to clarify the meaning of the certain items.
	// For example, the focusElementNoteList will have these two properties:
	//     label() => _('Note list'),
	//     parentLabel() => _('Focus'),
	// Which will be displayed as "Focus: Note list" in the keymap config screen.
	parentLabel?:LabelFunction | string,

	// All free Font Awesome icons are available: https://fontawesome.com/icons?d=gallery&m=free
	iconName?: string,

	// Will be used by TinyMCE (which doesn't support Font Awesome icons).
	// Defaults to the "preferences" icon (a cog) if not specified.
	// https://www.tiny.cloud/docs/advanced/editor-icon-identifiers/
	tinymceIconName?: string,

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

export interface ToolbarButtonInfo {
	name: string,
	tooltip: string,
	iconName: string,
	enabled: boolean,
	onClick():void,
	title: string,
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

interface ToolbarButtonCacheItem {
	info: ToolbarButtonInfo,
	props: any,
}

interface ToolbarButtonCache {
	[key:string]: ToolbarButtonCacheItem;
}

interface ToolbarButtonsCache {
	[key:string]: ToolbarButtonInfo[],
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

	private toolbarButtonCache_:ToolbarButtonCache = {};
	private toolbarButtonsCache_:ToolbarButtonsCache = {};

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

		if (Object.keys(previous).length !== Object.keys(next).length) return true;

		for (const n in previous) {
			if (previous[n] !== next[n]) {
				return true;
			}
		}

		return false;
	}

	scheduleMapStateToProps(state:any) {
		if (this.mapStateToPropsIID_) shim.clearTimeout(this.mapStateToPropsIID_);

		this.mapStateToPropsIID_ = shim.setTimeout(() => {
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
			...options,
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
		declaration = { ...declaration };
		if (!declaration.label) declaration.label = '';
		if (!declaration.iconName) declaration.iconName = '';

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

	async execute(commandName:string, args:any = null):Promise<any> {
		const command = this.commandByName(commandName);
		if (args === null && command.runtime.props) args = command.runtime.props;
		this.logger().info('CommandService::execute:', commandName, args);
		return command.runtime.execute(args ? args : {});
	}

	scheduleExecute(commandName:string, args:any = null) {
		shim.setTimeout(() => {
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

	iconName(commandName:string, variant:string = null):string {
		const command = this.commandByName(commandName);
		if (!command) throw new Error(`No such command: ${commandName}`);
		if (variant === 'tinymce') return command.declaration.tinymceIconName ? command.declaration.tinymceIconName : 'preferences';
		return command.declaration.iconName;
	}

	label(commandName:string, fullLabel:boolean = false):string {
		const command = this.commandByName(commandName);
		if (!command) throw new Error(`Command: ${commandName} is not declared`);
		const output = [];

		const parentLabel = (d:CommandDeclaration):string => {
			if (!d.parentLabel) return '';
			if (typeof d.parentLabel === 'function') return d.parentLabel();
			return d.parentLabel as string;
		};

		if (fullLabel && parentLabel(command.declaration)) output.push(parentLabel(command.declaration));
		output.push(typeof command.declaration.label === 'function' ? command.declaration.label() : command.declaration.label);
		return output.join(': ');
	}

	exists(commandName:string):boolean {
		const command = this.commandByName(commandName, { mustExist: false });
		return !!command;
	}

	private extractExecuteArgs(command:Command, executeArgs:any = null) {
		if (executeArgs) return executeArgs;
		if (!command.runtime) throw new Error(`Command: ${command.declaration.name}: Runtime is not defined - make sure it has been registered.`);
		if (command.runtime.props) return command.runtime.props;
		return {};
	}

	commandToToolbarButton(commandName:string, executeArgs:any = null):ToolbarButtonInfo {
		const command = this.commandByName(commandName, { runtimeMustBeRegistered: true });

		return {
			name: commandName,
			tooltip: this.label(commandName),
			iconName: command.declaration.iconName,
			enabled: this.isEnabled(commandName),
			onClick: () => {
				this.execute(commandName, this.extractExecuteArgs(command, executeArgs));
			},
			title: this.title(commandName),
		};
	}

	// This method ensures that if the provided commandNames and state hasn't changed
	// the output also won't change. Invididual toolbarButtonInfo also won't changed
	// if the state they use hasn't changed. This is to avoid useless renders of the toolbars.
	commandsToToolbarButtons(state:any, commandNames:string[]):ToolbarButtonInfo[] {
		const output:ToolbarButtonInfo[] = [];

		let allSame = true;

		for (const commandName of commandNames) {
			if (commandName === '-') {
				output.push({ type: 'separator' } as any);
				continue;
			}

			const command = this.commandByName(commandName, { runtimeMustBeRegistered: true });

			let newProps:any = {};

			if (command.runtime) {
				if (command.runtime.mapStateToProps) {
					newProps = command.runtime.mapStateToProps(state);
				}
			}

			const previousEntry = this.toolbarButtonCache_[commandName];
			if (previousEntry && !this.propsHaveChanged(previousEntry.props, newProps)) {
				output.push(previousEntry.info);
			} else {
				allSame = false;

				command.runtime.props = newProps;

				const info:ToolbarButtonInfo = {
					name: commandName,
					tooltip: this.label(commandName),
					iconName: command.declaration.iconName,
					enabled: this.isEnabled(commandName),
					onClick: async () => {
						return this.execute(commandName, this.extractExecuteArgs(command));
					},
					title: this.title(commandName),
				};

				output.push(info);

				this.toolbarButtonCache_[commandName] = {
					info: info,
					props: newProps,
				};
			}
		}

		const arrayCacheKey = commandNames.join('_');

		if (allSame && this.toolbarButtonsCache_[arrayCacheKey]) {
			return this.toolbarButtonsCache_[arrayCacheKey];
		}

		this.toolbarButtonsCache_[arrayCacheKey] = output;

		return output;
	}

	commandToMenuItem(commandName:string, executeArgs:any = null) {
		const command = this.commandByName(commandName);

		const item:any = {
			id: command.declaration.name,
			label: this.label(commandName),
			click: () => {
				this.execute(commandName, this.extractExecuteArgs(command, executeArgs));
			},
		};

		if (command.declaration.role) item.role = command.declaration.role;
		if (this.keymapService && this.keymapService.acceleratorExists(commandName)) {
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
