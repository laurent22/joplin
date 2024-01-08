import { CallbackArguments, SerializableData, SerializableDataAndCallbacks, TransferableCallback } from '../types';

interface SeparatedCallbacksAndArgs {
	argsWithoutCallbacks: SerializableData[];

	// Example:
	// {
	//	path: { to: { a: { fn: 'id-here' } } }
	// }
	callbackArgs: CallbackArguments[];

	// Maps callback IDs (which are generated here) to the callbacks themselves.
	idToCallbacks: Record<string, TransferableCallback>;
}

// We can only transfer serializable data, but we also want to transfer functions.
// This function allows us to transfer functions by pulling them out of `args` and giving them IDs.
const separateCallbacksFromArgs = (args: SerializableDataAndCallbacks[]): SeparatedCallbacksAndArgs => {
	const idToCallbacks = Object.create(null);

	const makeCallbackId = (functionPath: string[]) => {
		return `${Math.random()}-${functionPath.join('.')}`;
	};

	type ProcessObjectResult = {
		argsWithoutCallbacks: SerializableData;
		callbackArgs: CallbackArguments;
	};

	const processObject = (object: SerializableDataAndCallbacks, path: string[]): ProcessObjectResult => {
		// typeof null === 'object', so we handle it separately
		if (object === null) {
			return { argsWithoutCallbacks: null, callbackArgs: undefined };
		} else if (typeof object === 'object') {
			if (Array.isArray(object)) {
				return processArray(object, path);
			} else {
				const argsWithoutCallbacks = Object.create(null);
				const callbackArgs = Object.create(null);

				for (const key in object) {
					const processed = processObject(object[key], [...path, key]);
					argsWithoutCallbacks[key] = processed.argsWithoutCallbacks;
					callbackArgs[key] = processed.callbackArgs;
				}

				return { argsWithoutCallbacks, callbackArgs };
			}
		} else if (typeof object === 'function') {
			const callbackId = makeCallbackId(path);
			idToCallbacks[callbackId] = object;
			return { argsWithoutCallbacks: null, callbackArgs: callbackId };
		} else {
			return { argsWithoutCallbacks: object, callbackArgs: undefined };
		}
	};


	type ProcessArrayResult = {
		argsWithoutCallbacks: SerializableData[];
		callbackArgs: CallbackArguments[];
	};

	const processArray = (array: SerializableDataAndCallbacks[], path: string[]): ProcessArrayResult => {
		const argsWithoutCallbacks = [];
		const callbackArgs = [];

		for (let i = 0; i < array.length; i++) {
			const processed = processObject(array[i], [...path, `${i}`]);
			argsWithoutCallbacks.push(processed.argsWithoutCallbacks);
			callbackArgs.push(processed.callbackArgs);
		}

		return { argsWithoutCallbacks, callbackArgs };
	};

	const processedArgs = processArray(args, []);

	return {
		...processedArgs,
		idToCallbacks,
	};
};

export default separateCallbacksFromArgs;
