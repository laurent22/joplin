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
const BaseModel_1 = require("./BaseModel");
class TaskStateModel extends BaseModel_1.default {
    get tableName() {
        return 'task_states';
    }
    hasUuid() {
        return false;
    }
    loadByTaskId(taskId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.db(this.tableName).where('task_id', '=', taskId).first();
        });
    }
    loadByTaskIds(taskIds) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.db(this.tableName).whereIn('task_id', taskIds);
        });
    }
    init(taskId) {
        return __awaiter(this, void 0, void 0, function* () {
            const taskState = yield this.loadByTaskId(taskId);
            if (taskState)
                return taskState;
            return this.save({
                task_id: taskId,
                enabled: 1,
                running: 0,
            });
        });
    }
    start(taskId) {
        return __awaiter(this, void 0, void 0, function* () {
            const state = yield this.loadByTaskId(taskId);
            if (state.running)
                throw new Error(`Task is already running: ${taskId}`);
            yield this.save({ id: state.id, running: 1 });
        });
    }
    stop(taskId) {
        return __awaiter(this, void 0, void 0, function* () {
            const state = yield this.loadByTaskId(taskId);
            if (!state.running)
                throw new Error(`Task is not running: ${taskId}`);
            yield this.save({ id: state.id, running: 0 });
        });
    }
    enable(taskId, enabled = true) {
        return __awaiter(this, void 0, void 0, function* () {
            const state = yield this.loadByTaskId(taskId);
            if (state.enabled && enabled)
                throw new Error(`Task is already enabled: ${taskId}`);
            if (!state.enabled && !enabled)
                throw new Error(`Task is already disabled: ${taskId}`);
            yield this.save({ id: state.id, enabled: enabled ? 1 : 0 });
        });
    }
    disable(taskId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.enable(taskId, false);
        });
    }
}
exports.default = TaskStateModel;
//# sourceMappingURL=TaskStateModel.js.map