import Plugin from '../Plugin';
import JoplinData from './JoplinData';
import JoplinPlugins from './JoplinPlugins';
import JoplinWorkspace from './JoplinWorkspace';
import JoplinFilters from './JoplinFilters';
import JoplinCommands from './JoplinCommands';
import JoplinViews from './JoplinViews';
import JoplinInterop from './JoplinInterop';
import JoplinSettings from './JoplinSettings';
import Logger from '../../../Logger';

/**
 * This is the main entry point to the Joplin API. You can access various services using the provided accessors.
 */
export default class Joplin {

	private data_: JoplinData = null;
	private plugins_: JoplinPlugins = null;
	private workspace_: JoplinWorkspace = null;
	private filters_: JoplinFilters = null;
	private commands_: JoplinCommands = null;
	private views_: JoplinViews = null;
	private interop_: JoplinInterop = null;
	private settings_: JoplinSettings = null;

	constructor(logger: Logger, implementation: any, plugin: Plugin, store: any) {
		this.data_ = new JoplinData();
		this.plugins_ = new JoplinPlugins(logger, plugin);
		this.workspace_ = new JoplinWorkspace(implementation.workspace, store);
		this.filters_ = new JoplinFilters();
		this.commands_ = new JoplinCommands();
		this.views_ = new JoplinViews(implementation.views, plugin, store);
		this.interop_ = new JoplinInterop();
		this.settings_ = new JoplinSettings(plugin);
	}

	get data(): JoplinData {
		return this.data_;
	}

	get plugins(): JoplinPlugins {
		return this.plugins_;
	}

	get workspace(): JoplinWorkspace {
		return this.workspace_;
	}

	/**
	 * @ignore
	 *
	 * Not sure if it's the best way to hook into the app
	 * so for now disable filters.
	 */
	get filters(): JoplinFilters {
		return this.filters_;
	}

	get commands(): JoplinCommands {
		return this.commands_;
	}

	get views(): JoplinViews {
		return this.views_;
	}

	get interop(): JoplinInterop {
		return this.interop_;
	}

	get settings(): JoplinSettings {
		return this.settings_;
	}
}
