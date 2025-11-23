"use strict";
// The sync debug log can be used to view from a single file a sequence of sync
// related events. In particular, it logs notes and folders being saved, and the
// relevant sync operations. Enable it in app.ts
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = require("@joplin/utils/Logger");
const syncDebugLog = new Logger_1.default();
exports.default = syncDebugLog;
