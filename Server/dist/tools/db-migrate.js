"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require('app-module-path').addPath(__dirname + "/..");
var db_1 = require("../app/db");
var config = {
    directory: __dirname + "/../migrations",
    // Disable transactions because the models might open one too
    disableTransactions: true,
};
console.info("Running migrations in: " + config.directory);
db_1.default.migrate.latest(config).then(function (_a) {
    var log = _a[0];
    if (!log.length) {
        console.info('Database is already up to date');
    }
    else {
        console.info("Ran migrations: " + log.join(', '));
    }
    db_1.default.destroy();
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRiLW1pZ3JhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxPQUFPLENBQUksU0FBUyxRQUFLLENBQUMsQ0FBQztBQUV0RCxnQ0FBMkI7QUFFM0IsSUFBTSxNQUFNLEdBQUc7SUFDZCxTQUFTLEVBQUssU0FBUyxtQkFBZ0I7SUFDdkMsNkRBQTZEO0lBQzdELG1CQUFtQixFQUFFLElBQUk7Q0FDekIsQ0FBQztBQUVGLE9BQU8sQ0FBQyxJQUFJLENBQUMsNEJBQTBCLE1BQU0sQ0FBQyxTQUFXLENBQUMsQ0FBQztBQUUzRCxZQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxFQUFLO1FBQUosV0FBRztJQUNuQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRTtRQUNoQixPQUFPLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLENBQUM7S0FDL0M7U0FBTTtRQUNOLE9BQU8sQ0FBQyxJQUFJLENBQUMscUJBQW1CLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFHLENBQUMsQ0FBQztLQUNsRDtJQUVELFlBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUNkLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6ImRiLW1pZ3JhdGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJyZXF1aXJlKCdhcHAtbW9kdWxlLXBhdGgnKS5hZGRQYXRoKGAke19fZGlybmFtZX0vLi5gKTtcblxuaW1wb3J0IGRiIGZyb20gJy4uL2FwcC9kYic7XG5cbmNvbnN0IGNvbmZpZyA9IHtcblx0ZGlyZWN0b3J5OiBgJHtfX2Rpcm5hbWV9Ly4uL21pZ3JhdGlvbnNgLFxuXHQvLyBEaXNhYmxlIHRyYW5zYWN0aW9ucyBiZWNhdXNlIHRoZSBtb2RlbHMgbWlnaHQgb3BlbiBvbmUgdG9vXG5cdGRpc2FibGVUcmFuc2FjdGlvbnM6IHRydWUsXG59O1xuXG5jb25zb2xlLmluZm8oYFJ1bm5pbmcgbWlncmF0aW9ucyBpbjogJHtjb25maWcuZGlyZWN0b3J5fWApO1xuXG5kYi5taWdyYXRlLmxhdGVzdChjb25maWcpLnRoZW4oKFtsb2ddKSA9PiB7XG5cdGlmICghbG9nLmxlbmd0aCkge1xuXHRcdGNvbnNvbGUuaW5mbygnRGF0YWJhc2UgaXMgYWxyZWFkeSB1cCB0byBkYXRlJyk7XG5cdH0gZWxzZSB7XG5cdFx0Y29uc29sZS5pbmZvKGBSYW4gbWlncmF0aW9uczogJHtsb2cuam9pbignLCAnKX1gKTtcblx0fVxuXG5cdGRiLmRlc3Ryb3koKTtcbn0pO1xuIl19
