import ViewController from './ViewController';

export enum MenuItemLocation {
	File = 'file',
	Edit = 'edit',
	View = 'view',
	Note = 'note',
	Tools = 'tools',
	Help = 'help',
}

export default class MenuItemController extends ViewController {

	constructor(id:string, pluginId:string, store:any, commandName:string, location:MenuItemLocation) {
		super(id, pluginId, store);

		this.store.dispatch({
			type: 'PLUGIN_VIEW_ADD',
			pluginId: pluginId,
			view: {
				id: this.id,
				type: this.type,
				commandName: commandName,
				location: location,
			},
		});
	}

	public get type():string {
		return 'menuItem';
	}

}
