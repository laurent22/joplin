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
exports.taskIdToLabel = exports.RunType = void 0;
const Logger_1 = require("@joplin/lib/Logger");
const BaseService_1 = require("./BaseService");
const types_1 = require("./database/types");
const locale_1 = require("@joplin/lib/locale");
const errors_1 = require("../utils/errors");
const cron = require('node-cron');
const logger = Logger_1.default.create('TaskService');
var RunType;
(function (RunType) {
    RunType[RunType["Scheduled"] = 1] = "Scheduled";
    RunType[RunType["Manual"] = 2] = "Manual";
})(RunType = exports.RunType || (exports.RunType = {}));
const taskIdToLabel = (taskId) => {
    const strings = {
        [types_1.TaskId.DeleteExpiredTokens]: (0, locale_1._)('Delete expired tokens'),
        [types_1.TaskId.UpdateTotalSizes]: (0, locale_1._)('Update total sizes'),
        [types_1.TaskId.HandleOversizedAccounts]: (0, locale_1._)('Process oversized accounts'),
        [types_1.TaskId.HandleBetaUserEmails]: 'Process beta user emails',
        [types_1.TaskId.HandleFailedPaymentSubscriptions]: (0, locale_1._)('Process failed payment subscriptions'),
        [types_1.TaskId.DeleteExpiredSessions]: (0, locale_1._)('Delete expired sessions'),
        [types_1.TaskId.CompressOldChanges]: (0, locale_1._)('Compress old changes'),
        [types_1.TaskId.ProcessUserDeletions]: (0, locale_1._)('Process user deletions'),
        [types_1.TaskId.AutoAddDisabledAccountsForDeletion]: (0, locale_1._)('Auto-add disabled accounts for deletion'),
    };
    const s = strings[taskId];
    if (!s)
        throw new Error(`No such task: ${taskId}`);
    return s;
};
exports.taskIdToLabel = taskIdToLabel;
const runTypeToString = (runType) => {
    if (runType === RunType.Scheduled)
        return 'scheduled';
    if (runType === RunType.Manual)
        return 'manual';
    throw new Error(`Unknown run type: ${runType}`);
};
class TaskService extends BaseService_1.default {
    constructor(env, models, config, services) {
        super(env, models, config);
        this.tasks_ = {};
        this.services_ = services;
    }
    registerTask(task) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.tasks_[task.id])
                throw new Error(`Already a task with this ID: ${task.id}`);
            this.tasks_[task.id] = task;
            yield this.models.taskState().init(task.id);
        });
    }
    registerTasks(tasks) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const task of tasks)
                yield this.registerTask(task);
        });
    }
    get tasks() {
        return this.tasks_;
    }
    get taskIds() {
        return Object.keys(this.tasks_).map(s => Number(s));
    }
    taskStates(ids) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.models.taskState().loadByTaskIds(ids);
        });
    }
    taskState(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const r = yield this.taskStates([id]);
            if (!r.length)
                throw new errors_1.ErrorNotFound(`No such task: ${id}`);
            return r[0];
        });
    }
    taskLastEvents(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                taskStarted: yield this.models.event().lastEventByTypeAndName(types_1.EventType.TaskStarted, id.toString()),
                taskCompleted: yield this.models.event().lastEventByTypeAndName(types_1.EventType.TaskCompleted, id.toString()),
            };
        });
    }
    taskById(id) {
        if (!this.tasks_[id])
            throw new Error(`No such task: ${id}`);
        return this.tasks_[id];
    }
    taskDisplayString(id) {
        const task = this.taskById(id);
        return `#${task.id} (${task.description})`;
    }
    runTask(id, runType) {
        return __awaiter(this, void 0, void 0, function* () {
            const displayString = this.taskDisplayString(id);
            const taskState = yield this.models.taskState().loadByTaskId(id);
            if (!taskState.enabled) {
                logger.info(`Not running ${displayString} because the tasks is disabled`);
                return;
            }
            yield this.models.taskState().start(id);
            const startTime = Date.now();
            yield this.models.event().create(types_1.EventType.TaskStarted, id.toString());
            try {
                logger.info(`Running ${displayString} (${runTypeToString(runType)})...`);
                yield this.tasks_[id].run(this.models, this.services_);
            }
            catch (error) {
                logger.error(`On ${displayString}`, error);
            }
            yield this.models.taskState().stop(id);
            yield this.models.event().create(types_1.EventType.TaskCompleted, id.toString());
            logger.info(`Completed ${this.taskDisplayString(id)} in ${Date.now() - startTime}ms`);
        });
    }
    enableTask(taskId, enabled = true) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.models.taskState().enable(taskId, enabled);
        });
    }
    runInBackground() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const [taskId, task] of Object.entries(this.tasks_)) {
                if (!task.schedule)
                    continue;
                logger.info(`Scheduling ${this.taskDisplayString(task.id)}: ${task.schedule}`);
                cron.schedule(task.schedule, () => __awaiter(this, void 0, void 0, function* () {
                    yield this.runTask(Number(taskId), RunType.Scheduled);
                }));
            }
        });
    }
}
exports.default = TaskService;
//# sourceMappingURL=TaskService.js.map