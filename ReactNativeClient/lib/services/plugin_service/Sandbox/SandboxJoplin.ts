import { SandboxContext } from '../utils/types';
import Plugin from '../Plugin';
import SandboxJoplinApi from './SandboxJoplinApi';
import SandboxJoplinPlugins from './SandboxJoplinPlugins';
import SandboxJoplinWorkspaces from './SandboxJoplinWorkspaces';
import SandboxJoplinFilters from './SandboxJoplinFilters';
import SandboxJoplinCommands from './SandboxJoplinCommands';
import SandboxJoplinViews from './SandboxJoplinViews';
import SandboxJoplinUtils from './SandboxJoplinUtils';

export default class SandboxJoplin {

	private api_: SandboxJoplinApi = null;
	private plugins_: SandboxJoplinPlugins = null;
	private workspaces_: SandboxJoplinWorkspaces = null;
	private filters_: SandboxJoplinFilters = null;
	private commands_: SandboxJoplinCommands = null;
	private views_: SandboxJoplinViews = null;
	private utils_: SandboxJoplinUtils = null;

	constructor(plugin: Plugin, store: any, context: SandboxContext) {
		this.api_ = new SandboxJoplinApi();
		this.plugins_ = new SandboxJoplinPlugins(context);
		this.workspaces_ = new SandboxJoplinWorkspaces(store);
		this.filters_ = new SandboxJoplinFilters();
		this.commands_ = new SandboxJoplinCommands();
		this.views_ = new SandboxJoplinViews(plugin, store);
		this.utils_ = new SandboxJoplinUtils();
	}

	get api(): SandboxJoplinApi {
		return this.api_;
	}

	get plugins(): SandboxJoplinPlugins {
		return this.plugins_;
	}

	get workspace(): SandboxJoplinWorkspaces {
		return this.workspaces_;
	}

	get filters(): SandboxJoplinFilters {
		return this.filters_;
	}

	get commands(): SandboxJoplinCommands {
		return this.commands_;
	}

	get views(): SandboxJoplinViews {
		return this.views_;
	}

	get utils(): SandboxJoplinUtils {
		return this.utils_;
	}
}
