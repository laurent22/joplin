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
const Logger_1 = require("@joplin/lib/Logger");
const ChangeModel_1 = require("../models/ChangeModel");
const BaseService_1 = require("./BaseService");
const logger = Logger_1.default.create('ShareService');
class ShareService extends BaseService_1.default {
    maintenance() {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info('Starting maintenance...');
            const startTime = Date.now();
            try {
                yield this.models.share().updateSharedItems3();
            }
            catch (error) {
                logger.error('Could not update share items:', error);
            }
            logger.info(`Maintenance completed in ${Date.now() - startTime}ms`);
        });
    }
    runInBackground() {
        const _super = Object.create(null, {
            runInBackground: { get: () => super.runInBackground }
        });
        return __awaiter(this, void 0, void 0, function* () {
            ChangeModel_1.default.eventEmitter.on('saved', this.scheduleMaintenance);
            yield _super.runInBackground.call(this);
        });
    }
}
exports.default = ShareService;
//# sourceMappingURL=ShareService.js.map