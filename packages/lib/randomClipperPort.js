"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPort = startPort;
exports.randomClipperPort = randomClipperPort;
function startPort(env) {
    const startPorts = {
        prod: 41184,
        dev: 27583,
    };
    return env === 'prod' ? startPorts.prod : startPorts.dev;
}
function randomClipperPort(state, env) {
    if (!state) {
        state = { offset: 0 };
    }
    else {
        state.offset++;
    }
    state.port = startPort(env) + state.offset;
    return state;
}
const randomClipperPort_ = {
    randomClipperPort,
    startPort,
};
exports.default = randomClipperPort_;
//# sourceMappingURL=randomClipperPort.js.map