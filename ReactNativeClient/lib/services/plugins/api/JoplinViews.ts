import Plugin from '../Plugin';
import JoplinViewsDialogs from './JoplinViewsDialogs';
import JoplinViewsMenuItems from './JoplinViewsMenuItems';
import JoplinViewsToolbarButtons from './JoplinViewsToolbarButtons';
import JoplinViewsPanels from './JoplinViewsPanels';

export default class JoplinViews {

	private store: any;
	private plugin: Plugin;

	private dialogs_:JoplinViewsDialogs = null;
	private panels_:JoplinViewsPanels = null;
	private menuItems_:JoplinViewsMenuItems = null;
	private toolbarButtons_:JoplinViewsToolbarButtons = null;

	constructor(plugin: Plugin, store: any) {
		this.store = store;
		this.plugin = plugin;
	}

	public get dialogs():JoplinViewsDialogs {
		if (!this.dialogs_) this.dialogs_ = new JoplinViewsDialogs(this.plugin, this.store);
		return this.dialogs_;
	}

	public get panels():JoplinViewsPanels {
		if (!this.panels_) this.panels_ = new JoplinViewsPanels(this.plugin, this.store);
		return this.panels_;
	}

	public get menuItems():JoplinViewsMenuItems {
		if (!this.menuItems_) this.menuItems_ = new JoplinViewsMenuItems(this.plugin, this.store);
		return this.menuItems_;
	}

	public get toolbarButtons():JoplinViewsToolbarButtons {
		if (!this.toolbarButtons_) this.toolbarButtons_ = new JoplinViewsToolbarButtons(this.plugin, this.store);
		return this.toolbarButtons_;
	}

}
