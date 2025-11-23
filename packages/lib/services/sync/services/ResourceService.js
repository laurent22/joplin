"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const NoteResource_1 = require("../models/NoteResource");
const BaseModel_1 = require("../BaseModel");
const BaseService_1 = require("./BaseService");
const Setting_1 = require("../models/Setting");
const shim_1 = require("../shim");
const ItemChange_1 = require("../models/ItemChange");
const Note_1 = require("../models/Note");
const Resource_1 = require("../models/Resource");
const SearchEngine_1 = require("./search/SearchEngine");
const ItemChangeUtils_1 = require("./ItemChangeUtils");
const time_1 = require("../time");
const eventManager_1 = require("../eventManager");
const PerformanceLogger_1 = require("../PerformanceLogger");
const { sprintf } = require('sprintf-js');
const perfLogger = PerformanceLogger_1.default.create();
class ResourceService extends BaseService_1.default {
    constructor() {
        super(...arguments);
        this.isIndexing_ = false;
        this.maintenanceCalls_ = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.maintenanceTimer1_ = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.maintenanceTimer2_ = null;
    }
    async indexNoteResources() {
        this.logger().info('ResourceService::indexNoteResources: Start');
        if (this.isIndexing_) {
            this.logger().info('ResourceService::indexNoteResources: Already indexing - waiting for it to finish');
            await time_1.default.waitTillCondition(() => !this.isIndexing_);
            return;
        }
        this.isIndexing_ = true;
        const task = perfLogger.taskStart('ResourceService/indexNoteResources');
        try {
            await ItemChange_1.default.waitForAllSaved();
            let foundNoteWithEncryption = false;
            while (true) {
                const changes = await ItemChange_1.default.modelSelectAll(`
					SELECT id, item_id, type
					FROM item_changes
					WHERE item_type = ?
					AND id > ?
					ORDER BY id ASC
					LIMIT 10
					`, [BaseModel_1.default.TYPE_NOTE, Setting_1.default.value('resourceService.lastProcessedChangeId')]);
                if (!changes.length)
                    break;
                const noteIds = changes.map(a => a.item_id);
                const notes = await Note_1.default.modelSelectAll(`SELECT id, title, body, encryption_applied FROM notes WHERE id IN (${Note_1.default.escapeIdsForSql(noteIds)})`);
                const noteById = (noteId) => {
                    for (let i = 0; i < notes.length; i++) {
                        if (notes[i].id === noteId)
                            return notes[i];
                    }
                    // The note may have been deleted since the change was recorded. For example in this case:
                    // - Note created (Some Change object is recorded)
                    // - Note is deleted
                    // - ResourceService indexer runs.
                    // In that case, there will be a change for the note, but the note will be gone.
                    return null;
                };
                for (let i = 0; i < changes.length; i++) {
                    const change = changes[i];
                    if (change.type === ItemChange_1.default.TYPE_CREATE || change.type === ItemChange_1.default.TYPE_UPDATE) {
                        const note = noteById(change.item_id);
                        if (note) {
                            if (note.encryption_applied) {
                                // If we hit an encrypted note, abort processing for now.
                                // Note will eventually get decrypted and processing can resume then.
                                // This is a limitation of the change tracking system - we cannot skip a change
                                // and keep processing the rest since we only keep track of "lastProcessedChangeId".
                                foundNoteWithEncryption = true;
                                break;
                            }
                            await this.setAssociatedResources(note.id, note.body);
                        }
                        else {
                            this.logger().warn(`ResourceService::indexNoteResources: A change was recorded for a note that has been deleted: ${change.item_id}`);
                        }
                    }
                    else if (change.type === ItemChange_1.default.TYPE_DELETE) {
                        await NoteResource_1.default.remove(change.item_id);
                    }
                    else {
                        throw new Error(`Invalid change type: ${change.type}`);
                    }
                    Setting_1.default.setValue('resourceService.lastProcessedChangeId', change.id);
                }
                if (foundNoteWithEncryption)
                    break;
            }
            await Setting_1.default.saveAll();
            await NoteResource_1.default.addOrphanedResources();
            await ItemChangeUtils_1.default.deleteProcessedChanges();
        }
        catch (error) {
            this.logger().error('ResourceService::indexNoteResources:', error);
        }
        this.isIndexing_ = false;
        task.onEnd();
        eventManager_1.default.emit(eventManager_1.EventName.NoteResourceIndexed);
        this.logger().info('ResourceService::indexNoteResources: Completed');
    }
    async setAssociatedResources(noteId, noteBody) {
        const resourceIds = await Note_1.default.linkedResourceIds(noteBody);
        await NoteResource_1.default.setAssociatedResources(noteId, resourceIds);
    }
    async deleteOrphanResources(expiryDelay = null) {
        if (expiryDelay === null)
            expiryDelay = Setting_1.default.value('revisionService.ttlDays') * 24 * 60 * 60 * 1000;
        const task = perfLogger.taskStart('ResourceService/deleteOrphanResources');
        const resourceIds = await NoteResource_1.default.orphanResources(expiryDelay);
        this.logger().info('ResourceService::deleteOrphanResources:', resourceIds);
        for (let i = 0; i < resourceIds.length; i++) {
            const resourceId = resourceIds[i];
            const results = await SearchEngine_1.default.instance().search(resourceId);
            if (results.length) {
                const note = await Note_1.default.load(results[0].id);
                if (note) {
                    this.logger().info(sprintf('ResourceService::deleteOrphanResources: Skipping deletion of resource %s because it is still referenced in note %s. Re-indexing note content to fix the issue.', resourceId, note.id));
                    await this.setAssociatedResources(note.id, note.body);
                }
            }
            else {
                await Resource_1.default.delete(resourceId, { sourceDescription: 'deleteOrphanResources' });
            }
        }
        task.onEnd();
    }
    static async autoSetFileSize(resourceId, filePath, waitTillExists = true) {
        const itDoes = await shim_1.default.fsDriver().waitTillExists(filePath, waitTillExists ? 10000 : 0);
        if (!itDoes) {
            // this.logger().warn('Trying to set file size on non-existent resource:', resourceId, filePath);
            return;
        }
        const fileStat = await shim_1.default.fsDriver().stat(filePath);
        await Resource_1.default.setFileSizeOnly(resourceId, fileStat.size);
    }
    static async autoSetFileSizes() {
        const resources = await Resource_1.default.needFileSizeSet();
        for (const r of resources) {
            await this.autoSetFileSize(r.id, Resource_1.default.fullPath(r), false);
        }
    }
    async maintenance() {
        this.maintenanceCalls_.push(true);
        try {
            await this.indexNoteResources();
            await this.deleteOrphanResources();
        }
        finally {
            this.maintenanceCalls_.pop();
        }
    }
    static runInBackground() {
        if (this.isRunningInBackground_)
            return;
        this.isRunningInBackground_ = true;
        const service = this.instance();
        service.maintenanceTimer1_ = shim_1.default.setTimeout(() => {
            void service.maintenance();
        }, 1000 * 30);
        service.maintenanceTimer2_ = shim_1.default.setInterval(() => {
            void service.maintenance();
        }, 1000 * 60 * 60 * 4);
    }
    async cancelTimers() {
        if (this.maintenanceTimer1_) {
            shim_1.default.clearTimeout(this.maintenanceTimer1_);
            this.maintenanceTimer1_ = null;
        }
        if (this.maintenanceTimer2_) {
            shim_1.default.clearInterval(this.maintenanceTimer2_);
            this.maintenanceTimer2_ = null;
        }
        return new Promise((resolve) => {
            const iid = shim_1.default.setInterval(() => {
                if (!this.maintenanceCalls_.length) {
                    shim_1.default.clearInterval(iid);
                    resolve(null);
                }
            }, 100);
        });
    }
    static instance() {
        if (this.instance_)
            return this.instance_;
        this.instance_ = new ResourceService();
        return this.instance_;
    }
}
ResourceService.isRunningInBackground_ = false;
ResourceService.instance_ = null;
exports.default = ResourceService;
