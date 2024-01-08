import { CallbackArguments, SerializableData, SerializableDataAndCallbacks } from '../types';

type CallMethodWithIdCallback = (id: string, args: SerializableData[])=> void;

const mergeCallbacksAndArgs = (
	serializableArgs: SerializableData[], callbackArgs: CallbackArguments[], callMethodWithId: CallMethodWithIdCallback,
): SerializableDataAndCallbacks[] => {
	const mergeCallbackAndSerializableArrays = (serializableObj: SerializableData[], callbackObj: CallbackArguments[]) => {
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
	};

	const mergeCallbackAndSerializable = (serializableObj: SerializableData, callbackObj: CallbackArguments): SerializableDataAndCallbacks => {
		if (typeof callbackObj === 'string') {
			const callbackId = callbackObj;

			return (...args: SerializableData[]) => {
				return callMethodWithId(callbackId, args);
			};
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

				return mergeCallbackAndSerializableArrays(serializableObj, callbackObj);
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

	return mergeCallbackAndSerializableArrays(serializableArgs, callbackArgs);
};

export default mergeCallbacksAndArgs;
