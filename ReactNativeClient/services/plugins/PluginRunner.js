"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const BasePluginRunner_1 = require("lib/services/plugins/BasePluginRunner");
var PluginMessageTarget;
(function (PluginMessageTarget) {
    PluginMessageTarget["MainWindow"] = "mainWindow";
    PluginMessageTarget["Plugin"] = "plugin";
})(PluginMessageTarget || (PluginMessageTarget = {}));
let callbackIndex = 1;
const callbackPromises = {};
function mapEventIdsToHandlers(pluginId, arg) {
    if (Array.isArray(arg)) {
        for (let i = 0; i < arg.length; i++) {
            arg[i] = mapEventIdsToHandlers(pluginId, arg[i]);
        }
        return arg;
    }
    else if (typeof arg === 'string' && arg.indexOf('___plugin_event_') === 0) {
        const eventId = arg;
        return (...args) => __awaiter(this, void 0, void 0, function* () {
            const callbackId = `cb_${pluginId}_${Date.now()}_${callbackIndex++}`;
            const promise = new Promise((resolve, reject) => {
                callbackPromises[callbackId] = { resolve, reject };
            });
            // ipcRenderer.send('pluginMessage', {
            // 	callbackId: callbackId,
            // 	target: PluginMessageTarget.Plugin,
            // 	pluginId: pluginId,
            // 	eventId: eventId,
            // 	args: args,
            // });
            return promise;
        });
    }
    else if (arg === null) {
        return null;
    }
    else if (arg === undefined) {
        return undefined;
    }
    else if (typeof arg === 'object') {
        for (const n in arg) {
            arg[n] = mapEventIdsToHandlers(pluginId, arg[n]);
        }
    }
    return arg;
}
class PluginRunner extends BasePluginRunner_1.default {
    constructor() {
        super();
        this.eventHandlers_ = {};
        this.eventHandler = this.eventHandler.bind(this);
    }
    eventHandler(eventHandlerId, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const cb = this.eventHandlers_[eventHandlerId];
            return cb(...args);
        });
    }
    run(plugin, _pluginApi) {
        return __awaiter(this, void 0, void 0, function* () {
            console.info('RUNNING', plugin);
            // const scriptPath = `${Setting.value('tempDir')}/plugin_${plugin.id}.js`;
            // await shim.fsDriver().writeFile(scriptPath, plugin.scriptText, 'utf8');
            // const pluginWindow = bridge().newBrowserWindow({
            // 	show: false,
            // 	webPreferences: {
            // 		nodeIntegration: true,
            // 	},
            // });
            // bridge().electronApp().registerPluginWindow(plugin.id, pluginWindow);
            // pluginWindow.loadURL(`${require('url').format({
            // 	pathname: require('path').join(__dirname, 'plugin_index.html'),
            // 	protocol: 'file:',
            // 	slashes: true,
            // })}?pluginId=${encodeURIComponent(plugin.id)}&pluginScript=${encodeURIComponent(`file://${scriptPath}`)}`);
            // pluginWindow.webContents.once('dom-ready', () => {
            // 	pluginWindow.webContents.openDevTools();
            // });
            // ipcRenderer.on('pluginMessage', async (_event:any, message:PluginMessage) => {
            // 	if (message.target !== PluginMessageTarget.MainWindow) return;
            // 	if (message.pluginId !== plugin.id) return;
            // 	if (message.mainWindowCallbackId) {
            // 		const promise = callbackPromises[message.mainWindowCallbackId];
            // 		if (!promise) {
            // 			console.error('Got a callback without matching promise: ', message);
            // 			return;
            // 		}
            // 		if (message.error) {
            // 			promise.reject(message.error);
            // 		} else {
            // 			promise.resolve(message.result);
            // 		}
            // 	} else {
            // 		const mappedArgs = mapEventIdsToHandlers(plugin.id, message.args);
            // 		const fullPath = `joplin.${message.path}`;
            // 		this.logger().debug(`PluginRunner: execute call: ${fullPath}: ${mappedArgs}`);
            // 		let result:any = null;
            // 		let error:any = null;
            // 		try {
            // 			result = await executeSandboxCall(plugin.id, pluginApi, fullPath, mappedArgs, this.eventHandler);
            // 		} catch (e) {
            // 			error = e ? e : new Error('Unknown error');
            // 		}
            // 		ipcRenderer.send('pluginMessage', {
            // 			target: PluginMessageTarget.Plugin,
            // 			pluginId: plugin.id,
            // 			pluginCallbackId: message.callbackId,
            // 			result: result,
            // 			error: error,
            // 		});
            // 	}
            // });
        });
    }
}
exports.default = PluginRunner;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGx1Z2luUnVubmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiUGx1Z2luUnVubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQ0EsNEVBQXFFO0FBT3JFLElBQUssbUJBR0o7QUFIRCxXQUFLLG1CQUFtQjtJQUN2QixnREFBeUIsQ0FBQTtJQUN6Qix3Q0FBaUIsQ0FBQTtBQUNsQixDQUFDLEVBSEksbUJBQW1CLEtBQW5CLG1CQUFtQixRQUd2QjtBQWFELElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQztBQUN0QixNQUFNLGdCQUFnQixHQUFPLEVBQUUsQ0FBQztBQUVoQyxTQUFTLHFCQUFxQixDQUFDLFFBQWUsRUFBRSxHQUFPO0lBQ3RELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUN2QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNwQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcscUJBQXFCLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2pEO1FBQ0QsT0FBTyxHQUFHLENBQUM7S0FDWDtTQUFNLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDNUUsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDO1FBRXBCLE9BQU8sQ0FBTyxHQUFHLElBQVUsRUFBRSxFQUFFO1lBQzlCLE1BQU0sVUFBVSxHQUFHLE1BQU0sUUFBUSxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxhQUFhLEVBQUUsRUFBRSxDQUFDO1lBRXJFLE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO2dCQUMvQyxnQkFBZ0IsQ0FBQyxV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