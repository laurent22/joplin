"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BaseService {
    constructor() {
        this.instanceLogger_ = null;
    }
    logger() {
        if (this.instanceLogger_)
            return this.instanceLogger_;
        if (!BaseService.logger_)
            throw new Error('BaseService.logger_ not set!!');
        return BaseService.logger_;
    }
    setLogger(v) {
        this.instanceLogger_ = v;
    }
}
BaseService.logger_ = null;
exports.default = BaseService;
