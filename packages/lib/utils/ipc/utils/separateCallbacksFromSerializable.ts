import { CallbackIds, SerializableData, SerializableDataAndCallbacks, TransferableCallback } from '../types';
import isTransferableObject from './isTransferableObject';

interface SeparatedCallbacksAndSerializable {
	serializableData: SerializableData;

	// Example:
	// {
	//	path: { to: { a: { fn: 'id-here' } } }
	// }
	callbacks: CallbackIds;

	// Maps callback IDs (which are generated here) to the callbacks themselves.
	idToCallbacks: Record<string, TransferableCallback>;
}

// We can only transfer serializable data, but we also want to transfer functions.
// This function allows us to transfer functions by pulling them out of `data` and giving them IDs.
const separateCallbacksFromSerializable = (data: SerializableDataAndCallbacks): SeparatedCallbacksAndSerializable => {
	const idToCallbacks = Object.create(null);

	const makeCallbackId = (functionPath: string[]) => {
		return `${Math.random()}-${functionPath.join('.')}`;
	};

	type ProcessObjectResult = {
		serializableData: SerializableData;
		callbacks: CallbackIds;
	};

	const processObject = (object: SerializableDataAndCallbacks, path: string[]): ProcessObjectResult => {
		// typeof null === 'object', so we handle it separately
		if (object === null) {
			return { serializableData: null, callbacks: undefined };
		} else if (typeof object === 'object') {
			if (Array.isArray(object)) {
				const serializableData = [];
				const callbacks = [];

				for (let i = 0; i < object.length; i++) {
					const processed = processObject(object[i], [...path, `${i}`]);
					serializableData.push(processed.serializableData);
					callbacks.push(processed.callbacks);
				}

				return { serializableData, callbacks };
			} else if (isTransferableObject(object)) {
				return { serializableData: object, callbacks: [] };
			} else {
				const argsWithoutCallbacks = Object.create(null);
				const callbackArgs = Object.create(null);

				for (const key in object) {
					const processed = processObject(object[key], [...path, key]);
					argsWithoutCallbacks[key] = processed.serializableData;
					callbackArgs[key] = processed.callbacks;
				}

				return { serializableData: argsWithoutCallbacks, callbacks: callbackArgs };
			}
		} else if (typeof object === 'function') {
			const callbackId = makeCallbackId(path);
			idToCallbacks[callbackId] = object;
			return { serializableData: null, callbacks: callbackId };
		} else {
			return { serializableData: object, callbacks: undefined };
		}
	};

	return {
		...processObject(data, []),
		idToCallbacks,
	};
};

export default separateCallbacksFromSerializable;
