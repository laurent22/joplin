const Logger = require('../Logger').default;

class PluginManager {
	constructor() {
		this.plugins_ = {};
		this.logger_ = new Logger();
	}

	setLogger(l) {
		this.logger_ = l;
	}

	logger() {
		return this.logger_;
	}

	static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new PluginManager();
		return this.instance_;
	}

	register(classes) {
		if (!Array.isArray(classes)) classes = [classes];

		for (let i = 0; i < classes.length; i++) {
			const PluginClass = classes[i];

			if (this.plugins_[PluginClass.manifest.name]) throw new Error(`Already registered: ${PluginClass.manifest.name}`);

			this.plugins_[PluginClass.manifest.name] = {
				Class: PluginClass,
				instance: null,
			};
		}
	}

	pluginInstance_(name) {
		const p = this.plugins_[name];
		if (p.instance) return p.instance;
		p.instance = new p.Class();
		p.instance.dispatch = action => this.dispatch_(action);
		return p.instance;
	}

	pluginClass_(name) {
		return this.plugins_[name].Class;
	}

	onPluginMenuItemTrigger_(event) {
		const p = this.pluginInstance_(event.pluginName);
		p.onTrigger({
			itemName: event.itemName,
			userData: event.userData,
		});
	}

	pluginDialogToShow(pluginStates) {
		for (const name in pluginStates) {
			const p = pluginStates[name];
			if (!p.dialogOpen) continue;

			const Class = this.pluginClass_(name);
			if (!Class.Dialog) continue;

			return {
				Dialog: Class.Dialog,
				props: Object.assign({}, this.dialogProps_(name), { userData: p.userData }),
			};
		}

		return null;
	}

	dialogProps_(name) {
		return {
			dispatch: action => this.dispatch_(action),
			plugin: this.pluginInstance_(name),
		};
	}

	menuItems() {
		let output = [];
		for (const name in this.plugins_) {
			const menuItems = this.plugins_[name].Class.manifest.menuItems.slice();
			if (!menuItems) continue;

			for (let i = 0; i < menuItems.length; i++) {
				const item = Object.assign({}, menuItems[i]);

				item.click = () => {
					this.onPluginMenuItemTrigger_({
						pluginName: name,
						itemName: item.name,
						userData: item.userData,
					});
				};

				if (menuItems[i].accelerator) item.accelerator = menuItems[i].accelerator();

				menuItems[i] = item;
			}

			output = output.concat(menuItems);
		}

		return output;
	}
}

module.exports = PluginManager;
