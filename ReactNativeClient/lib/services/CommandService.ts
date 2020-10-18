import { State } from 'lib/reducer';
import eventManager from 'lib/eventManager';
// import markdownUtils, { MarkdownTableHeader, MarkdownTableRow } from 'lib/markdownUtils';
import BaseService from 'lib/services/BaseService';
import shim from 'lib/shim';
import WhenClause from './WhenClause';
import stateToWhenClauseContext from './commands/stateToWhenClauseContext';

type LabelFunction = () => string;
type EnabledCondition = string;

export interface CommandContext {
	// The state may also be of type "AppState" (used by the desktop app), which inherits from "State" (used by all apps)
	state: State,
}

export interface CommandRuntime {
	execute(context:CommandContext, ...args:any[]):Promise<any>
	enabledCondition?: EnabledCondition;
	// Used for the (optional) toolbar button title
	mapStateToTitle?(state:any):string,
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

export default class CommandService extends BaseService {

	private static instance_:CommandService;

	static instance():CommandService {
		if (this.instance_) return this.instance_;
		this.instance_ = new CommandService();
		return this.instance_;
	}

	private commands_:Commands = {};
	private store_:any;

	initialize(store:any) {
		utils.store = store;
		this.store_ = store;
	}

	public on(eventName:string, callback:Function) {
		eventManager.on(eventName, callback);
	}

	public off(eventName:string, callback:Function) {
		eventManager.off(eventName, callback);
	}

	public commandByName(name:string, options:CommandByNameOptions = null):Command {
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

	public registerDeclaration(declaration:CommandDeclaration) {
		declaration = { ...declaration };
		if (!declaration.label) declaration.label = '';
		if (!declaration.iconName) declaration.iconName = '';

		this.commands_[declaration.name] = {
			declaration: declaration,
		};
	}

	public registerRuntime(commandName:string, runtime:CommandRuntime) {
		if (typeof commandName !== 'string') throw new Error(`Command name must be a string. Got: ${JSON.stringify(commandName)}`);

		const command = this.commandByName(commandName);

		runtime = Object.assign({}, runtime);
		if (!runtime.enabledCondition) runtime.enabledCondition = 'true';
		command.runtime = runtime;
	}

	public componentRegisterCommands(component:any, commands:any[]) {
		for (const command of commands) {
			CommandService.instance().registerRuntime(command.declaration.name, command.runtime(component));
		}
	}

	public componentUnregisterCommands(commands:any[]) {
		for (const command of commands) {
			CommandService.instance().unregisterRuntime(command.declaration.name);
		}
	}

	public unregisterRuntime(commandName:string) {
		const command = this.commandByName(commandName, { mustExist: false });
		if (!command || !command.runtime) return;
		delete command.runtime;
	}

	public async execute(commandName:string, ...args:any[]):Promise<any> {
		const command = this.commandByName(commandName);
		this.logger().info('CommandService::execute:', commandName, args);
		return command.runtime.execute({ state: this.store_.getState() }, ...args); // props ? props : {});
	}

	public scheduleExecute(commandName:string, args:any) {
		shim.setTimeout(() => {
			this.execute(commandName, args);
		}, 10);
	}

	public currentWhenClauseContext() {
		return stateToWhenClauseContext(this.store_.getState());
	}

	// When looping on commands and checking their enabled state, the whenClauseContext
	// should be specified (created using currentWhenClauseContext) to avoid having
	// to re-create it on each call.
	public isEnabled(commandName:string, whenClauseContext:any = null):boolean {
		const command = this.commandByName(commandName);
		if (!command || !command.runtime) return false;

		if (!whenClauseContext) whenClauseContext = this.currentWhenClauseContext();

		const exp = new WhenClause(command.runtime.enabledCondition);
		return exp.evaluate(whenClauseContext);
	}

	// public commandMapStateToProps(commandName:string, state:any):any {
	// 	const command = this.commandByName(commandName);
	// 	if (!command.runtime) return null;
	// 	if (!command.runtime.mapStateToProps) return null;
	// 	return command.runtime.mapStateToProps(state);
	// }

	// TODO: remove props?
	public title(commandName:string, state:any = null):string {
		const command = this.commandByName(commandName);
		if (!command || !command.runtime) return null;

		state = state || this.store_.getState();

		if (command.runtime.mapStateToTitle) {
			return command.runtime.mapStateToTitle(state);
		} else {
			return '';
		}
	}

	public iconName(commandName:string, variant:string = null):string {
		const command = this.commandByName(commandName);
		if (!command) throw new Error(`No such command: ${commandName}`);
		if (variant === 'tinymce') return command.declaration.tinymceIconName ? command.declaration.tinymceIconName : 'preferences';
		return command.declaration.iconName;
	}

	public label(commandName:string, fullLabel:boolean = false):string {
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

	public exists(commandName:string):boolean {
		const command = this.commandByName(commandName, { mustExist: false });
		return !!command;
	}

	// public commandsToMarkdownTable(state:any):string {
	// 	const headers:MarkdownTableHeader[] = [
	// 		{
	// 			name: 'commandName',
	// 			label: 'Name',
	// 		},
	// 		{
	// 			name: 'description',
	// 			label: 'Description',
	// 		},
	// 		{
	// 			name: 'props',
	// 			label: 'Props',
	// 		},
	// 	];

	// 	const rows:MarkdownTableRow[] = [];

	// 	for (const commandName in this.commands_) {
	// 		const props = this.commandMapStateToProps(commandName, state);

	// 		const row:MarkdownTableRow = {
	// 			commandName: commandName,
	// 			description: this.label(commandName),
	// 			props: JSON.stringify(props),
	// 		};

	// 		rows.push(row);
	// 	}

	// 	return markdownUtils.createMarkdownTable(headers, rows);
	// }

}
