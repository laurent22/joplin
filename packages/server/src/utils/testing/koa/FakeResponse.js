"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class FakeResponse {
    constructor() {
        this.status = 200;
        this.body = null;
        this.headers_ = {};
    }
    set(name, value) {
        this.headers_[name] = value;
    }
    get(name) {
        return this.headers_[name];
    }
}
exports.default = FakeResponse;
//# sourceMappingURL=FakeResponse.js.map