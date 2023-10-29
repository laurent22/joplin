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
const config_1 = require("../config");
const errors_1 = require("../utils/errors");
const testUtils_1 = require("../utils/testing/testUtils");
const types_1 = require("../utils/types");
const types_2 = require("./database/types");
const TaskService_1 = require("./TaskService");
const newService = () => {
    return new TaskService_1.default(types_1.Env.Dev, (0, testUtils_1.models)(), (0, config_1.default)(), {
        email: null,
        mustache: null,
        tasks: null,
        userDeletion: null,
    });
};
const createDemoTasks = () => {
    return [
        {
            id: types_2.TaskId.DeleteExpiredTokens,
            description: '',
            run: (_models) => { },
            schedule: '',
        },
        {
            id: types_2.TaskId.CompressOldChanges,
            description: '',
            run: (_models) => { },
            schedule: '',
        },
    ];
};
describe('TaskService', () => {
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('TaskService');
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should register a task', () => __awaiter(void 0, void 0, void 0, function* () {
        const service = newService();
        const tasks = createDemoTasks();
        yield service.registerTasks(tasks);
        expect(service.tasks[types_2.TaskId.DeleteExpiredTokens]).toBeTruthy();
        expect(service.tasks[types_2.TaskId.CompressOldChanges]).toBeTruthy();
        yield (0, testUtils_1.expectThrow)(() => __awaiter(void 0, void 0, void 0, function* () { return service.registerTask(tasks[0]); }));
    }));
    test('should not run if task is disabled', () => __awaiter(void 0, void 0, void 0, function* () {
        const service = newService();
        let taskHasRan = false;
        const tasks = createDemoTasks();
        tasks[0].run = (_models) => __awaiter(void 0, void 0, void 0, function* () {
            taskHasRan = true;
        }),
            yield service.registerTasks(tasks);
        const taskId = tasks[0].id;
        yield service.runTask(taskId, TaskService_1.RunType.Manual);
        expect(taskHasRan).toBe(true);
        taskHasRan = false;
        yield (0, testUtils_1.models)().taskState().disable(taskId);
        yield service.runTask(taskId, TaskService_1.RunType.Manual);
        expect(taskHasRan).toBe(false);
    }));
    test('should not run if task is already running', () => __awaiter(void 0, void 0, void 0, function* () {
        const service = newService();
        const tasks = createDemoTasks();
        yield service.registerTasks(tasks);
        const task = tasks[0];
        const state = yield (0, testUtils_1.models)().taskState().loadByTaskId(task.id);
        yield (0, testUtils_1.models)().taskState().save({ id: state.id, running: 1 });
        yield (0, testUtils_1.expectThrow)(() => __awaiter(void 0, void 0, void 0, function* () { return service.runTask(task.id, TaskService_1.RunType.Manual); }), errors_1.ErrorCode.TaskAlreadyRunning);
    }));
    test('should reset interrupted tasks', () => __awaiter(void 0, void 0, void 0, function* () {
        const service = newService();
        const tasks = createDemoTasks();
        yield service.registerTasks(tasks);
        const task = tasks[0];
        const state = yield (0, testUtils_1.models)().taskState().loadByTaskId(task.id);
        yield (0, testUtils_1.models)().taskState().save({ id: state.id, running: 1 });
        const stateBefore = yield (0, testUtils_1.models)().taskState().loadByTaskId(task.id);
        yield service.resetInterruptedTasks();
        const stateAfter = yield (0, testUtils_1.models)().taskState().loadByTaskId(task.id);
        expect(stateBefore.running).toBe(1);
        expect(stateAfter.running).toBe(0);
    }));
});
//# sourceMappingURL=TaskService.test.js.map