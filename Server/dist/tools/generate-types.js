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
var sql_ts_1 = require("@rmp135/sql-ts");
var dbFilePath = __dirname + "/../../app/db.ts";
var config = {
    'dialect': 'sqlite3',
    'connection': {
        'filename': './db-buildTypes.sqlite',
    },
    'useNullAsDefault': true,
    'excludedTables': ['knex_migrations', 'knex_migrations_lock', 'android_metadata'],
    'interfaceNameFormat': 'PascalCaseSingular',
    'filename': './app/db',
    'fileReplaceWithinMarker': '// AUTO-GENERATED-TYPES',
    'extends': {
        'main.sessions': 'WithDates, WithUuid',
        'main.users': 'WithDates, WithUuid',
        'main.permissions': 'WithDates, WithUuid',
        'main.files': 'WithDates, WithUuid',
    },
};
function insertContentIntoFile(filePath, markerOpen, markerClose, contentToInsert) {
    var fs = require('fs');
    if (!fs.existsSync(filePath))
        throw new Error("File not found: " + filePath);
    var content = fs.readFileSync(filePath, 'utf-8');
    // [^]* matches any character including new lines
    var regex = new RegExp(markerOpen + "[^]*?" + markerClose);
    if (!content.match(regex))
        throw new Error("Could not find markers: " + markerOpen);
    content = content.replace(regex, markerOpen + "\n" + contentToInsert + "\n" + markerClose);
    fs.writeFileSync(filePath, content);
}
// To output:
//
// export interface User extends WithDates, WithUuid {
// 	email?: string
// 	password?: string
// 	is_admin?: number
// }
function createTypeString(table) {
    var colStrings = [];
    for (var _i = 0, _a = table.columns; _i < _a.length; _i++) {
        var col = _a[_i];
        var name_1 = col.propertyName;
        var type = col.propertyType;
        if (table.extends.indexOf('WithDates') >= 0) {
            if (['created_time', 'updated_time'].includes(name_1))
                continue;
        }
        if (table.extends.indexOf('WithUuid') >= 0) {
            if (['id'].includes(name_1))
                continue;
        }
        if (name_1 === 'item_type')
            type = 'ItemType';
        if (table.name === 'files' && name_1 === 'content')
            type = 'Buffer';
        colStrings.push("\t" + name_1 + "?: " + type);
    }
    var header = ['export interface'];
    header.push(table.interfaceName);
    if (table.extends)
        header.push("extends " + table.extends);
    return header.join(' ') + " {\n" + colStrings.join('\n') + "\n}";
}
// To output:
//
// export const databaseSchema:DatabaseTables = {
// 	users: {
// 		id: { type: "string" },
// 		email: { type: "string" },
// 		password: { type: "string" },
// 		is_admin: { type: "number" },
// 		updated_time: { type: "number" },
// 		created_time: { type: "number" },
// 	},
// }
function createRuntimeObject(table) {
    var colStrings = [];
    for (var _i = 0, _a = table.columns; _i < _a.length; _i++) {
        var col = _a[_i];
        var name_2 = col.propertyName;
        var type = col.propertyType;
        colStrings.push("\t\t" + name_2 + ": { type: '" + type + "' },");
    }
    return "\t" + table.name + ": {\n" + colStrings.join('\n') + "\n\t},";
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var definitions, typeStrings, _i, _a, table, tableStrings, _b, _c, table, content;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, sql_ts_1.default.toObject(config)];
                case 1:
                    definitions = _d.sent();
                    typeStrings = [];
                    for (_i = 0, _a = definitions.tables; _i < _a.length; _i++) {
                        table = _a[_i];
                        typeStrings.push(createTypeString(table));
                    }
                    tableStrings = [];
                    for (_b = 0, _c = definitions.tables; _b < _c.length; _b++) {
                        table = _c[_b];
                        tableStrings.push(createRuntimeObject(table));
                    }
                    content = "// Auto-generated using `npm run generate-types`\n" + typeStrings.join('\n\n');
                    content += '\n\n';
                    content += "export const databaseSchema:DatabaseTables = {\n" + tableStrings.join('\n') + "\n}";
                    insertContentIntoFile(dbFilePath, config.fileReplaceWithinMarker, config.fileReplaceWithinMarker, content);
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.error('Fatal error', error);
    process.exit(1);
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,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SyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBQTs7b0JBQTFDLFdBQVcsR0FBRyxTQUE0QjtvQkFFMUMsV0FBVyxHQUFHLEVBQUUsQ0FBQztvQkFDdkIsV0FBc0MsRUFBbEIsS0FBQSxXQUFXLENBQUMsTUFBTSxFQUFsQixjQUFrQixFQUFsQixJQUFrQixFQUFFO3dCQUE3QixLQUFLO3dCQUNmLFdBQVcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztxQkFDMUM7b0JBRUssWUFBWSxHQUFHLEVBQUUsQ0FBQztvQkFDeEIsV0FBc0MsRUFBbEIsS0FBQSxXQUFXLENBQUMsTUFBTSxFQUFsQixjQUFrQixFQUFsQixJQUFrQixFQUFFO3dCQUE3QixLQUFLO3dCQUNmLFlBQVksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztxQkFDOUM7b0JBRUcsT0FBTyxHQUFHLHVEQUF1RCxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBRyxDQUFDO29CQUNoRyxPQUFPLElBQUksTUFBTSxDQUFDO29CQUNsQixPQUFPLElBQUkscURBQW1ELFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQUssQ0FBQztvQkFFM0YscUJBQXFCLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRSxNQUFNLENBQUMsdUJBQXVCLEVBQUUsT0FBTyxDQUFDLENBQUM7Ozs7O0NBQzNHO0FBRUQsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLFVBQUEsS0FBSztJQUNqQixPQUFPLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNwQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlLXR5cGVzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHNxbHRzIGZyb20gJ0BybXAxMzUvc3FsLXRzJztcblxuY29uc3QgZGJGaWxlUGF0aDpzdHJpbmcgPSBgJHtfX2Rpcm5hbWV9Ly4uLy4uL2FwcC9kYi50c2A7XG5cbmNvbnN0IGNvbmZpZyA9IHtcblx0J2RpYWxlY3QnOidzcWxpdGUzJyxcblx0J2Nvbm5lY3Rpb24nOiB7XG5cdFx0J2ZpbGVuYW1lJzogJy4vZGItYnVpbGRUeXBlcy5zcWxpdGUnLFxuXHR9LFxuXHQndXNlTnVsbEFzRGVmYXVsdCc6IHRydWUsXG5cdCdleGNsdWRlZFRhYmxlcyc6IFsna25leF9taWdyYXRpb25zJywgJ2tuZXhfbWlncmF0aW9uc19sb2NrJywgJ2FuZHJvaWRfbWV0YWRhdGEnXSxcblx0J2ludGVyZmFjZU5hbWVGb3JtYXQnOiAnUGFzY2FsQ2FzZVNpbmd1bGFyJyxcblx0J2ZpbGVuYW1lJzogJy4vYXBwL2RiJyxcblx0J2ZpbGVSZXBsYWNlV2l0aGluTWFya2VyJzogJy8vIEFVVE8tR0VORVJBVEVELVRZUEVTJyxcblx0J2V4dGVuZHMnOiB7XG5cdFx0J21haW4uc2Vzc2lvbnMnOiAnV2l0aERhdGVzLCBXaXRoVXVpZCcsXG5cdFx0J21haW4udXNlcnMnOiAnV2l0aERhdGVzLCBXaXRoVXVpZCcsXG5cdFx0J21haW4ucGVybWlzc2lvbnMnOiAnV2l0aERhdGVzLCBXaXRoVXVpZCcsXG5cdFx0J21haW4uZmlsZXMnOiAnV2l0aERhdGVzLCBXaXRoVXVpZCcsXG5cdH0sXG59O1xuXG5mdW5jdGlvbiBpbnNlcnRDb250ZW50SW50b0ZpbGUoZmlsZVBhdGg6c3RyaW5nLCBtYXJrZXJPcGVuOnN0cmluZywgbWFya2VyQ2xvc2U6c3RyaW5nLCBjb250ZW50VG9JbnNlcnQ6c3RyaW5nKTp2b2lkIHtcblx0Y29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuXHRpZiAoIWZzLmV4aXN0c1N5bmMoZmlsZVBhdGgpKSB0aHJvdyBuZXcgRXJyb3IoYEZpbGUgbm90IGZvdW5kOiAke2ZpbGVQYXRofWApO1xuXHRsZXQgY29udGVudDpzdHJpbmcgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGYtOCcpO1xuXHQvLyBbXl0qIG1hdGNoZXMgYW55IGNoYXJhY3RlciBpbmNsdWRpbmcgbmV3IGxpbmVzXG5cdGNvbnN0IHJlZ2V4OlJlZ0V4cCA9IG5ldyBSZWdFeHAoYCR7bWFya2VyT3Blbn1bXl0qPyR7bWFya2VyQ2xvc2V9YCk7XG5cdGlmICghY29udGVudC5tYXRjaChyZWdleCkpIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgbWFya2VyczogJHttYXJrZXJPcGVufWApO1xuXHRjb250ZW50ID0gY29udGVudC5yZXBsYWNlKHJlZ2V4LCBgJHttYXJrZXJPcGVufVxcbiR7Y29udGVudFRvSW5zZXJ0fVxcbiR7bWFya2VyQ2xvc2V9YCk7XG5cdGZzLndyaXRlRmlsZVN5bmMoZmlsZVBhdGgsIGNvbnRlbnQpO1xufVxuXG4vLyBUbyBvdXRwdXQ6XG4vL1xuLy8gZXhwb3J0IGludGVyZmFjZSBVc2VyIGV4dGVuZHMgV2l0aERhdGVzLCBXaXRoVXVpZCB7XG4vLyBcdGVtYWlsPzogc3RyaW5nXG4vLyBcdHBhc3N3b3JkPzogc3RyaW5nXG4vLyBcdGlzX2FkbWluPzogbnVtYmVyXG4vLyB9XG5mdW5jdGlvbiBjcmVhdGVUeXBlU3RyaW5nKHRhYmxlOmFueSkge1xuXHRjb25zdCBjb2xTdHJpbmdzID0gW107XG5cdGZvciAoY29uc3QgY29sIG9mIHRhYmxlLmNvbHVtbnMpIHtcblx0XHRsZXQgbmFtZSA9IGNvbC5wcm9wZXJ0eU5hbWU7XG5cdFx0bGV0IHR5cGUgPSBjb2wucHJvcGVydHlUeXBlO1xuXG5cdFx0aWYgKHRhYmxlLmV4dGVuZHMuaW5kZXhPZignV2l0aERhdGVzJykgPj0gMCkge1xuXHRcdFx0aWYgKFsnY3JlYXRlZF90aW1lJywgJ3VwZGF0ZWRfdGltZSddLmluY2x1ZGVzKG5hbWUpKSBjb250aW51ZTtcblx0XHR9XG5cblx0XHRpZiAodGFibGUuZXh0ZW5kcy5pbmRleE9mKCdXaXRoVXVpZCcpID49IDApIHtcblx0XHRcdGlmIChbJ2lkJ10uaW5jbHVkZXMobmFtZSkpIGNvbnRpbnVlO1xuXHRcdH1cblxuXHRcdGlmIChuYW1lID09PSAnaXRlbV90eXBlJykgdHlwZSA9ICdJdGVtVHlwZSc7XG5cdFx0aWYgKHRhYmxlLm5hbWUgPT09ICdmaWxlcycgJiYgbmFtZSA9PT0gJ2NvbnRlbnQnKSB0eXBlID0gJ0J1ZmZlcic7XG5cblx0XHRjb2xTdHJpbmdzLnB1c2goYFxcdCR7bmFtZX0/OiAke3R5cGV9YCk7XG5cdH1cblxuXHRjb25zdCBoZWFkZXIgPSBbJ2V4cG9ydCBpbnRlcmZhY2UnXTtcblx0aGVhZGVyLnB1c2godGFibGUuaW50ZXJmYWNlTmFtZSk7XG5cdGlmICh0YWJsZS5leHRlbmRzKSBoZWFkZXIucHVzaChgZXh0ZW5kcyAke3RhYmxlLmV4dGVuZHN9YCk7XG5cblx0cmV0dXJuIGAke2hlYWRlci5qb2luKCcgJyl9IHtcXG4ke2NvbFN0cmluZ3Muam9pbignXFxuJyl9XFxufWA7XG59XG5cbi8vIFRvIG91dHB1dDpcbi8vXG4vLyBleHBvcnQgY29uc3QgZGF0YWJhc2VTY2hlbWE6RGF0YWJhc2VUYWJsZXMgPSB7XG4vLyBcdHVzZXJzOiB7XG4vLyBcdFx0aWQ6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxuLy8gXHRcdGVtYWlsOiB7IHR5cGU6IFwic3RyaW5nXCIgfSxcbi8vIFx0XHRwYXNzd29yZDogeyB0eXBlOiBcInN0cmluZ1wiIH0sXG4vLyBcdFx0aXNfYWRtaW46IHsgdHlwZTogXCJudW1iZXJcIiB9LFxuLy8gXHRcdHVwZGF0ZWRfdGltZTogeyB0eXBlOiBcIm51bWJlclwiIH0sXG4vLyBcdFx0Y3JlYXRlZF90aW1lOiB7IHR5cGU6IFwibnVtYmVyXCIgfSxcbi8vIFx0fSxcbi8vIH1cbmZ1bmN0aW9uIGNyZWF0ZVJ1bnRpbWVPYmplY3QodGFibGU6YW55KSB7XG5cdGNvbnN0IGNvbFN0cmluZ3MgPSBbXTtcblx0Zm9yIChjb25zdCBjb2wgb2YgdGFibGUuY29sdW1ucykge1xuXHRcdGxldCBuYW1lID0gY29sLnByb3BlcnR5TmFtZTtcblx0XHRsZXQgdHlwZSA9IGNvbC5wcm9wZXJ0eVR5cGU7XG5cdFx0Y29sU3RyaW5ncy5wdXNoKGBcXHRcXHQke25hbWV9OiB7IHR5cGU6ICcke3R5cGV9JyB9LGApO1xuXHR9XG5cblx0cmV0dXJuIGBcXHQke3RhYmxlLm5hbWV9OiB7XFxuJHtjb2xTdHJpbmdzLmpvaW4oJ1xcbicpfVxcblxcdH0sYDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbWFpbigpIHtcblx0Y29uc3QgZGVmaW5pdGlvbnMgPSBhd2FpdCBzcWx0cy50b09iamVjdChjb25maWcpO1xuXG5cdGNvbnN0IHR5cGVTdHJpbmdzID0gW107XG5cdGZvciAoY29uc3QgdGFibGUgb2YgZGVmaW5pdGlvbnMudGFibGVzKSB7XG5cdFx0dHlwZVN0cmluZ3MucHVzaChjcmVhdGVUeXBlU3RyaW5nKHRhYmxlKSk7XG5cdH1cblxuXHRjb25zdCB0YWJsZVN0cmluZ3MgPSBbXTtcblx0Zm9yIChjb25zdCB0YWJsZSBvZiBkZWZpbml0aW9ucy50YWJsZXMpIHtcblx0XHR0YWJsZVN0cmluZ3MucHVzaChjcmVhdGVSdW50aW1lT2JqZWN0KHRhYmxlKSk7XG5cdH1cblxuXHRsZXQgY29udGVudCA9IGAvLyBBdXRvLWdlbmVyYXRlZCB1c2luZyBcXGBucG0gcnVuIGdlbmVyYXRlLXR5cGVzXFxgXFxuJHt0eXBlU3RyaW5ncy5qb2luKCdcXG5cXG4nKX1gO1xuXHRjb250ZW50ICs9ICdcXG5cXG4nO1xuXHRjb250ZW50ICs9IGBleHBvcnQgY29uc3QgZGF0YWJhc2VTY2hlbWE6RGF0YWJhc2VUYWJsZXMgPSB7XFxuJHt0YWJsZVN0cmluZ3Muam9pbignXFxuJyl9XFxufWA7XG5cblx0aW5zZXJ0Q29udGVudEludG9GaWxlKGRiRmlsZVBhdGgsIGNvbmZpZy5maWxlUmVwbGFjZVdpdGhpbk1hcmtlciwgY29uZmlnLmZpbGVSZXBsYWNlV2l0aGluTWFya2VyLCBjb250ZW50KTtcbn1cblxubWFpbigpLmNhdGNoKGVycm9yID0+IHtcblx0Y29uc29sZS5lcnJvcignRmF0YWwgZXJyb3InLCBlcnJvcik7XG5cdHByb2Nlc3MuZXhpdCgxKTtcbn0pO1xuIl19
