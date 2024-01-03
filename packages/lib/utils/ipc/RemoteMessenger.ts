import { CallbackArguments, SerializableData, SerializableDataAndCallbacks, TransferableCallback } from './types';
import mergeCallbacksAndArgs from './utils/mergeCallbacksAndArgs';
import separateCallbacksFromArgs from './utils/separateCallbacksFromArgs';

enum MessageType {
	RemoteReady = 'RemoteReady',
	InvokeMethod = 'InvokeMethod',
	InvokeArgumentCallback = 'InvokeArgumentCallback',
	ErrorResponse = 'ErrorResponse',
	ReturnValueResponse = 'ReturnValueResponse',
}

type RemoteReadyMessage = Readonly<{
	kind: MessageType.RemoteReady;
}>;

type InvokeMethodMessage = Readonly<{
	kind: MessageType.InvokeMethod;

	respondWithId: string;
	methodPath: string[];
	arguments: SerializableData[];

	// Stores identifiers for callbacks within the normal `arguments`.
	// For example,
	// 	[{ foo: 'some-id-here' }, null, 'some-id-here-2']
	// means that the first argument has a property named "foo" that is a function
	// and the third argument is also a function.
	eventHandlerArguments: CallbackArguments[];
}>;

type InvokeArgumentCallbackMessage = Readonly<{
	kind: MessageType.InvokeArgumentCallback;
	callbackId: string;
	arguments: SerializableData[];
}>;

type ErrorResponse = Readonly<{
	kind: MessageType.ErrorResponse;

	responseId: string;
	errorMessage: string;
}>;

type ReturnValueResponse = Readonly<{
	kind: MessageType.ReturnValueResponse;

	responseId: string;
	returnValue: SerializableData;
}>;

type BaseMessage = Readonly<{
	channelId: string;
}>;

type InternalMessage = (RemoteReadyMessage|InvokeMethodMessage|InvokeArgumentCallbackMessage|ErrorResponse|ReturnValueResponse) & BaseMessage;

// Listeners for a remote method to resolve or reject.
type OnMethodResolveListener = (returnValue: SerializableData)=> void;
type OnMethodRejectListener = (errorMessage: string)=> void;
type OnRemoteReadyListener = ()=> void;

type OnAllMethodsRespondedToListener = ()=> void;

// A thin wrapper around postMessage. A script within `targetWindow` should
// also construct a RemoteMessenger (with IncomingMessageType and
// OutgoingMessageType reversed).
export default abstract class RemoteMessenger<LocalInterface, RemoteInterface> {
	private resolveMethodCallbacks: Record<string, OnMethodResolveListener> = Object.create(null);
	private rejectMethodCallbacks: Record<string, OnMethodRejectListener> = Object.create(null);
	private argumentCallbacks: Map<string, TransferableCallback> = new Map();

	private numberUnrespondedToMethods = 0;
	private noWaitingMethodsListeners: OnAllMethodsRespondedToListener[] = [];

	private remoteReadyListeners: OnRemoteReadyListener[] = [];
	private isRemoteReady = false;
	private isLocalReady = false;
	private nextResponseId = 0;

	// If true, we'll be ready to receive data after .setLocalInterface is next called.
	private waitingForLocalInterface = false;

	public readonly remoteApi: RemoteInterface;

	// channelId should be the same as the id of the messenger this will communicate with.
	//
	// If localInterface is null, .setLocalInterface must be called.
	// This allows chaining multiple messengers together.
	public constructor(private channelId: string, private localInterface: LocalInterface|null) {
		const makeApiFor = (methodPath: string[]) => {
			// Use a function as the base object so that .apply works.
			const baseObject = () => {};

			return new Proxy(baseObject, {
				// Map all properties to functions that invoke remote
				// methods.
				get: (_target, property: string): any => {
					return makeApiFor([...methodPath, property]);
				},
				apply: (_target, _thisArg, argumentsList: SerializableDataAndCallbacks[]) => {
					return this.invokeRemoteMethod(methodPath, argumentsList);
				},
			});
		};
		this.remoteApi = makeApiFor([]) as RemoteInterface;
	}

