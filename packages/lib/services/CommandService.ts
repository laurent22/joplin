import { State } from '../reducer';
import eventManager, { EventListenerCallback, EventName } from '../eventManager';
import BaseService from './BaseService';
import shim from '../shim';
import WhenClause from './WhenClause';
import type { WhenClauseContext } from './commands/stateToWhenClauseContext';

type LabelFunction = ()=> string;
type EnabledCondition = string;

export interface CommandContext {
	// The state may also be of type "AppState" (used by the desktop app), which inherits from "State" (used by all apps)
	state: State;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	dispatch: Function;
}

export interface CommandRuntime {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	execute(context: CommandContext, ...args: any[]): Promise<any | void>;
	enabledCondition?: EnabledCondition;
	// Used for the (optional) toolbar button title
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	mapStateToTitle?(state: any): string;
	// Used to break ties when commands are registered by different components.
	getPriority?(state: State): number;
}

export interface CommandDeclaration {
	name: string;

	// Used for the menu item label, and toolbar button tooltip
	label?: LabelFunction | string;

	// Command description - if none is provided, the label will be used as description
	description?: string;

	// This is a bit of a hack because some labels don't make much sense in isolation. For example,
	// the commmand to focus the note list is called just "Note list". This makes sense within the menu
	// but not so much within the keymap config screen, where the parent item is not displayed. Because
	// of this we have this "parentLabel()" property to clarify the meaning of the certain items.
	// For example, the focusElementNoteList will have these two properties:
	//     label() => _('Note list'),
	//     parentLabel() => _('Focus'),
	// Which will be displayed as "Focus: Note list" in the keymap config screen.
	parentLabel?: LabelFunction | string;

	// All free Font Awesome icons are available: https://fontawesome.com/icons?d=gallery&m=free
	iconName?: string;

	// Same as `role` key in Electron MenuItem:
	// https://www.electronjs.org/docs/api/menu-item#new-menuitemoptions
	// Note that due to a bug in Electron, menu items with a role cannot
	// be disabled.
	role?: string;
}

export interface Command {
	declaration: CommandDeclaration;
	runtime?: CommandRuntime|CommandRuntime[];
}

interface CommandSpec {
	declaration: CommandDeclaration;
	runtime: ()=> CommandRuntime;
}

export interface ComponentCommandSpec<ComponentType> {
	declaration: CommandDeclaration;
	runtime: (component: ComponentType)=> CommandRuntime;
}

interface Commands {
	[key: string]: Command;
}

interface ReduxStore {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	dispatch(action: any): void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	getState(): any;
}

interface Utils {
	store: ReduxStore;
}

export const utils: Utils = {
	store: {
		dispatch: () => {},
		getState: () => {},
	},
};

interface CommandByNameOptions {
	mustExist?: boolean;
	runtimeMustBeRegistered?: boolean;
}

export interface SearchResult {
	commandName: string;
	title: string;
}

export interface RegisteredRuntime {
	deregister: ()=> void;
}

export default class CommandService extends BaseService {

	private static instance_: CommandService;

	public static instance(): CommandService {
		if (this.instance_) return this.instance_;
		this.instance_ = new CommandService();
		return this.instance_;
	}

	private commands_: Commands = {};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private store_: ReduxStore;
	private devMode_: boolean;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	private stateToWhenClauseContext_: Function;

	// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
	public initialize(store: any, devMode: boolean, stateToWhenClauseContext: Function) {
		utils.store = store;
		this.store_ = store;
		this.devMode_ = devMode;
		this.stateToWhenClauseContext_ = stateToWhenClauseContext;
	}

	public on<Name extends EventName>(eventName: Name, callback: EventListenerCallback<Name>) {
		eventManager.on(eventName, callback);
	}

	public off<Name extends EventName>(eventName: Name, callback: EventListenerCallback<Name>) {
		eventManager.off(eventName, callback);
	}

	public searchCommands(query: string, returnAllWhenEmpty: boolean, excludeWithoutLabel = true): SearchResult[] {
		query = query.toLowerCase();

		const output = [];

		const whenClauseContext = this.currentWhenClauseContext();

		for (const commandName of this.commandNames()) {
			const label = this.label(commandName, true);
			if (!label && excludeWithoutLabel) continue;
			if (!this.isEnabled(commandName, whenClauseContext)) continue;

			const title = label ? `${label} (${commandName})` : commandName;

			if ((returnAllWhenEmpty && !query) || title.toLowerCase().includes(query)) {
				output.push({
					commandName: commandName,
					title: title,
				});
			}
		}

		output.sort((a: SearchResult, b: SearchResult) => {
			return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : +1;
		});

		return output;
	}

	public commandNames(publicOnly = false) {
		if (publicOnly) {
			const output = [];
			for (const name in this.commands_) {
				if (!this.isPublic(name)) continue;
				output.push(name);
			}
			return output;
		} else {
			return Object.keys(this.commands_);
		}
	}

