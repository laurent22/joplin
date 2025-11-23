"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = require("@joplin/utils/Logger");
const shim_1 = require("../../shim");
const Setting_1 = require("../Setting");
const logger = Logger_1.default.create('Settings');
class FileHandler {
    constructor(filePath) {
        this.valueJsonCache_ = null;
        this.parsedJsonCache_ = null;
        this.filePath_ = filePath;
    }
    async load() {
        if (!this.valueJsonCache_) {
            if (!(await shim_1.default.fsDriver().exists(this.filePath_))) {
                this.valueJsonCache_ = '{}';
            }
            else {
                this.valueJsonCache_ = await shim_1.default.fsDriver().readFile(this.filePath_, 'utf8');
            }
            this.parsedJsonCache_ = null;
        }
        if (this.parsedJsonCache_)
            return this.parsedJsonCache_;
        let result;
        try {
            const values = JSON.parse(this.valueJsonCache_);
            delete values['$id'];
            delete values['$schema'];
            result = values;
        }
        catch (error) {
            // Most likely the user entered invalid JSON - in this case we move
            // the broken file to a new name (otherwise it would be overwritten
            // by valid JSON and user will lose all their settings).
            logger.error(`Could not parse JSON file: ${this.filePath_}`, error);
            await shim_1.default.fsDriver().move(this.filePath_, `${this.filePath_}-${Date.now()}-invalid.bak`);
            result = {};
        }
        this.parsedJsonCache_ = result;
        return result;
    }
    async save(values) {
        values = Object.assign({}, values);
        // Merge with existing settings. This prevents settings stored by disabled or not-yet-loaded
        // plugins from being deleted.
        for (const key in this.parsedJsonCache_) {
            const includesSetting = Object.prototype.hasOwnProperty.call(values, key);
            if (!includesSetting) {
                values[key] = this.parsedJsonCache_[key];
            }
        }
        const json = `${JSON.stringify(Object.assign({ '$schema': Setting_1.default.schemaUrl }, values), null, '\t')}\n`;
        if (json === this.valueJsonCache_)
            return;
        await shim_1.default.fsDriver().writeFile(this.filePath_, json, 'utf8');
        this.valueJsonCache_ = json;
    }
}
exports.default = FileHandler;
