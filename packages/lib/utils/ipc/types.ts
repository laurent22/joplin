
export type TransferableObject = ArrayBuffer|Blob|FileSystemHandle;

// Data that can be sent/received by a RemoteMessenger
export type SerializableData =
	number|boolean|string|TransferableObject|undefined|null|SerializableData[]|{ readonly [key: string]: SerializableData };

export type TransferableCallback = (...args: SerializableDataAndCallbacks[])=> Promise<SerializableDataAndCallbacks|void>;

export type SerializableDataAndCallbacks =
	number|boolean|string|TransferableObject|undefined|null|TransferableCallback|SerializableDataAndCallbacks[]|{ readonly [key: string]: SerializableDataAndCallbacks };

export type CallbackIds = null|string|CallbackIds[]|Readonly<{
	[propertyName: string]: CallbackIds;
}>;

// This provides some amount of type checking for messenger APIs.
//
// While all parameters and return types must also extend SerializableData,
// there's no clear way to enforce this in TypeScript (most methods lead to
// a "missing index signature" error).
export type ReturnsPromises<Type> = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	[functionName in keyof Type]: (...args: any[])=> Promise<any>;
};
