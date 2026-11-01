'use strict';
/* eslint-disable */
// Copied from lib/randomClipperPort.js

Object.defineProperty(exports, "__esModule", { value: true });
exports.startPort = exports.randomClipperPort = void 0;
const startPort = (env) => {
    const startPorts = {
        prod: 41184,
        dev: 27583,
    };
    return env === 'prod' ? startPorts.prod : startPorts.dev;
};
exports.startPort = startPort;
const randomClipperPort = (state, env) => {
    if (!state) {
        state = { offset: 0 };
    }
    else {
        state.offset++;
    }
    state.port = startPort(env) + state.offset;
    return state;
};
exports.randomClipperPort = randomClipperPort;
//# sourceMappingURL=randomClipperPort.js.map