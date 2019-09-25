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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var UserModel_1 = require("../app/models/UserModel");
function up(knex) {
    return __awaiter(this, void 0, void 0, function () {
        var userModel;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, knex.schema.createTable('users', function (table) {
                        table.string('id', 32).unique().primary().notNullable();
                        table.text('email', 'mediumtext').unique().notNullable();
                        table.text('password', 'mediumtext').notNullable();
                        table.integer('is_admin').defaultTo(0).notNullable();
                        table.integer('updated_time').notNullable();
                        table.integer('created_time').notNullable();
                    })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, knex.schema.createTable('sessions', function (table) {
                            table.string('id', 32).unique().primary().notNullable();
                            table.string('user_id', 32).notNullable();
                            table.integer('updated_time').notNullable();
                            table.integer('created_time').notNullable();
                        })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, knex.schema.createTable('permissions', function (table) {
                            table.string('id', 32).unique().primary().notNullable();
                            table.string('user_id', 32).notNullable();
                            table.integer('item_type').notNullable();
                            table.string('item_id', 32).notNullable();
                            table.integer('is_owner').defaultTo(0).notNullable();
                            table.integer('can_read').defaultTo(0).notNullable();
                            table.integer('can_write').defaultTo(0).notNullable();
                            table.integer('updated_time').notNullable();
                            table.integer('created_time').notNullable();
                        })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, knex.schema.alterTable('permissions', function (table) {
                            table.unique(['user_id', 'item_type', 'item_id']);
                        })];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, knex.schema.createTable('files', function (table) {
                            table.string('id', 32).unique().primary().notNullable();
                            table.text('name').notNullable();
                            table.binary('content').defaultTo('').notNullable();
                            table.string('mime_type', 128).defaultTo('application/octet-stream').notNullable();
                            table.integer('size').defaultTo(0).notNullable();
                            table.integer('is_directory').defaultTo(0).notNullable();
                            table.integer('is_root').defaultTo(0).notNullable();
                            table.string('parent_id', 32).defaultTo('').notNullable();
                            table.integer('updated_time').notNullable();
                            table.integer('created_time').notNullable();
                        })];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, knex.schema.alterTable('files', function (table) {
                            table.unique(['parent_id', 'name']);
                        })];
                case 6:
                    _a.sent();
                    userModel = new UserModel_1.default();
                    // We skip validation because at this point there's no user in the system so
                    // there can't be an owner for that first user.
                    return [4 /*yield*/, userModel.save({
                            email: 'admin@localhost',
                            password: 'admin',
                            is_admin: 1,
                        }, { skipValidation: true })];
                case 7:
                    // We skip validation because at this point there's no user in the system so
                    // there can't be an owner for that first user.
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.up = up;
function down(knex) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, knex.schema.dropTable('users')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, knex.schema.dropTable('sessions')];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, knex.schema.dropTable('permissions')];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, knex.schema.dropTable('files')];
                case 4:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.down = down;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIjIwMTkwOTEzMTcxNDUxX2NyZWF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHFEQUFnRDtBQUVoRCxTQUFzQixFQUFFLENBQUMsSUFBVTs7Ozs7d0JBQ2xDLHFCQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxVQUFTLEtBQTZCO3dCQUM1RSxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQzt3QkFDeEQsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7d0JBQ3pELEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO3dCQUNuRCxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQzt3QkFDckQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQzt3QkFDNUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDN0MsQ0FBQyxDQUFDLEVBQUE7O29CQVBGLFNBT0UsQ0FBQztvQkFFSCxxQkFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsVUFBUyxLQUE2Qjs0QkFDL0UsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7NEJBQ3hELEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEVB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QyxxQkFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBQTs7b0JBQXBDLFNBQW9DLENBQUM7Ozs7O0NBQ3JDO0FBTEQsb0JBS0MiLCJmaWxlIjoiMjAxOTA5MTMxNzE0NTFfY3JlYXRlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgS25leCBmcm9tICdrbmV4JztcbmltcG9ydCBVc2VyTW9kZWwgZnJvbSAnLi4vYXBwL21vZGVscy9Vc2VyTW9kZWwnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXAoa25leDogS25leCk6IFByb21pc2U8YW55PiB7XG5cdGF3YWl0IGtuZXguc2NoZW1hLmNyZWF0ZVRhYmxlKCd1c2VycycsIGZ1bmN0aW9uKHRhYmxlOktuZXguQ3JlYXRlVGFibGVCdWlsZGVyKSB7XG5cdFx0dGFibGUuc3RyaW5nKCdpZCcsIDMyKS51bmlxdWUoKS5wcmltYXJ5KCkubm90TnVsbGFibGUoKTtcblx0XHR0YWJsZS50ZXh0KCdlbWFpbCcsICdtZWRpdW10ZXh0JykudW5pcXVlKCkubm90TnVsbGFibGUoKTtcblx0XHR0YWJsZS50ZXh0KCdwYXNzd29yZCcsICdtZWRpdW10ZXh0Jykubm90TnVsbGFibGUoKTtcblx0XHR0YWJsZS5pbnRlZ2VyKCdpc19hZG1pbicpLmRlZmF1bHRUbygwKS5ub3ROdWxsYWJsZSgpO1xuXHRcdHRhYmxlLmludGVnZXIoJ3VwZGF0ZWRfdGltZScpLm5vdE51bGxhYmxlKCk7XG5cdFx0dGFibGUuaW50ZWdlcignY3JlYXRlZF90aW1lJykubm90TnVsbGFibGUoKTtcblx0fSk7XG5cblx0YXdhaXQga25leC5zY2hlbWEuY3JlYXRlVGFibGUoJ3Nlc3Npb25zJywgZnVuY3Rpb24odGFibGU6S25leC5DcmVhdGVUYWJsZUJ1aWxkZXIpIHtcblx0XHR0YWJsZS5zdHJpbmcoJ2lkJywgMzIpLnVuaXF1ZSgpLnByaW1hcnkoKS5ub3ROdWxsYWJsZSgpO1xuXHRcdHRhYmxlLnN0cmluZygndXNlcl9pZCcsIDMyKS5ub3ROdWxsYWJsZSgpO1xuXHRcdHRhYmxlLmludGVnZXIoJ3VwZGF0ZWRfdGltZScpLm5vdE51bGxhYmxlKCk7XG5cdFx0dGFibGUuaW50ZWdlcignY3JlYXRlZF90aW1lJykubm90TnVsbGFibGUoKTtcblx0fSk7XG5cblx0YXdhaXQga25leC5zY2hlbWEuY3JlYXRlVGFibGUoJ3Blcm1pc3Npb25zJywgZnVuY3Rpb24odGFibGU6S25leC5DcmVhdGVUYWJsZUJ1aWxkZXIpIHtcblx0XHR0YWJsZS5zdHJpbmcoJ2lkJywgMzIpLnVuaXF1ZSgpLnByaW1hcnkoKS5ub3ROdWxsYWJsZSgpO1xuXHRcdHRhYmxlLnN0cmluZygndXNlcl9pZCcsIDMyKS5ub3ROdWxsYWJsZSgpO1xuXHRcdHRhYmxlLmludGVnZXIoJ2l0ZW1fdHlwZScpLm5vdE51bGxhYmxlKCk7XG5cdFx0dGFibGUuc3RyaW5nKCdpdGVtX2lkJywgMzIpLm5vdE51bGxhYmxlKCk7XG5cdFx0dGFibGUuaW50ZWdlcignaXNfb3duZXInKS5kZWZhdWx0VG8oMCkubm90TnVsbGFibGUoKTtcblx0XHR0YWJsZS5pbnRlZ2VyKCdjYW5fcmVhZCcpLmRlZmF1bHRUbygwKS5ub3ROdWxsYWJsZSgpO1xuXHRcdHRhYmxlLmludGVnZXIoJ2Nhbl93cml0ZScpLmRlZmF1bHRUbygwKS5ub3ROdWxsYWJsZSgpO1xuXHRcdHRhYmxlLmludGVnZXIoJ3VwZGF0ZWRfdGltZScpLm5vdE51bGxhYmxlKCk7XG5cdFx0dGFibGUuaW50ZWdlcignY3JlYXRlZF90aW1lJykubm90TnVsbGFibGUoKTtcblx0fSk7XG5cblx0YXdhaXQga25leC5zY2hlbWEuYWx0ZXJUYWJsZSgncGVybWlzc2lvbnMnLCBmdW5jdGlvbih0YWJsZTpLbmV4LkNyZWF0ZVRhYmxlQnVpbGRlcikge1xuXHRcdHRhYmxlLnVuaXF1ZShbJ3VzZXJfaWQnLCAnaXRlbV90eXBlJywgJ2l0ZW1faWQnXSk7XG5cdH0pO1xuXG5cdGF3YWl0IGtuZXguc2NoZW1hLmNyZWF0ZVRhYmxlKCdmaWxlcycsIGZ1bmN0aW9uKHRhYmxlOktuZXguQ3JlYXRlVGFibGVCdWlsZGVyKSB7XG5cdFx0dGFibGUuc3RyaW5nKCdpZCcsIDMyKS51bmlxdWUoKS5wcmltYXJ5KCkubm90TnVsbGFibGUoKTtcblx0XHR0YWJsZS50ZXh0KCduYW1lJykubm90TnVsbGFibGUoKTtcblx0XHR0YWJsZS5iaW5hcnkoJ2NvbnRlbnQnKS5kZWZhdWx0VG8oJycpLm5vdE51bGxhYmxlKCk7XG5cdFx0dGFibGUuc3RyaW5nKCdtaW1lX3R5cGUnLCAxMjgpLmRlZmF1bHRUbygnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJykubm90TnVsbGFibGUoKTtcblx0XHR0YWJsZS5pbnRlZ2VyKCdzaXplJykuZGVmYXVsdFRvKDApLm5vdE51bGxhYmxlKCk7XG5cdFx0dGFibGUuaW50ZWdlcignaXNfZGlyZWN0b3J5JykuZGVmYXVsdFRvKDApLm5vdE51bGxhYmxlKCk7XG5cdFx0dGFibGUuaW50ZWdlcignaXNfcm9vdCcpLmRlZmF1bHRUbygwKS5ub3ROdWxsYWJsZSgpO1xuXHRcdHRhYmxlLnN0cmluZygncGFyZW50X2lkJywgMzIpLmRlZmF1bHRUbygnJykubm90TnVsbGFibGUoKTtcblx0XHR0YWJsZS5pbnRlZ2VyKCd1cGRhdGVkX3RpbWUnKS5ub3ROdWxsYWJsZSgpO1xuXHRcdHRhYmxlLmludGVnZXIoJ2NyZWF0ZWRfdGltZScpLm5vdE51bGxhYmxlKCk7XG5cdH0pO1xuXG5cdGF3YWl0IGtuZXguc2NoZW1hLmFsdGVyVGFibGUoJ2ZpbGVzJywgZnVuY3Rpb24odGFibGU6S25leC5DcmVhdGVUYWJsZUJ1aWxkZXIpIHtcblx0XHR0YWJsZS51bmlxdWUoWydwYXJlbnRfaWQnLCAnbmFtZSddKTtcblx0fSk7XG5cblx0Y29uc3QgdXNlck1vZGVsID0gbmV3IFVzZXJNb2RlbCgpO1xuXG5cdC8vIFdlIHNraXAgdmFsaWRhdGlvbiBiZWNhdXNlIGF0IHRoaXMgcG9pbnQgdGhlcmUncyBubyB1c2VyIGluIHRoZSBzeXN0ZW0gc29cblx0Ly8gdGhlcmUgY2FuJ3QgYmUgYW4gb3duZXIgZm9yIHRoYXQgZmlyc3QgdXNlci5cblx0YXdhaXQgdXNlck1vZGVsLnNhdmUoe1xuXHRcdGVtYWlsOiAnYWRtaW5AbG9jYWxob3N0Jyxcblx0XHRwYXNzd29yZDogJ2FkbWluJyxcblx0XHRpc19hZG1pbjogMSxcblx0fSwgeyBza2lwVmFsaWRhdGlvbjogdHJ1ZX0pO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZG93bihrbmV4OiBLbmV4KTogUHJvbWlzZTxhbnk+IHtcblx0YXdhaXQga25leC5zY2hlbWEuZHJvcFRhYmxlKCd1c2VycycpO1xuXHRhd2FpdCBrbmV4LnNjaGVtYS5kcm9wVGFibGUoJ3Nlc3Npb25zJyk7XG5cdGF3YWl0IGtuZXguc2NoZW1hLmRyb3BUYWJsZSgncGVybWlzc2lvbnMnKTtcblx0YXdhaXQga25leC5zY2hlbWEuZHJvcFRhYmxlKCdmaWxlcycpO1xufVxuXG4iXX0=
