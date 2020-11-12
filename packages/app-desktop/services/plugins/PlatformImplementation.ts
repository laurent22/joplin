// import { EditorCommand } from '@joplin/lib/services/plugins/api/types';

import bridge from '../bridge';

// interface JoplinWorkspace {
// 	execEditorCommand(command:EditorCommand):Promise<string>
// }

interface JoplinViewsDialogs {
	showMessageBox(message: string): Promise<number>;
}

interface JoplinViews {
	dialogs: JoplinViewsDialogs
}

interface Joplin {
	// workspace: JoplinWorkspace;
	views: JoplinViews;
}

interface Components {
	[key: string]: any,
}

export default class PlatformImplementation {

	private static instance_: PlatformImplementation;
	private joplin_: Joplin;
	private components_: Components;

	public static instance(): PlatformImplementation {
		if (!this.instance_) this.instance_ = new PlatformImplementation();
		return this.instance_;
	}

	constructor() {
		this.components_ = {};

		this.joplin_ = {
			views: {
				dialogs: {
					showMessageBox: async function(message: string) {
						return bridge().showMessageBox(message);
					},
				},
			},
		};
	}

	registerComponent(name: string, component: any) {
		this.components_[name] = component;
	}

	unregisterComponent(name: string) {
		delete this.components_[name];
	}

	public get joplin(): Joplin {
		return this.joplin_;
	}

}
