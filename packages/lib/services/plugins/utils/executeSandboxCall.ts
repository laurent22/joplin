import Global from '../api/Global';

type EventHandler = (callbackId: string, args: unknown[])=> unknown;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Recursive walker over heterogeneous plugin sandbox arguments; tightening to `unknown` forces narrowing at every branch and recursive call
function createEventHandlers(arg: any, eventHandler: EventHandler) {
	if (Array.isArray(arg)) {
		for (let i = 0; i < arg.length; i++) {
			arg[i] = createEventHandlers(arg[i], eventHandler);
		}
		return arg;
	} else if (typeof arg === 'string' && arg.indexOf('___plugin_event_') === 0) {
		const callbackId = arg;
		return async (...args: unknown[]) => {
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

export default async function executeSandboxCall(pluginId: string, sandbox: Global, path: string, args: unknown[], eventHandler: EventHandler) {
	const pathFragments = path.split('.');

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Walks the sandbox object tree by dotted path; intermediate nodes can be any sandbox sub-API
	let parent: any = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- See parent above
	let fn: any = sandbox;

	if (!fn) throw new Error(`No sandbox for plugin ${pluginId}`); // Sanity check as normally cannot happen

	for (const pathFragment of pathFragments) {
		parent = fn;
		fn = fn[pathFragment];
		if (!fn) throw new Error(`Property or method "${pathFragment}" does not exist in "${path}"`);
	}

	const convertedArgs = createEventHandlers(args, eventHandler);

	return fn.apply(parent, convertedArgs);
}
