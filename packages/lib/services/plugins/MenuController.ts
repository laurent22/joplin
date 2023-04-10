import { MenuItem, MenuItemLocation } from './api/types';
import ViewController from './ViewController';

export default class MenuController extends ViewController {

	public constructor(id: string, pluginId: string, store: any, label: string, menuItems: MenuItem[], location: MenuItemLocation) {
		super(id, pluginId, store);

		this.store.dispatch({
			type: 'PLUGIN_VIEW_ADD',
			pluginId: pluginId,
			view: {
				id: this.handle,
				type: this.type,
				label: label,
				menuItems: menuItems,
				location: location,
			},
		});
	}

	public get type(): string {
		return 'menu';
	}

}
