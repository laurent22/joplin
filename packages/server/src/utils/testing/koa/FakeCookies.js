"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class FakeCookies {
    constructor() {
        this.values_ = {};
    }
    get(name) {
        return this.values_[name];
    }
    set(name, value) {
        this.values_[name] = value;
    }
}
exports.default = FakeCookies;
//# sourceMappingURL=FakeCookies.js.map