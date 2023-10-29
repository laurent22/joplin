"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timerPop = exports.timerPush = exports.msleep = void 0;
const msleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
exports.msleep = msleep;
const perfTimers_ = [];
function timerPush(name) {
    perfTimers_.push({ name, startTime: Date.now() });
}
exports.timerPush = timerPush;
function timerPop() {
    const t = perfTimers_.pop();
    // eslint-disable-next-line no-console
    console.info(`Time: ${t.name}: ${Date.now() - t.startTime}`);
}
exports.timerPop = timerPop;
//# sourceMappingURL=time.js.map