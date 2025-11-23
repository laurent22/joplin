"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const time_1 = require("./time");
const Setting_1 = require("./models/Setting");
const Logger_1 = require("@joplin/utils/Logger");
class TaskQueue {
    constructor(name, logger = null) {
        this.waitingTasks_ = [];
        this.processingTasks_ = {};
        this.processingQueue_ = false;
        this.stopping_ = false;
        this.results_ = {};
        this.concurrency_ = null;
        this.keepTaskResults_ = true;
        this.name_ = name;
        this.logger_ = logger ? logger : new Logger_1.default();
    }
    concurrency() {
        if (this.concurrency_ === null) {
            return Setting_1.default.value('sync.maxConcurrentConnections');
        }
        else {
            return this.concurrency_;
        }
    }
    setConcurrency(v) {
        this.concurrency_ = v;
    }
    get keepTaskResults() {
        return this.keepTaskResults_;
    }
    set keepTaskResults(v) {
        this.keepTaskResults_ = v;
    }
    // Using `push`, an unlimited number of tasks can be pushed, although only
    // up to `concurrency` will run in parallel.
    push(id, callback) {
        if (this.stopping_)
            throw new Error('Cannot push task when queue is stopping');
        this.waitingTasks_.push({
            id: id,
            callback: callback,
        });
        this.processQueue_();
    }
    // Using `push`, only up to `concurrency` tasks can be pushed to the queue.
    // Beyond this, the call will wait until a slot is available.
    async pushAsync(id, callback) {
        await this.waitForOneSlot();
        this.push(id, callback);
    }
    processQueue_() {
        if (this.processingQueue_ || this.stopping_)
            return;
        this.processingQueue_ = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const completeTask = (task, result, error) => {
            delete this.processingTasks_[task.id];
            if (this.keepTaskResults) {
                const r = {
                    id: task.id,
                    result: result,
                };
                if (error)
                    r.error = error;
                this.results_[task.id] = r;
            }
            this.processQueue_();
        };
        while (this.waitingTasks_.length > 0 && Object.keys(this.processingTasks_).length < this.concurrency()) {
            if (this.stopping_)
                break;
            const task = this.waitingTasks_.splice(0, 1)[0];
            this.processingTasks_[task.id] = task;
            // We want to use then/catch here because we don't want to wait for
            // the task to complete, but still want to capture the result.
            task
                .callback()
                // eslint-disable-next-line promise/prefer-await-to-then, @typescript-eslint/no-explicit-any -- Old code before rule was applied
                .then((result) => {
                completeTask(task, result, null);
            })
                // eslint-disable-next-line promise/prefer-await-to-then
                .catch((error) => {
                if (!error)
                    error = new Error('Unknown error');
                completeTask(task, null, error);
            });
        }
        this.processingQueue_ = false;
    }
    isWaiting(taskId) {
        return this.waitingTasks_.find(task => task.id === taskId);
    }
    isProcessing(taskId) {
        return taskId in this.processingTasks_;
    }
    isDone(taskId) {
        return taskId in this.results_;
    }
    async waitForAll() {
        return new Promise((resolve) => {
            const checkIID = setInterval(() => {
                if (this.waitingTasks_.length)
                    return;
                if (Object.keys(this.processingTasks_).length)
                    return;
                clearInterval(checkIID);
                resolve(null);
            }, 100);
        });
    }
    async waitForOneSlot() {
        return new Promise((resolve) => {
            const checkIID = setInterval(() => {
                if (Object.keys(this.processingTasks_).length >= this.concurrency())
                    return;
                clearInterval(checkIID);
                resolve(null);
            }, 100);
        });
    }
    taskExists(taskId) {
        return this.isWaiting(taskId) || this.isProcessing(taskId) || this.isDone(taskId);
    }
    taskResult(taskId) {
        if (!this.taskExists(taskId))
            throw new Error(`No such task: ${taskId}`);
        return this.results_[taskId];
    }
    async waitForResult(taskId) {
        if (!this.taskExists(taskId))
            throw new Error(`No such task: ${taskId}`);
        return new Promise(resolve => {
            const check = () => {
                const result = this.results_[taskId];
                if (result) {
                    resolve(result);
                    return true;
                }
                return false;
            };
            if (check())
                return;
            const checkIID = setInterval(() => {
                if (check())
                    clearInterval(checkIID);
            }, 100);
        });
    }
    async stop() {
        this.stopping_ = true;
        this.logger_.info(`TaskQueue.stop: ${this.name_}: waiting for tasks to complete: ${Object.keys(this.processingTasks_).length}`);
        // In general it's not a big issue if some tasks are still running because
        // it won't call anything unexpected in caller code, since the caller has
        // to explicitly retrieve the results
        const startTime = Date.now();
        while (Object.keys(this.processingTasks_).length) {
            await time_1.default.sleep(0.1);
            if (Date.now() - startTime >= 30000) {
                this.logger_.warn(`TaskQueue.stop: ${this.name_}: timed out waiting for task to complete`);
                break;
            }
        }
        this.logger_.info(`TaskQueue.stop: ${this.name_}: Done, waited for ${Date.now() - startTime}`);
    }
    isStopping() {
        return this.stopping_;
    }
}
exports.default = TaskQueue;