	private createResponseId(methodPath: string[]) {
		return `${methodPath.join(',')}-${this.nextResponseId++}`;
	}

	private async invokeRemoteMethod(methodPath: string[], args: SerializableDataAndCallbacks[]) {
		// Function arguments can't be transferred using standard .postMessage calls.
		// As such, we assign them IDs and transfer the IDs instead:
		const separatedArgs = separateCallbacksFromArgs(args);
		for (const id in separatedArgs.idToCallbacks) {
			this.argumentCallbacks.set(id, separatedArgs.idToCallbacks[id]);
		}

		// Wait for the remote to be ready to receive before
		// actually sending a message.
		this.numberUnrespondedToMethods ++;
		await this.awaitRemoteReady();

		return new Promise<SerializableData>((resolve, reject) => {
			const responseId = this.createResponseId(methodPath);

			this.resolveMethodCallbacks[responseId] = returnValue => {
				resolve(returnValue);
			};
			this.rejectMethodCallbacks[responseId] = (errorMessage: string) => {
				reject(errorMessage);
			};

			this.postMessage({
				kind: MessageType.InvokeMethod,

				methodPath,
				arguments: separatedArgs.argsWithoutCallbacks,
				eventHandlerArguments: separatedArgs.callbackArgs,
				respondWithId: responseId,

				channelId: this.channelId,
			});
		});
	}

	private canRemoteAccessProperty(_parentObject: any, methodName: string) {
		// TODO: There may be a better way to do this -- this currently assumes that
		//       **only** the following property names should be avoided.
		// The goal here is primarially to prevent remote from accessing the Function
		// constructor (which can lead to XSS).
		return !['constructor', 'prototype', '__proto__'].includes(methodName);
	}

	// Calls a local method and sends the result to the remote connection.
	private async invokeLocalMethod(message: InvokeMethodMessage) {
		try {
			let currentObject: any = this.localInterface;
			for (const propertyName of message.methodPath) {
				if (!this.canRemoteAccessProperty(currentObject, propertyName)) {
					throw new Error(`Cannot access property ${propertyName}`);
				}

				currentObject = currentObject[propertyName];
			}

			if (typeof currentObject !== 'function') {
				throw new Error(`Property ${message.methodPath.join('.')} is not a function.`);
			}

			const args = mergeCallbacksAndArgs(
				message.arguments,
				message.eventHandlerArguments,
				(callbackId: string, callbackArgs: SerializableData[]) => {
					this.postMessage({
						kind: MessageType.InvokeArgumentCallback,
						callbackId,
						arguments: callbackArgs,
						channelId: this.channelId,
					});
				},
			);

			const result = await currentObject(...args);

			this.postMessage({
				kind: MessageType.ReturnValueResponse,
				responseId: message.respondWithId,
				returnValue: result,
				channelId: this.channelId,
			});
		} catch (error) {
			console.error('Error: ', error);

			this.postMessage({
				kind: MessageType.ErrorResponse,
				responseId: message.respondWithId,
				errorMessage: `${error}`,
				channelId: this.channelId,
			});
		}
	}

	private invokeArgumentCallback(message: InvokeArgumentCallbackMessage) {
		if (!this.argumentCallbacks.has(message.callbackId)) {
			throw new Error(`Cannot call callback with ID ${message.callbackId} -- has not been registered.`);
		}

		this.argumentCallbacks.get(message.callbackId)(...message.arguments);
	}

	private onMethodRespondedTo(responseId: string) {
		delete this.resolveMethodCallbacks[responseId];
		delete this.rejectMethodCallbacks[responseId];

		this.numberUnrespondedToMethods --;
		if (this.numberUnrespondedToMethods === 0) {
			for (const listener of this.noWaitingMethodsListeners) {
				listener();
			}
			this.noWaitingMethodsListeners = [];
		} else if (this.numberUnrespondedToMethods < 0) {
			this.numberUnrespondedToMethods = 0;
			throw new Error('Some method has been responded to multiple times');
		}
	}

