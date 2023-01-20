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
const time_1 = require("../utils/time");
const types_1 = require("../utils/types");
const logger = Logger_1.default.create('BaseService');
class BaseService {
    constructor(env, models, config) {
        this.name_ = 'Untitled';
        this.enabled_ = true;
        this.destroyed_ = false;
        this.maintenanceInterval_ = 10000;
        this.scheduledMaintenances_ = [];
        this.maintenanceInProgress_ = false;
        this.env_ = env;
        this.models_ = models;
        this.config_ = config;
        this.scheduleMaintenance = this.scheduleMaintenance.bind(this);
    }
    get name() {
        return this.name_;
    }
    destroy() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.destroyed_)
                throw new Error(`${this.name}: Already destroyed`);
            this.destroyed_ = true;
            this.scheduledMaintenances_ = [];
            while (this.maintenanceInProgress_) {
                yield (0, time_1.msleep)(500);
            }
        });
    }
    get models() {
        return this.models_;
    }
    get env() {
        return this.env_;
    }
    get config() {
        return this.config_;
    }
    get enabled() {
        return this.enabled_;
    }
    get maintenanceInProgress() {
        return !!this.scheduledMaintenances_.length;
    }
    scheduleMaintenance() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.destroyed_)
                return;
            // Every time a maintenance is scheduled we push a task to this array.
            // Whenever the maintenance actually runs, that array is cleared. So it
            // means, that if new tasks are pushed to the array while the
            // maintenance is runing, it will run again once it's finished, so as to
            // process any item that might have been added.
            this.scheduledMaintenances_.push(true);
            if (this.scheduledMaintenances_.length !== 1)
                return;
            while (this.scheduledMaintenances_.length) {
                yield (0, time_1.msleep)(this.env === types_1.Env.Dev ? 2000 : this.maintenanceInterval_);
                if (this.destroyed_)
                    return;
                const itemCount = this.scheduledMaintenances_.length;
                yield this.runMaintenance();
                this.scheduledMaintenances_.splice(0, itemCount);
            }
        });
    }
    runMaintenance() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.maintenanceInProgress_) {
                logger.warn(`${this.name}: Skipping maintenance because it is already in progress`);
                return;
            }
            this.maintenanceInProgress_ = true;
            try {
                yield this.maintenance();
            }
            catch (error) {
                logger.error(`${this.name}: Could not run maintenance`, error);
            }
            this.maintenanceInProgress_ = false;
        });
    }
    maintenance() {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('Not implemented');
        });
    }
    runInBackground() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runMaintenance();
        });
    }
}
exports.default = BaseService;
//# sourceMappingURL=BaseService.js.map