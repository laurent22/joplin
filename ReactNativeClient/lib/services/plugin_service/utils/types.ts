export enum PluginPermission {
	Model = 'model',
}

export interface PluginManifest {
	manifest_version: number,
	name: string,
	version: string,
	description?: string,
	homepage_url?: string,
	permissions?: PluginPermission[],
}

export interface Plugin {
	id: string,
	manifest: PluginManifest,
	scriptText: string,
	baseDir: string,
	controls: any, // TODO: don't use any
}

export interface SandboxContextRuntime {
	onStart(event:any):void;
	onMessage(event:any):void;
}

export interface SandboxContext {
	runtime:SandboxContextRuntime;
}
