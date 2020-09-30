import { EditorCommand } from 'lib/services/plugins/Sandbox/SandboxJoplinWorkspace';

interface SandboxWorkspace {
	execEditorCommand(command:EditorCommand):Promise<string>
}

interface SandboxJoplin {
	workspace: SandboxWorkspace;
}

interface Components {
	[key:string]: any,
}

export default class SandboxImplementation {

	private static instance_:SandboxImplementation;
	private joplin_:SandboxJoplin;
	private components_:Components;

	public static instance():SandboxImplementation {
		if (!this.instance_) this.instance_ = new SandboxImplementation();
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

	public get joplin():SandboxJoplin {
		return this.joplin_;
	}

}
