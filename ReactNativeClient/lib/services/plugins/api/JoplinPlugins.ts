import { SandboxContext } from '../utils/types';
export default class JoplinPlugins {

	private context: SandboxContext;

	constructor(context: SandboxContext) {
		this.context = context;
	}

	register(script: any) {
		this.context.runtime = script;
	}
}
