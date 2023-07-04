/* eslint-disable multiline-comment-style */

import Plugin from '../Plugin';
import JoplinViewsDialogs from './JoplinViewsDialogs';
import JoplinViewsMenuItems from './JoplinViewsMenuItems';
import JoplinViewsMenus from './JoplinViewsMenus';
import JoplinViewsToolbarButtons from './JoplinViewsToolbarButtons';
import JoplinViewsPanels from './JoplinViewsPanels';

/**
 * This namespace provides access to view-related services.
 *
 * All view services provide a `create()` method which you would use to create the view object, whether it's a dialog, a toolbar button or a menu item.
 * In some cases, the `create()` method will return a [[ViewHandle]], which you would use to act on the view, for example to set certain properties or call some methods.
 */
export default class JoplinViews {

	private store: any;
	private plugin: Plugin;

	private dialogs_: JoplinViewsDialogs = null;
	private panels_: JoplinViewsPanels = null;
	private menuItems_: JoplinViewsMenuItems = null;
	private menus_: JoplinViewsMenus = null;
	private toolbarButtons_: JoplinViewsToolbarButtons = null;
	private implementation_: any = null;

	public constructor(implementation: any, plugin: Plugin, store: any) {
		this.store = store;
		this.plugin = plugin;
		this.implementation_ = implementation;
	}

	public get dialogs(): JoplinViewsDialogs {
		if (!this.dialogs_) this.dialogs_ = new JoplinViewsDialogs(this.implementation_.dialogs, this.plugin, this.store);
		return this.dialogs_;
	}

	public get panels(): JoplinViewsPanels {
		if (!this.panels_) this.panels_ = new JoplinViewsPanels(this.plugin, this.store);
		return this.panels_;
	}

	public get menuItems(): JoplinViewsMenuItems {
		if (!this.menuItems_) this.menuItems_ = new JoplinViewsMenuItems(this.plugin, this.store);
		return this.menuItems_;
	}

	public get menus(): JoplinViewsMenus {
		if (!this.menus_) this.menus_ = new JoplinViewsMenus(this.plugin, this.store);
		return this.menus_;
	}

	public get toolbarButtons(): JoplinViewsToolbarButtons {
		if (!this.toolbarButtons_) this.toolbarButtons_ = new JoplinViewsToolbarButtons(this.plugin, this.store);
		return this.toolbarButtons_;
	}

}
