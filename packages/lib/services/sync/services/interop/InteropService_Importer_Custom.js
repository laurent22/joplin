"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const InteropService_Importer_Base_1 = require("./InteropService_Importer_Base");
class InteropService_Importer_Custom extends InteropService_Importer_Base_1.default {
    constructor(handler) {
        super();
        this.module_ = null;
        this.module_ = handler;
    }
    async exec(result) {
        // When passing the options to the plugin, we strip off any function
        // because they won't serialized over ipc.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const processedOptions = {};
        if (this.options_) {
            for (const [k, v] of Object.entries(this.options_)) {
                if (typeof v === 'function')
                    continue;
                processedOptions[k] = v;
            }
        }
        await this.module_.onExec({
            sourcePath: this.sourcePath_,
            options: processedOptions,
            warnings: result.warnings,
        });
        return result;
    }
}
exports.default = InteropService_Importer_Custom;
