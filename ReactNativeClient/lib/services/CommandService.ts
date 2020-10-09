import eventManager from 'lib/eventManager';
import markdownUtils, { MarkdownTableHeader, MarkdownTableRow } from 'lib/markdownUtils';
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
	// props?:any
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

	initialize(store:any) {
		utils.store = store;
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

	async execute(commandName:string, props:any = null):Promise<any> {
		const command = this.commandByName(commandName);
		this.logger().info('CommandService::execute:', commandName, props);
		return command.runtime.execute(props ? props : {});
	}

	scheduleExecute(commandName:string, args:any) {
		shim.setTimeout(() => {
			this.execute(commandName, args);
		}, 10);
	}

	isEnabled(commandName:string, props:any):boolean {
		const command = this.commandByName(commandName);
		if (!command || !command.runtime) return false;
		// if (!command.runtime.props) return false;
		return command.runtime.isEnabled(props);
	}

	commandMapStateToProps(commandName:string, state:any):any {
		const command = this.commandByName(commandName);
		if (!command.runtime) return null;
		if (!command.runtime.mapStateToProps) return {};
		return command.runtime.mapStateToProps(state);
	}

	title(commandName:string, props:any):string {
		const command = this.commandByName(commandName);
		if (!command || !command.runtime) return null;
		return command.runtime.title(props);
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

	public commandsToMarkdownTable(state:any):string {
		const headers:MarkdownTableHeader[] = [
			{
				name: 'commandName',
				label: 'Name',
			},
			{
				name: 'description',
				label: 'Description',
			},
			{
				name: 'props',
				label: 'Props',
			},
		];

		const rows:MarkdownTableRow[] = [];

		for (const commandName in this.commands_) {
			const props = this.commandMapStateToProps(commandName, state);

			const row:MarkdownTableRow = {
				commandName: commandName,
				description: this.label(commandName),
				props: JSON.stringify(props),
			};

			rows.push(row);
		}

		return markdownUtils.createMarkdownTable(headers, rows);
	}

}
