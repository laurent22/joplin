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
const testUtils_1 = require("./utils/testing/testUtils");
const sql_ts_1 = require("@rmp135/sql-ts");
const db_1 = require("./db");
function dbSchemaSnapshot(db) {
    return __awaiter(this, void 0, void 0, function* () {
        return sql_ts_1.default.toTypeScript({}, db);
    });
}
describe('db', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('db', { autoMigrate: false });
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    it('should allow upgrading and downgrading schema', function () {
        return __awaiter(this, void 0, void 0, function* () {
            // Migrations before that didn't have a down() step.
            const ignoreAllBefore = '20210819165350_user_flags';
            // Some migrations produce no changes visible to sql-ts, in particular
            // when the migration only adds a constraint or an index, or when a
            // default is changed. In this case we skip the migration. Ideally we
            // should test these too but for now that will do.
            const doNoCheckUpgrade = [
                '20211030103016_item_owner_name_unique',
                '20211111134329_storage_index',
                '20220121172409_email_recipient_default',
            ];
            let startProcessing = false;
            while (true) {
                yield (0, db_1.migrateUp)((0, testUtils_1.db)());
                if (!startProcessing) {
                    const next = yield (0, db_1.nextMigration)((0, testUtils_1.db)());
                    if (next === ignoreAllBefore) {
                        startProcessing = true;
                    }
                    else {
                        continue;
                    }
                }
                const next = yield (0, db_1.nextMigration)((0, testUtils_1.db)());
                if (!next)
                    break;
                const initialSchema = yield dbSchemaSnapshot((0, testUtils_1.db)());
                yield (0, db_1.migrateUp)((0, testUtils_1.db)());
                const afterUpgradeSchema = yield dbSchemaSnapshot((0, testUtils_1.db)());
                if (!doNoCheckUpgrade.includes(next)) {
                    expect(initialSchema, `Schema upgrade did not produce a new schema. In migration: ${next}`).not.toEqual(afterUpgradeSchema);
                }
                yield (0, db_1.migrateDown)((0, testUtils_1.db)());
                const afterRollbackSchema = yield dbSchemaSnapshot((0, testUtils_1.db)());
                expect(initialSchema, `Schema rollback did not produce previous schema. In migration: ${next}`).toEqual(afterRollbackSchema);
            }
        });
    });
});
//# sourceMappingURL=db.test.js.map