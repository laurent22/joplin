"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIfLoginWasSuccessful = exports.generateApplicationConfirmUrl = exports.getApplicationInformation = exports.reducer = exports.defaultState = void 0;
const Setting_1 = require("../models/Setting");
const types_1 = require("../types");
const shim_1 = require("../shim");
const locale_1 = require("../locale");
const eventManager_1 = require("../eventManager");
const registry_1 = require("../registry");
const SyncTargetRegistry_1 = require("../SyncTargetRegistry");
exports.defaultState = {
    className: 'text',
    message: () => (0, locale_1._)('Waiting for authorisation...'),
    next: 'LINK_USED',
    active: 'INITIAL',
};
const reducer = (state, action) => {
    switch (action.type) {
        case 'LINK_USED': {
            return {
                className: 'text',
                message: () => (0, locale_1._)('If you have already authorised, please wait for the application to sync to Joplin Cloud.'),
                next: 'COMPLETED',
                active: 'LINK_USED',
            };
        }
        case 'COMPLETED': {
            return {
                className: 'bold',
                message: () => (0, locale_1._)('You are logged in into Joplin Cloud, you can leave this screen now.'),
                active: 'COMPLETED',
                next: 'COMPLETED',
            };
        }
        case 'ERROR': {
            return {
                className: 'text',
                message: () => (0, locale_1._)('You were unable to connect to Joplin Cloud. Please check your credentials and try again. Error:'),
                active: 'ERROR',
                next: 'COMPLETED',
                errorMessage: action.payload,
            };
        }
        default: {
            return state;
        }
    }
};
exports.reducer = reducer;
const getApplicationInformation = async () => {
    const platformName = await shim_1.default.platformName();
    switch (platformName) {
        case 'ios':
            return { type: types_1.ApplicationType.Mobile, platform: types_1.ApplicationPlatform.Ios };
        case 'android':
            return { type: types_1.ApplicationType.Mobile, platform: types_1.ApplicationPlatform.Android };
        case 'darwin':
            return { type: types_1.ApplicationType.Desktop, platform: types_1.ApplicationPlatform.MacOs };
        case 'win32':
            return { type: types_1.ApplicationType.Desktop, platform: types_1.ApplicationPlatform.Windows };
        case 'linux':
            return { type: types_1.ApplicationType.Desktop, platform: types_1.ApplicationPlatform.Linux };
        default:
            return { type: types_1.ApplicationType.Unknown, platform: types_1.ApplicationPlatform.Unknown };
    }
};
exports.getApplicationInformation = getApplicationInformation;
const generateApplicationConfirmUrl = async (confirmUrl) => {
    const applicationInfo = await (0, exports.getApplicationInformation)();
    const searchParams = new URLSearchParams();
    searchParams.append('platform', applicationInfo.platform.toString());
    searchParams.append('type', applicationInfo.type.toString());
    searchParams.append('version', shim_1.default.appVersion());
    return `${confirmUrl}?${searchParams.toString()}`;
};
exports.generateApplicationConfirmUrl = generateApplicationConfirmUrl;
// We have isWaitingResponse inside the function to avoid any state from lingering
// after an error occurs. E.g.: if the function would throw an error while isWaitingResponse
// was set to true the next time we call the function the value would still be true.
// The closure function prevents that.
const checkIfLoginWasSuccessful = async (applicationsUrl) => {
    let isWaitingResponse = false;
    const performLoginRequest = async () => {
        if (isWaitingResponse)
            return undefined;
        isWaitingResponse = true;
        const response = await fetch(applicationsUrl);
        const jsonBody = await response.json();
        if (!response.ok || jsonBody.status !== 'finished') {
            isWaitingResponse = false;
            return undefined;
        }
        Setting_1.default.setValue('sync.10.username', jsonBody.id);
        Setting_1.default.setValue('sync.10.password', jsonBody.password);
        Setting_1.default.setValue('sync.target', SyncTargetRegistry_1.default.nameToId('joplinCloud'));
        const fileApi = await registry_1.reg.syncTarget().fileApi();
        await fileApi.driver().api().loadSession();
        eventManager_1.default.emit(eventManager_1.EventName.SessionEstablished);
        return { success: true };
    };
    return performLoginRequest();
};
exports.checkIfLoginWasSuccessful = checkIfLoginWasSuccessful;
