import Plugin from '../Plugin';
import JoplinViewsDialogs from './JoplinViewsDialogs';
import JoplinViewsMenuItems from './JoplinViewsMenuItems';
import JoplinViewsToolbarButtons from './JoplinViewsToolbarButtons';
import JoplinViewsPanels from './JoplinViewsPanels';
export default class JoplinViews {
    private store;
    private plugin;
    private dialogs_;
    private panels_;
    private menuItems_;
    private toolbarButtons_;
    constructor(plugin: Plugin, store: any);
    get dialogs(): JoplinViewsDialogs;
    get panels(): JoplinViewsPanels;
    get menuItems(): JoplinViewsMenuItems;
    get toolbarButtons(): JoplinViewsToolbarButtons;
}
