/* eslint-disable multiline-comment-style */

import Plugin from '../Plugin';
import JoplinViewsDialogs from './JoplinViewsDialogs';
import JoplinViewsMenuItems from './JoplinViewsMenuItems';
import JoplinViewsMenus from './JoplinViewsMenus';
import JoplinViewsToolbarButtons from './JoplinViewsToolbarButtons';
import JoplinViewsPanels from './JoplinViewsPanels';
import JoplinViewsNoteList from './JoplinViewsNoteList';
import JoplinViewsEditors from './JoplinViewsEditor';

/**
 * This namespace provides access to view-related services.
 *
 * All view services provide a `create()` method which you would use to create the view object, whether it's a dialog, a toolbar button or a menu item.
 * In some cases, the `create()` method will return a [[ViewHandle]], which you would use to act on the view, for example to set certain properties or call some methods.
 */
export default class JoplinViews {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private store: any;
	private plugin: Plugin;

	private panels_: JoplinViewsPanels = null;
	private menuItems_: JoplinViewsMenuItems = null;
	private menus_: JoplinViewsMenus = null;
	private toolbarButtons_: JoplinViewsToolbarButtons = null;
	private dialogs_: JoplinViewsDialogs = null;
	private editors_: JoplinViewsEditors = null;
	private noteList_: JoplinViewsNoteList = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private implementation_: any = null;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public constructor(implementation: any, plugin: Plugin, store: any) {
		this.store = store;
		this.plugin = plugin;
		this.implementation_ = implementation;
	}

	public get dialogs() {
		if (!this.dialogs_) this.dialogs_ = new JoplinViewsDialogs(this.implementation_.dialogs, this.plugin, this.store);
		return this.dialogs_;
	}

	public get panels() {
		if (!this.panels_) this.panels_ = new JoplinViewsPanels(this.plugin, this.store);
		return this.panels_;
	}

	public get editors() {
		if (!this.editors_) this.editors_ = new JoplinViewsEditors(this.plugin, this.store);
		return this.editors_;
	}

	public get menuItems() {
		if (!this.menuItems_) this.menuItems_ = new JoplinViewsMenuItems(this.plugin, this.store);
		return this.menuItems_;
	}

	public get menus() {
		if (!this.menus_) this.menus_ = new JoplinViewsMenus(this.plugin, this.store);
		return this.menus_;
	}

	public get toolbarButtons() {
		if (!this.toolbarButtons_) this.toolbarButtons_ = new JoplinViewsToolbarButtons(this.plugin, this.store);
		return this.toolbarButtons_;
	}

	public get noteList() {
		if (!this.noteList_) this.noteList_ = new JoplinViewsNoteList(this.plugin, this.store);
		return this.noteList_;
	}

}
