const { Logger } = require('lib/logger.js');

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
				props: this.dialogProps_(name),
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
			const menuItems = this.plugins_[name].Class.manifest.menuItems;
			if (!menuItems) continue;

			for (const item of menuItems) {
				item.click = () => {
					this.onPluginMenuItemTrigger_({
						pluginName: name,
						itemName: item.name,
					});
				};

				if (item.accelerator instanceof Function) {
					item.accelerator = item.accelerator();
				}
			}

			output = output.concat(menuItems);
		}

		return output;
	}
}

module.exports = PluginManager;
