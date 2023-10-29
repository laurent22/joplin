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
const api_1 = require("api");
api_1.default.plugins.register({
    onStart: function () {
        return __awaiter(this, void 0, void 0, function* () {
            api_1.default.workspace.onNoteAlarmTrigger((event) => __awaiter(this, void 0, void 0, function* () {
                const note = yield api_1.default.data.get(['notes', event.noteId]);
                console.info('Alarm was triggered for note: ', note);
            }));
            api_1.default.workspace.onSyncStart((event) => __awaiter(this, void 0, void 0, function* () {
                console.info('Sync has started...');
            }));
            api_1.default.workspace.onSyncComplete((event) => __awaiter(this, void 0, void 0, function* () {
                console.info('Sync has completed');
                console.info('With errors:', event.withErrors);
            }));
        });
    },
});
//# sourceMappingURL=index.js.map