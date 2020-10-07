import { EditorCommand } from 'lib/services/plugins/api/types';

interface JoplinWorkspace {
	execEditorCommand(command:EditorCommand):Promise<string>
}

interface Joplin {
	workspace: JoplinWorkspace;
}

interface Components {
	[key:string]: any,
}

export default class PlatformImplementation {

	private static instance_:PlatformImplementation;
	private joplin_:Joplin;
	private components_:Components;

	public static instance():PlatformImplementation {
		if (!this.instance_) this.instance_ = new PlatformImplementation();
		return this.instance_;
	}

	constructor() {
		this.components_ = {};

		this.joplin_ = {
			workspace: {
				execEditorCommand: async (command:EditorCommand) => {
					if (this.components_.textEditor) {
						return this.components_.textEditor.current.execCommand(command);
					} else {
						return '';
					}
				},
			},
		};
	}

	registerComponent(name:string, component:any) {
		this.components_[name] = component;
	}

	unregisterComponent(name:string) {
		delete this.components_[name];
	}

	public get joplin():Joplin {
		return this.joplin_;
	}

}
