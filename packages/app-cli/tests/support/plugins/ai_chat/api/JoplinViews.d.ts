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
    private store;
    private plugin;
    private panels_;
    private menuItems_;
    private menus_;
    private toolbarButtons_;
    private dialogs_;
    private editors_;
    private noteList_;
    private implementation_;
    constructor(implementation: any, plugin: Plugin, store: any);
    get dialogs(): JoplinViewsDialogs;
    get panels(): JoplinViewsPanels;
    get editors(): JoplinViewsEditors;
    get menuItems(): JoplinViewsMenuItems;
    get menus(): JoplinViewsMenus;
    get toolbarButtons(): JoplinViewsToolbarButtons;
    get noteList(): JoplinViewsNoteList;
}
