import Sandbox from '../Sandbox/Sandbox';

type EventHandler = (callbackId:string, args:any[]) => void;

function createEventHandlers(arg:any, eventHandler:EventHandler) {
	if (Array.isArray(arg)) {
		for (let i = 0; i < arg.length; i++) {
			arg[i] = createEventHandlers(arg[i], eventHandler);
		}
		return arg;
	} else if (typeof arg === 'string' && arg.indexOf('__event#') === 0) {
		const callbackId = arg;
		return async (...args:any[]) => {
			const result = await eventHandler(callbackId, args);
			return result;
		};
	} else if (arg === null || arg === undefined) {
		return arg;
	} else if (typeof arg === 'object') {
		for (const n in arg) {
			arg[n] = createEventHandlers(arg[n], eventHandler);
		}
	}

	return arg;
}

export default async function executeSandboxCall(pluginId:string, sandbox:Sandbox, path:string, args:any[], eventHandler:EventHandler) {
	const pathFragments = path.split('.');

	let parent:any = null;
	let fn:any = sandbox;

	if (!fn) throw new Error(`No sandbox for plugin ${pluginId}`); // Sanity check as normally cannot happen

	for (const pathFragment of pathFragments) {
		parent = fn;
		fn = fn[pathFragment];
	}

	const convertedArgs = createEventHandlers(args, eventHandler);

	return fn.apply(parent, convertedArgs);
}
