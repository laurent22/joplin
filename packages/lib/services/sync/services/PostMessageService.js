"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponderComponentType = exports.MessageParticipant = void 0;
const Logger_1 = require("@joplin/utils/Logger");
const PluginService_1 = require("./plugins/PluginService");
const logger = Logger_1.default.create('PostMessageService');
var MessageParticipant;
(function (MessageParticipant) {
    MessageParticipant["ContentScript"] = "contentScript";
    MessageParticipant["Plugin"] = "plugin";
    MessageParticipant["UserWebview"] = "userWebview";
})(MessageParticipant || (exports.MessageParticipant = MessageParticipant = {}));
var ResponderComponentType;
(function (ResponderComponentType) {
    ResponderComponentType["NoteTextViewer"] = "noteTextViewer";
    ResponderComponentType["UserWebview"] = "userWebview";
})(ResponderComponentType || (exports.ResponderComponentType = ResponderComponentType = {}));
class PostMessageService {
    constructor() {
        this.responders_ = {};
        this.viewMessageHandlers_ = {};
    }
    static instance() {
        if (this.instance_)
            return this.instance_;
        this.instance_ = new PostMessageService();
        return this.instance_;
    }
    async postMessage(message) {
        let response = null;
        let error = null;
        if (message.from === MessageParticipant.Plugin && message.to === MessageParticipant.UserWebview) {
            this.viewMessageHandler(message);
            return;
        }
        try {
            if (message.from === MessageParticipant.ContentScript && message.to === MessageParticipant.Plugin) {
                const pluginId = PluginService_1.default.instance().pluginIdByContentScriptId(message.contentScriptId);
                if (!pluginId)
                    throw new Error(`Could not find plugin associated with content script "${message.contentScriptId}"`);
                response = await PluginService_1.default.instance().pluginById(pluginId).emitContentScriptMessage(message.contentScriptId, message.content);
            }
            else if (message.from === MessageParticipant.UserWebview && message.to === MessageParticipant.Plugin) {
                response = await PluginService_1.default.instance().pluginById(message.pluginId).viewController(message.viewId).emitMessage({ message: message.content });
            }
            else {
                throw new Error(`Unhandled message: ${JSON.stringify(message)}`);
            }
        }
        catch (e) {
            error = e;
        }
        this.sendResponse(message, response, error);
    }
    viewMessageHandler(message) {
        const viewMessageHandler = this.viewMessageHandlers_[[ResponderComponentType.UserWebview, message.viewId].join(':')];
        if (!viewMessageHandler) {
            logger.warn('Cannot receive message because no viewMessageHandler was found', message);
        }
        else {
            viewMessageHandler(message.content);
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    sendResponse(message, responseContent, error) {
        let responder = null;
        if (message.from === MessageParticipant.ContentScript) {
            responder = this.responder(ResponderComponentType.NoteTextViewer, message.viewId, message.windowId);
        }
        else if (message.from === MessageParticipant.UserWebview) {
            responder = this.responder(ResponderComponentType.UserWebview, message.viewId, message.windowId);
        }
        if (!responder) {
            logger.info('Cannot respond to message because no responder was found', message);
            logger.info('Error was:', error);
        }
        else {
            responder({
                responseId: message.id,
                response: responseContent,
                error,
            });
        }
    }
    responder(type, viewId, windowId) {
        return this.responders_[[type, viewId, windowId].join(':')];
    }
    registerResponder(type, viewId, windowId, responder) {
        this.responders_[[type, viewId, windowId].join(':')] = responder;
    }
    unregisterResponder(type, viewId, windowId) {
        delete this.responders_[[type, viewId, windowId].join(':')];
    }
    registerViewMessageHandler(type, viewId, callback) {
        this.viewMessageHandlers_[[type, viewId].join(':')] = callback;
    }
    unregisterViewMessageHandler(type, viewId) {
        delete this.viewMessageHandlers_[[type, viewId].join(':')];
    }
}
exports.default = PostMessageService;
