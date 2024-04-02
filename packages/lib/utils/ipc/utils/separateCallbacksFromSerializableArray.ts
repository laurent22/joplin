import { CallbackIds, SerializableData, SerializableDataAndCallbacks, TransferableCallback } from '../types';
import separateCallbacksFromSerializable from './separateCallbacksFromSerializable';


interface SeparatedCallbacksAndSerializableArrays {
	serializableData: SerializableData[];
	callbacks: CallbackIds[];
	idToCallbacks: Record<string, TransferableCallback>;
}

const separateCallbacksFromSerializableArray = (args: SerializableDataAndCallbacks[]): SeparatedCallbacksAndSerializableArrays => {
	const separatedArgs = separateCallbacksFromSerializable(args);
	return {
		idToCallbacks: separatedArgs.idToCallbacks,

		// Because separateCallbacksFromSerializable is processing an array, it returns arrays.
		callbacks: separatedArgs.callbacks as CallbackIds[],
		serializableData: separatedArgs.serializableData as SerializableData[],
	};
};

export default separateCallbacksFromSerializableArray;
