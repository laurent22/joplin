import Logger from '@joplin/utils/Logger';

// As declared in a plugin class's static `manifest`.
export interface PluginMenuItemDeclaration {
	id: string;
	name?: string;
	parent?: string;
	label?: string;
	accelerator?: ()=> string;
	screens?: string[];
	userData?: unknown;
}

// As returned by `menuItems()` — click is set, accelerator is resolved to a string.
export interface PluginMenuItem {
	id: string;
	name?: string;
	parent?: string;
	label?: string;
	accelerator?: string;
	screens?: string[];
	userData?: unknown;
	click: ()=> void;
}

export interface PluginManifest {
	name: string;
	menuItems: PluginMenuItemDeclaration[];
}

export interface PluginInstance {
	dispatch: (action: unknown)=> void;
	onTrigger(event: { itemName?: string; userData: unknown }): void;
}

// Dialog is a React.ComponentType but typing it as such would pull React into lib/.
// Callers cast back at the render site.
export interface PluginClass {
	new (): PluginInstance;
	manifest: PluginManifest;
	Dialog?: unknown;
}

interface PluginState {
	dialogOpen?: boolean;
	userData?: unknown;
}

interface RegisteredPlugin {
	Class: PluginClass;
	instance: PluginInstance | null;
}

interface MenuItemTriggerEvent {
	pluginName: string;
	itemName?: string;
	userData: unknown;
}

export default class PluginManager {
	private plugins_: Record<string, RegisteredPlugin> = {};
	private logger_: Logger = new Logger();
	private static instance_: PluginManager | null = null;

	// eslint-disable-next-line @typescript-eslint/ban-types -- legacy callers assign arbitrary dispatch functions
	public dispatch_: Function;

	public setLogger(l: Logger) {
		this.logger_ = l;
	}

	public logger() {
		return this.logger_;
	}

	public static instance() {
		if (PluginManager.instance_) return PluginManager.instance_;
		PluginManager.instance_ = new PluginManager();
		return PluginManager.instance_;
	}

	public register(classes: PluginClass | PluginClass[]) {
		const classList = Array.isArray(classes) ? classes : [classes];

		for (let i = 0; i < classList.length; i++) {
			const PluginClass = classList[i];

			if (this.plugins_[PluginClass.manifest.name]) throw new Error(`Already registered: ${PluginClass.manifest.name}`);

			this.plugins_[PluginClass.manifest.name] = {
				Class: PluginClass,
				instance: null,
			};
		}
	}

	public pluginInstance_(name: string) {
		const p = this.plugins_[name];
		if (p.instance) return p.instance;
		p.instance = new p.Class();
		p.instance.dispatch = action => this.dispatch_(action);
		return p.instance;
	}

	public pluginClass_(name: string) {
		return this.plugins_[name].Class;
	}

	public onPluginMenuItemTrigger_(event: MenuItemTriggerEvent) {
		const p = this.pluginInstance_(event.pluginName);
		p.onTrigger({
			itemName: event.itemName,
			userData: event.userData,
		});
	}

	public pluginDialogToShow(pluginStates: Record<string, PluginState>) {
		for (const name in pluginStates) {
			const p = pluginStates[name];
			if (!p.dialogOpen) continue;

			const Class = this.pluginClass_(name);
			if (!Class.Dialog) continue;

			return {
				Dialog: Class.Dialog,
				props: { ...this.dialogProps_(name), userData: p.userData },
			};
		}

		return null;
	}

	public dialogProps_(name: string) {
		return {
			dispatch: (action: unknown) => this.dispatch_(action),
			plugin: this.pluginInstance_(name),
		};
	}

	public menuItems(): PluginMenuItem[] {
		const output: PluginMenuItem[] = [];
		for (const name in this.plugins_) {
			const declarations = this.plugins_[name].Class.manifest.menuItems;
			if (!declarations) continue;

			for (const declaration of declarations) {
				const item: PluginMenuItem = {
					...declaration,
					accelerator: typeof declaration.accelerator === 'function' ? declaration.accelerator() : undefined,
					click: () => {
						this.onPluginMenuItemTrigger_({
							pluginName: name,
							itemName: item.name,
							userData: item.userData,
						});
					},
				};
				output.push(item);
			}
		}

		return output;
	}
}
