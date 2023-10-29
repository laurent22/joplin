"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class FakeRequest {
    constructor(nodeRequest) {
        this.req_ = nodeRequest;
    }
    get method() {
        return this.req_.method || 'GET';
    }
}
exports.default = FakeRequest;
//# sourceMappingURL=FakeRequest.js.map