	public commandByName(name: string, options: CommandByNameOptions = null): Command {
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

	public registerDeclaration(declaration: CommandDeclaration) {
		declaration = { ...declaration };
		if (!declaration.label) declaration.label = '';
		if (!declaration.iconName) declaration.iconName = 'fas fa-cog';

		this.commands_[declaration.name] = {
			declaration: declaration,
		};
	}

	public unregisterDeclaration(name: string) {
		delete this.commands_[name];
	}

	public registerRuntime(commandName: string, runtime: CommandRuntime, allowMultiple = false): RegisteredRuntime {
		if (typeof commandName !== 'string') throw new Error(`Command name must be a string. Got: ${JSON.stringify(commandName)}`);

		const command = this.commandByName(commandName);

		runtime = { ...runtime };
		if (!runtime.enabledCondition) runtime.enabledCondition = 'true';
		if (!allowMultiple) {
			command.runtime = runtime;
		} else {
			if (!Array.isArray(command.runtime)) {
				command.runtime = command.runtime ? [command.runtime] : [];
			}
			command.runtime.push(runtime);
		}

		return {
			// Like .deregisterRuntime, but deletes only the current runtime if there are multiple runtimes
			// for the same command.
			deregister: () => {
				const command = this.commandByName(commandName);
				if (Array.isArray(command.runtime)) {
					command.runtime = command.runtime.filter(r => {
						return r !== runtime;
					});

					if (command.runtime.length === 0) {
						delete command.runtime;
					}
				} else if (command.runtime) {
					delete command.runtime;
				}
			},
		};
	}

	public registerCommands(commands: CommandSpec[]) {
		for (const command of commands) {
			CommandService.instance().registerRuntime(command.declaration.name, command.runtime());
		}
	}

	public unregisterCommands(commands: CommandSpec[]) {
		for (const command of commands) {
			CommandService.instance().unregisterRuntime(command.declaration.name);
		}
	}

	public componentRegisterCommands<ComponentType>(component: ComponentType, commands: ComponentCommandSpec<ComponentType>[], allowMultiple?: boolean): RegisteredRuntime {
		const runtimeHandles: RegisteredRuntime[] = [];
		for (const command of commands) {
			runtimeHandles.push(
				CommandService.instance().registerRuntime(command.declaration.name, command.runtime(component), allowMultiple),
			);
		}
		return {
			deregister: () => {
				for (const handle of runtimeHandles) {
					handle.deregister();
				}
			},
		};
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public componentUnregisterCommands(commands: ComponentCommandSpec<any>[]) {
		for (const command of commands) {
			CommandService.instance().unregisterRuntime(command.declaration.name);
		}
	}

	public unregisterRuntime(commandName: string) {
		const command = this.commandByName(commandName, { mustExist: false });
		if (!command || !command.runtime) return;
		delete command.runtime;
	}

	private createContext(): CommandContext {
		return {
			state: this.store_.getState(),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			dispatch: (action: any) => {
				this.store_.dispatch(action);
			},
		};
	}

	private getRuntime(command: Command) {
		if (!Array.isArray(command.runtime)) return command.runtime;
		if (!command.runtime.length) return null;

		let bestRuntime = null;
		let bestRuntimeScore = -1;
		for (const runtime of command.runtime) {
			const score = runtime.getPriority?.(this.store_.getState()) ?? 0;
			if (score >= bestRuntimeScore) {
				bestRuntime = runtime;
				bestRuntimeScore = score;
			}
		}
		return bestRuntime;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async execute(commandName: string, ...args: any[]): Promise<any | void> {
		const command = this.commandByName(commandName);
		// Some commands such as "showModalMessage" can be executed many
		// times per seconds, so we should only display this message in
		// debug mode.
		if (commandName !== 'showModalMessage') this.logger().debug('CommandService::execute:', commandName, args);

		const runtime = this.getRuntime(command);
		if (!runtime) throw new Error(`Cannot execute a command without a runtime: ${commandName}`);

		return runtime.execute(this.createContext(), ...args);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public scheduleExecute(commandName: string, args: any) {
		shim.setTimeout(() => {
			void this.execute(commandName, args);
		}, 10);
	}

	public currentWhenClauseContext(): WhenClauseContext {
		return this.stateToWhenClauseContext_(this.store_.getState());
	}

	public isPublic(commandName: string) {
		return !!this.label(commandName);
	}

	// When looping on commands and checking their enabled state, the whenClauseContext
	// should be specified (created using currentWhenClauseContext) to avoid having
	// to re-create it on each call.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public isEnabled(commandName: string, whenClauseContext: any = null): boolean {
		const command = this.commandByName(commandName);
		if (!command) return false;
		const runtime = this.getRuntime(command);
		if (!runtime) return false;

		if (!whenClauseContext) whenClauseContext = this.currentWhenClauseContext();

		const exp = new WhenClause(runtime.enabledCondition, this.devMode_);
		return exp.evaluate(whenClauseContext);
	}

	// The title is dynamic and derived from the state, which is why the state is passed
	// as an argument. Title can be used for example to display the alarm date on the
	// "set alarm" toolbar button.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public title(commandName: string, state: any = null): string {
		const command = this.commandByName(commandName);
		if (!command) return null;
		const runtime = this.getRuntime(command);
		if (!runtime) return null;

		state = state || this.store_.getState();

		if (runtime.mapStateToTitle) {
			return runtime.mapStateToTitle(state);
		} else {
			return '';
		}
	}

	public iconName(commandName: string): string {
		const command = this.commandByName(commandName);
		if (!command) throw new Error(`No such command: ${commandName}`);

		return command.declaration.iconName;
	}

	public label(commandName: string, fullLabel = false): string {
		const command = this.commandByName(commandName);
		if (!command) throw new Error(`Command: ${commandName} is not declared`);
		const output = [];

		const parentLabel = (d: CommandDeclaration): string => {
			if (!d.parentLabel) return '';
			if (typeof d.parentLabel === 'function') return d.parentLabel();
			return d.parentLabel as string;
		};

		if (fullLabel && parentLabel(command.declaration)) output.push(parentLabel(command.declaration));
		output.push(typeof command.declaration.label === 'function' ? command.declaration.label() : command.declaration.label);
		return output.join(': ');
	}

	public description(commandName: string): string {
		const command = this.commandByName(commandName);
		if (command.declaration.description) return command.declaration.description;
		return this.label(commandName, true);
	}

	public exists(commandName: string): boolean {
		const command = this.commandByName(commandName, { mustExist: false });
		return !!command;
	}
}
