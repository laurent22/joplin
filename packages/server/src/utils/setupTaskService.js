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
const types_1 = require("../services/database/types");
const TaskService_1 = require("../services/TaskService");
function default_1(env, models, config, services) {
    return __awaiter(this, void 0, void 0, function* () {
        const taskService = new TaskService_1.default(env, models, config, services);
        let tasks = [
            {
                id: types_1.TaskId.DeleteExpiredTokens,
                description: (0, TaskService_1.taskIdToLabel)(types_1.TaskId.DeleteExpiredTokens),
                schedule: '0 */6 * * *',
                run: (models) => models.token().deleteExpiredTokens(),
            },
            {
                id: types_1.TaskId.UpdateTotalSizes,
                description: (0, TaskService_1.taskIdToLabel)(types_1.TaskId.UpdateTotalSizes),
                schedule: '0 * * * *',
                run: (models) => models.item().updateTotalSizes(),
            },
            {
                id: types_1.TaskId.CompressOldChanges,
                description: (0, TaskService_1.taskIdToLabel)(types_1.TaskId.CompressOldChanges),
                schedule: '0 0 */2 * *',
                run: (models) => models.change().compressOldChanges(),
            },
            {
                id: types_1.TaskId.ProcessUserDeletions,
                description: (0, TaskService_1.taskIdToLabel)(types_1.TaskId.ProcessUserDeletions),
                schedule: '10 * * * *',
                run: (_models, services) => services.userDeletion.runMaintenance(),
            },
            // Need to do it relatively frequently so that if the user fixes
            // whatever was causing the oversized account, they can get it
            // re-enabled quickly. Also it's done on minute 30 because it depends on
            // the UpdateTotalSizes task being run.
            {
                id: types_1.TaskId.HandleOversizedAccounts,
                description: (0, TaskService_1.taskIdToLabel)(types_1.TaskId.HandleOversizedAccounts),
                schedule: '30 */2 * * *',
                run: (models) => models.user().handleOversizedAccounts(),
            },
            {
                id: types_1.TaskId.DeleteExpiredSessions,
                description: (0, TaskService_1.taskIdToLabel)(types_1.TaskId.DeleteExpiredSessions),
                schedule: '0 */6 * * *',
                run: (models) => models.session().deleteExpiredSessions(),
            },
        ];
        if (config.USER_DATA_AUTO_DELETE_ENABLED) {
            tasks.push({
                id: types_1.TaskId.AutoAddDisabledAccountsForDeletion,
                description: (0, TaskService_1.taskIdToLabel)(types_1.TaskId.AutoAddDisabledAccountsForDeletion),
                schedule: '0 14 * * *',
                run: (_models, services) => services.userDeletion.autoAddForDeletion(),
            });
        }
        if (config.isJoplinCloud) {
            tasks = tasks.concat([
                {
                    id: types_1.TaskId.HandleBetaUserEmails,
                    description: (0, TaskService_1.taskIdToLabel)(types_1.TaskId.HandleBetaUserEmails),
                    schedule: '0 12 * * *',
                    run: (models) => models.user().handleBetaUserEmails(),
                },
                {
                    id: types_1.TaskId.HandleFailedPaymentSubscriptions,
                    description: (0, TaskService_1.taskIdToLabel)(types_1.TaskId.HandleFailedPaymentSubscriptions),
                    schedule: '0 13 * * *',
                    run: (models) => models.user().handleFailedPaymentSubscriptions(),
                },
            ]);
        }
        yield taskService.registerTasks(tasks);
        return taskService;
    });
}
exports.default = default_1;
//# sourceMappingURL=setupTaskService.js.map