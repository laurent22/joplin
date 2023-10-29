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
exports.userIp = exports.isAdminRequest = exports.isApiRequest = exports.contextSessionId = exports.headerSessionId = exports.ownerRequired = exports.bodyFields = exports.formParse = void 0;
const cookies_1 = require("./cookies");
const errors_1 = require("./errors");
const formidable = require('formidable').default;
// Previously Formidable would return the files and fields as key/value pairs.
// With v3, the value however is always an array. This is unclear why they did
// this but for example a field `email=test@example.com` would come out as
// `email: ['test@example.com']`. Since all our code expect simple key/value
// pairs, we use this function to convert back to the old style.
//
// For the extra challenge, they made this change only if the content-type is
// "application/x-www-form-urlencoded". Other content types such as JSON are not
// modified.
const convertFieldsToKeyValue = (fields) => {
    const convertedFields = {};
    for (const [k, v] of Object.entries(fields)) {
        if (Array.isArray(v)) {
            convertedFields[k] = v.length ? v[0] : undefined;
        }
        else {
            convertedFields[k] = v;
        }
    }
    return convertedFields;
};
// Input should be Koa ctx.req, which corresponds to the native Node request
function formParse(request) {
    return __awaiter(this, void 0, void 0, function* () {
        const req = request;
        // It's not clear how to get mocked requests to be parsed successfully by
        // formidable so we use this small hack. If it's mocked, we are running test
        // units and the request body is already an object and can be returned.
        if (req.__isMocked) {
            const output = {};
            if (req.files)
                output.files = req.files;
            output.fields = req.body || {};
            return output;
        }
        if (req.__parsed)
            return req.__parsed;
        const isFormContentType = req.headers['content-type'] === 'application/x-www-form-urlencoded';
        // Note that for Formidable to work, the content-type must be set in the
        // headers
        // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
        return new Promise((resolve, reject) => {
            const form = formidable({ multiples: true });
            form.parse(req, (error, fields, files) => {
                if (error) {
                    reject(error);
                    return;
                }
                // Formidable seems to be doing some black magic and once a request
                // has been parsed it cannot be parsed again. Doing so will do
                // nothing, the code will just end there, or maybe wait
                // indefinitely. So we cache the result on success and return it if
                // some code somewhere tries again to parse the form.
                req.__parsed = {
                    fields: isFormContentType ? convertFieldsToKeyValue(fields) : fields,
                    files: convertFieldsToKeyValue(files),
                };
                resolve(req.__parsed);
            });
        });
    });
}
exports.formParse = formParse;
function bodyFields(req /* , filter:string[] = null*/) {
    return __awaiter(this, void 0, void 0, function* () {
        const form = yield formParse(req);
        return form.fields;
    });
}
exports.bodyFields = bodyFields;
function ownerRequired(ctx) {
    if (!ctx.joplin.owner)
        throw new errors_1.ErrorForbidden();
}
exports.ownerRequired = ownerRequired;
function headerSessionId(headers) {
    return headers['x-api-auth'] ? headers['x-api-auth'] : '';
}
exports.headerSessionId = headerSessionId;
function contextSessionId(ctx, throwIfNotFound = true) {
    if (ctx.headers['x-api-auth'])
        return ctx.headers['x-api-auth'];
    const id = (0, cookies_1.cookieGet)(ctx, 'sessionId');
    if (!id && throwIfNotFound)
        throw new errors_1.ErrorForbidden('Invalid or missing session');
    return id;
}
exports.contextSessionId = contextSessionId;
function isApiRequest(ctx) {
    return ctx.path.indexOf('/api/') === 0;
}
exports.isApiRequest = isApiRequest;
function isAdminRequest(ctx) {
    return ctx.path.indexOf('/admin/') === 0;
}
exports.isAdminRequest = isAdminRequest;
function userIp(ctx) {
    if (ctx.headers['x-real-ip'])
        return ctx.headers['x-real-ip'];
    return ctx.ip;
}
exports.userIp = userIp;
//# sourceMappingURL=requestUtils.js.map