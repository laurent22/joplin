import { ToolbarButtonLocation } from './api/types';
import ViewController from './ViewController';

export default class ToolbarButtonController extends ViewController {

	public constructor(id: string, pluginId: string, store: any, commandName: string, location: ToolbarButtonLocation) {
		super(id, pluginId, store);

		this.store.dispatch({
			type: 'PLUGIN_VIEW_ADD',
			pluginId: pluginId,
			view: {
				id: this.handle,
				type: this.type,
				commandName: commandName,
				location: location,
			},
		});
	}

	public get type(): string {
		return 'toolbarButton';
	}

}