	private async onRemoteResolve(message: ReturnValueResponse) {
		this.resolveMethodCallbacks[message.responseId](message.returnValue);
		this.onMethodRespondedTo(message.responseId);
	}

	private async onRemoteReject(message: ErrorResponse) {
		this.rejectMethodCallbacks[message.responseId](message.errorMessage);
		this.onMethodRespondedTo(message.responseId);
	}

	private async onRemoteReadyToReceive() {
		if (this.isRemoteReady) {
			return;
		}

		this.isRemoteReady = true;
		for (const listener of this.remoteReadyListeners) {
			listener();
		}

		// If ready, re-send the RemoteReady message, it may have been sent before
		// the remote first loaded.
		if (this.isLocalReady) {
			this.postMessage({
				kind: MessageType.RemoteReady,
				channelId: this.channelId,
			});
		}
	}

	private awaitRemoteReady() {
		return new Promise<void>(resolve => {
			if (this.isRemoteReady) {
				resolve();
			} else {
				this.remoteReadyListeners.push(() => resolve());
			}
		});
	}

	// Wait for all methods to have received a response.
	// This can be used to check whether it's safe to destroy a remote, or
	// whether doing so will cause a method to never resolve.
	public awaitAllMethodsRespondedTo() {
		return new Promise<void>(resolve => {
			if (this.numberUnrespondedToMethods === 0) {
				resolve();
			} else {
				this.noWaitingMethodsListeners.push(resolve);
			}
		});
	}

	// Should be called by subclasses when a message is received.
	protected async onMessage(message: SerializableData): Promise<void> {
		if (!(typeof message === 'object')) {
			throw new Error('Invalid message. Messages passed to onMessage must have type "object".');
		}

		if (Array.isArray(message)) {
			throw new Error('Message must be an object (is an array).');
		}

		if (typeof message.kind !== 'string') {
			throw new Error(`message.kind must be a string, was ${typeof message.kind}`);
		}

		if (!(message.kind in MessageType)) {
			throw new Error(`Invalid message type, ${message.kind}`);
		}

		// We just verified that message.kind is a MessageType,
		// assume that all other properties are valid.
		const asInternalMessage = message as InternalMessage;

		// If intended for a different set of messengers...
		if (asInternalMessage.channelId !== this.channelId) {
			return;
		}

		if (asInternalMessage.kind === MessageType.InvokeMethod) {
			await this.invokeLocalMethod(asInternalMessage);
		} else if (asInternalMessage.kind === MessageType.InvokeArgumentCallback) {
			this.invokeArgumentCallback(asInternalMessage);
		} else if (asInternalMessage.kind === MessageType.ReturnValueResponse) {
			await this.onRemoteResolve(asInternalMessage);
		} else if (asInternalMessage.kind === MessageType.ErrorResponse) {
			await this.onRemoteReject(asInternalMessage);
		} else if (asInternalMessage.kind === MessageType.RemoteReady) {
			await this.onRemoteReadyToReceive();
		} else {
			// Have TypeScipt verify that the above cases are exhaustive
			const exhaustivenessCheck: never = asInternalMessage;
			return exhaustivenessCheck;
		}
	}

	// Subclasses should call this method when ready to receive data
	protected onReadyToReceive() {
		if (this.isLocalReady) {
			return;
		}

		if (this.localInterface === null) {
			this.waitingForLocalInterface = true;
			return;
		}

		this.isLocalReady = true;
		this.postMessage({
			kind: MessageType.RemoteReady,
			channelId: this.channelId,
		});
	}

	public setLocalInterface(localInterface: LocalInterface) {
		this.localInterface = localInterface;

		if (this.waitingForLocalInterface) {
			this.waitingForLocalInterface = false;
			this.onReadyToReceive();
		}
	}

	protected abstract postMessage(message: InternalMessage): void;
}
