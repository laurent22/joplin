// Passing messages across the various sandbox boundaries can be complex and is
// hard to unit test. This class is an attempt to clarify and track what happens
// when messages are sent.
//
// Essentially it works like this:
//
// The component that might post messages, for example from a content script to
// the plugin, and expect responses:
//
// - First it registers a responder with the PostMessageService - this is what
//   will be used to send back responses.
// - Whenever it sends a message it calls PostMessageService.postMessage() and
//   wait for the response
// - This class forwards the message to the relevant participant and wait for the
//   response
// - Then it sends back the response to the component using the registered
//   responder.
//
// There's still quite a bit of boiler plate code on the content script or
// webview side to mask the complexity of passing messages. In particular, it
// needs to create and return a promise when a message is posted. Then in
// another location, when the response is received, it resolves that promise.
// See UserWebviewIndex.js to see how it's done.

import Logger from '@joplin/utils/Logger';
import PluginService from './plugins/PluginService';

const logger = Logger.create('PostMessageService');

export enum MessageParticipant {
	ContentScript = 'contentScript',
	Plugin = 'plugin',
	UserWebview = 'userWebview',
}

export enum ResponderComponentType {
	NoteTextViewer = 'noteTextViewer',
	UserWebview = 'userWebview',
}

export interface MessageResponse {
	responseId: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	response: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	error: any;
}

type MessageResponder = (message: MessageResponse)=> void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
type ViewMessageHandler = (message: any)=> void;

interface Message {
	pluginId: string;
	windowId: string;
	contentScriptId: string;
	viewId: string;
	from: MessageParticipant;
	to: MessageParticipant;
	id: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	content: any;
}

export default class PostMessageService {

	private static instance_: PostMessageService;
	private responders_: Record<string, MessageResponder> = {};
	private viewMessageHandlers_: Record<string, ViewMessageHandler> = {};

	public static instance(): PostMessageService {
		if (this.instance_) return this.instance_;
		this.instance_ = new PostMessageService();
		return this.instance_;
	}

	public async postMessage(message: Message) {

		let response = null;
		let error = null;

		if (message.from === MessageParticipant.Plugin && message.to === MessageParticipant.UserWebview) {
			this.viewMessageHandler(message);
			return;
		}

		try {
			if (message.from === MessageParticipant.ContentScript && message.to === MessageParticipant.Plugin) {
				const pluginId = PluginService.instance().pluginIdByContentScriptId(message.contentScriptId);
				if (!pluginId) throw new Error(`Could not find plugin associated with content script "${message.contentScriptId}"`);
				response = await PluginService.instance().pluginById(pluginId).emitContentScriptMessage(message.contentScriptId, message.content);

			} else if (message.from === MessageParticipant.UserWebview && message.to === MessageParticipant.Plugin) {
				response = await PluginService.instance().pluginById(message.pluginId).viewController(message.viewId).emitMessage({ message: message.content });

			} else {
				throw new Error(`Unhandled message: ${JSON.stringify(message)}`);
			}
		} catch (e) {
			error = e;
		}

		this.sendResponse(message, response, error);
	}

	private viewMessageHandler(message: Message) {

		const viewMessageHandler = this.viewMessageHandlers_[[ResponderComponentType.UserWebview, message.viewId].join(':')];

		if (!viewMessageHandler) {
			logger.warn('Cannot receive message because no viewMessageHandler was found', message);
		} else {
			viewMessageHandler(message.content);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private sendResponse(message: Message, responseContent: any, error: any) {

		let responder: MessageResponder = null;

		if (message.from === MessageParticipant.ContentScript) {
			responder = this.responder(ResponderComponentType.NoteTextViewer, message.viewId, message.windowId);
		} else if (message.from === MessageParticipant.UserWebview) {
			responder = this.responder(ResponderComponentType.UserWebview, message.viewId, message.windowId);
		}

		if (!responder) {
			logger.info('Cannot respond to message because no responder was found', message);
			logger.info('Error was:', error);
		} else {
			responder({
				responseId: message.id,
				response: responseContent,
				error,
			});
		}
	}

	private responder(type: ResponderComponentType, viewId: string, windowId: string) {
		return this.responders_[[type, viewId, windowId].join(':')];
	}

	public registerResponder(type: ResponderComponentType, viewId: string, windowId: string, responder: MessageResponder) {
		this.responders_[[type, viewId, windowId].join(':')] = responder;
	}

	public unregisterResponder(type: ResponderComponentType, viewId: string, windowId: string) {
		delete this.responders_[[type, viewId, windowId].join(':')];
	}

	public registerViewMessageHandler(type: ResponderComponentType, viewId: string, callback: ViewMessageHandler) {
		this.viewMessageHandlers_[[type, viewId].join(':')] = callback;
	}

	public unregisterViewMessageHandler(type: ResponderComponentType, viewId: string) {
		delete this.viewMessageHandlers_[[type, viewId].join(':')];
	}

}
