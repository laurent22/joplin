import { CallbackIds, SerializableData, SerializableDataAndCallbacks } from '../types';
import isTransferableObject from './isTransferableObject';

type CallMethodWithIdCallback = (id: string, args: SerializableDataAndCallbacks[])=> Promise<SerializableDataAndCallbacks>;

// Intended to be used to track callbacks for garbage collection
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
type OnAfterCallbackCreated = (callbackId: string, callbackRef: ()=> any)=> void;

// Below, we use TypeScript syntax to specify the return type of mergeCallbacksAndSerializable
// based on the type of its arguments.
//
// As such, we use function ...() { ... } notation. ESLint's no-redeclare also needs to be disabled
// to use this syntax.
//
// eslint-disable-next-line no-redeclare
function mergeCallbacksAndSerializable(
	serializable: SerializableData[],
	callbacks: CallbackIds[],
	callMethodWithId: CallMethodWithIdCallback,
	afterCallbackCreated: OnAfterCallbackCreated,
): SerializableDataAndCallbacks[];

// eslint-disable-next-line no-redeclare
function mergeCallbacksAndSerializable(
	serializable: SerializableData,
	callbacks: CallbackIds,
	callMethodWithId: CallMethodWithIdCallback,
	afterCallbackCreated: OnAfterCallbackCreated,
): SerializableDataAndCallbacks;

// eslint-disable-next-line no-redeclare
function mergeCallbacksAndSerializable(
	serializable: SerializableData|SerializableData[],
	callbacks: CallbackIds|CallbackIds[],
	callMethodWithId: CallMethodWithIdCallback,
	afterCallbackCreated: OnAfterCallbackCreated,
): SerializableDataAndCallbacks|SerializableDataAndCallbacks[] {
	const mergeCallbackAndSerializable = (serializableObj: SerializableData, callbackObj: CallbackIds): SerializableDataAndCallbacks => {
		if (typeof callbackObj === 'string') {
			const callbackId = callbackObj;

			const callback = (...args: SerializableDataAndCallbacks[]) => {
				return callMethodWithId(callbackId, args);
			};
			afterCallbackCreated(callbackId, callback);

			return callback;
		} else if (typeof serializableObj === 'object' && serializableObj !== null) { // typeof(null) is object
			if (typeof callbackObj !== 'object') {
				throw new Error('Callback arguments should be an object (and thus match the type of serializableArgs)');
			}

			if (Array.isArray(serializableObj)) {
				if (!Array.isArray(callbackObj)) {
					throw new Error(
						`Callbacks not separated correctly (mismatched structure). ${callbackObj} should be an array`,
					);
				}

				if (callbackObj.length !== serializableObj.length) {
					throw new Error(
						`Callbacks not separated correctly (mismatched array length, ${callbackObj.length} != ${serializableObj.length})`,
					);
				}

				const result: SerializableDataAndCallbacks[] = [];
				for (let i = 0; i < serializableObj.length; i++) {
					result.push(mergeCallbackAndSerializable(serializableObj[i], callbackObj[i]));
				}
				return result;
			} else if (isTransferableObject(serializableObj)) {
				return serializableObj;
			} else {
				if (Array.isArray(callbackObj)) {
					throw new Error('callbackArgs should not be an array');
				}

				const result = Object.create(null);

				for (const key in serializableObj) {
					result[key] = mergeCallbackAndSerializable(serializableObj[key], callbackObj[key]);
				}

				return result;
			}
		} else {
			return serializableObj;
		}
	};

	return mergeCallbackAndSerializable(serializable, callbacks);
}

export default mergeCallbacksAndSerializable;
