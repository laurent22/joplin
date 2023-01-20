"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteType = exports.HttpMethod = exports.StorageDriverMode = exports.StorageDriverType = exports.DatabaseConfigClient = exports.Env = void 0;
var Env;
(function (Env) {
    Env["Dev"] = "dev";
    Env["Prod"] = "prod";
    Env["BuildTypes"] = "buildTypes";
})(Env = exports.Env || (exports.Env = {}));
var DatabaseConfigClient;
(function (DatabaseConfigClient) {
    DatabaseConfigClient["Null"] = "null";
    DatabaseConfigClient["PostgreSQL"] = "pg";
    DatabaseConfigClient["SQLite"] = "sqlite3";
})(DatabaseConfigClient = exports.DatabaseConfigClient || (exports.DatabaseConfigClient = {}));
var StorageDriverType;
(function (StorageDriverType) {
    StorageDriverType[StorageDriverType["Database"] = 1] = "Database";
    StorageDriverType[StorageDriverType["Filesystem"] = 2] = "Filesystem";
    StorageDriverType[StorageDriverType["Memory"] = 3] = "Memory";
    StorageDriverType[StorageDriverType["S3"] = 4] = "S3";
})(StorageDriverType = exports.StorageDriverType || (exports.StorageDriverType = {}));
// The driver mode is only used by fallback drivers. Regardless of the mode, the
// fallback always work like this:
//
// When reading, first the app checks if the content exists on the main driver.
// If it does it returns this. Otherwise it reads the content from the fallback
// driver.
//
// When writing, the app writes to the main driver. Then the mode determines how
// it writes to the fallback driver:
//
// - In ReadAndClear mode, it's going to clear the fallback driver content. This
//   is used to migrate from one driver to another. It means that over time the
//   old storage will be cleared and all content will be on the new storage.
//
// - In ReadAndWrite mode, it's going to write the content to the fallback
//   driver too. This is purely for safey - it allows deploying the new storage
//   (such as the filesystem or S3) but still keep the old content up-to-date.
//   So if something goes wrong it's possible to go back to the old storage
//   until the new one is working.
var StorageDriverMode;
(function (StorageDriverMode) {
    StorageDriverMode[StorageDriverMode["ReadAndWrite"] = 1] = "ReadAndWrite";
    StorageDriverMode[StorageDriverMode["ReadAndClear"] = 2] = "ReadAndClear";
})(StorageDriverMode = exports.StorageDriverMode || (exports.StorageDriverMode = {}));
var HttpMethod;
(function (HttpMethod) {
    HttpMethod["GET"] = "GET";
    HttpMethod["POST"] = "POST";
    HttpMethod["DELETE"] = "DELETE";
    HttpMethod["PATCH"] = "PATCH";
    HttpMethod["HEAD"] = "HEAD";
})(HttpMethod = exports.HttpMethod || (exports.HttpMethod = {}));
var RouteType;
(function (RouteType) {
    RouteType[RouteType["Web"] = 1] = "Web";
    RouteType[RouteType["Api"] = 2] = "Api";
    RouteType[RouteType["UserContent"] = 3] = "UserContent";
})(RouteType = exports.RouteType || (exports.RouteType = {}));
//# sourceMappingURL=types.js.map