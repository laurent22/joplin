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
exports.expectNotThrow = exports.makeResourceSerializedBody = exports.makeFolderSerializedBody = exports.makeNoteSerializedBody = exports.expectNoHttpError = exports.expectHttpError = exports.expectThrow = exports.checkThrowAsync = exports.readCredentialFileSync = exports.credentialFileSync = exports.readCredentialFile = exports.credentialFile = exports.checkContextError = exports.createResource = exports.createFolder = exports.updateFolder = exports.updateNote = exports.createNote = exports.updateItem = exports.createItem = exports.getItem = exports.createItemTree3 = exports.createItemTree = exports.createUser = exports.createUserAndSession = exports.parseHtml = exports.models = exports.db = exports.testAssetDir = exports.koaNext = exports.koaAppContext = exports.msleep = exports.beforeEachDb = exports.afterAllTests = exports.beforeAllDb = exports.makeTempFileWithContent = exports.tempDir = exports.tempDirPath = exports.randomHash = void 0;
const db_1 = require("../../db");
const dbTools_1 = require("../../tools/dbTools");
const factory_1 = require("../../models/factory");
const types_1 = require("../types");
const config_1 = require("../../config");
const Logger_1 = require("@joplin/lib/Logger");
const FakeCookies_1 = require("./koa/FakeCookies");
const FakeRequest_1 = require("./koa/FakeRequest");
const FakeResponse_1 = require("./koa/FakeResponse");
const httpMocks = require("node-mocks-http");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs-extra");
const jsdom = require("jsdom");
const setupAppContext_1 = require("../setupAppContext");
const errors_1 = require("../errors");
const apiUtils_1 = require("./apiUtils");
const BaseModel_1 = require("@joplin/lib/BaseModel");
const joplinUtils_1 = require("../joplinUtils");
const MustacheService_1 = require("../../services/MustacheService");
const uuidgen_1 = require("../uuidgen");
const csrf_1 = require("../csrf");
const cookies_1 = require("../cookies");
const env_1 = require("../../env");
const url_1 = require("url");
// Takes into account the fact that this file will be inside the /dist directory
// when it runs.
const packageRootDir = path.dirname(path.dirname(path.dirname(__dirname)));
let db_ = null;
// require('source-map-support').install();
function randomHash() {
    return crypto.createHash('md5').update(`${Date.now()}-${Math.random()}`).digest('hex');
}
exports.randomHash = randomHash;
function tempDirPath() {
    return `${packageRootDir}/temp/${randomHash()}`;
}
exports.tempDirPath = tempDirPath;
let tempDir_ = null;
function tempDir(subDir = null) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!tempDir_)
            tempDir_ = tempDirPath();
        const fullDir = tempDir_ + (subDir ? `/${subDir}` : '');
        yield fs.mkdirp(fullDir);
        return fullDir;
    });
}
exports.tempDir = tempDir;
function makeTempFileWithContent(content) {
    return __awaiter(this, void 0, void 0, function* () {
        const d = yield tempDir();
        const filePath = `${d}/${randomHash()}`;
        if (typeof content === 'string') {
            yield fs.writeFile(filePath, content, 'utf8');
        }
        else {
            yield fs.writeFile(filePath, content);
        }
        return filePath;
    });
}
exports.makeTempFileWithContent = makeTempFileWithContent;
function initGlobalLogger() {
    const globalLogger = new Logger_1.default();
    Logger_1.default.initializeGlobalLogger(globalLogger);
}
let createdDbPath_ = null;
function beforeAllDb(unitName, createDbOptions = null) {
    return __awaiter(this, void 0, void 0, function* () {
        unitName = unitName.replace(/\//g, '_');
        createdDbPath_ = `${packageRootDir}/db-test-${unitName}.sqlite`;
        const tempDir = `${packageRootDir}/temp/test-${unitName}`;
        yield fs.mkdirp(tempDir);
        // Uncomment the code below to run the test units with Postgres. Run this:
        //
        // sudo docker compose -f docker-compose.db-dev.yml up
        if (process.env.JOPLIN_TESTS_SERVER_DB === 'pg') {
            yield (0, config_1.initConfig)(types_1.Env.Dev, (0, env_1.parseEnv)({
                DB_CLIENT: 'pg',
                POSTGRES_DATABASE: unitName,
                POSTGRES_USER: 'joplin',
                POSTGRES_PASSWORD: 'joplin',
                SUPPORT_EMAIL: 'testing@localhost',
            }), {
                tempDir: tempDir,
            });
        }
        else {
            yield (0, config_1.initConfig)(types_1.Env.Dev, (0, env_1.parseEnv)({
                SQLITE_DATABASE: createdDbPath_,
                SUPPORT_EMAIL: 'testing@localhost',
            }), {
                tempDir: tempDir,
            });
        }
        initGlobalLogger();
        yield (0, dbTools_1.createDb)((0, config_1.default)().database, Object.assign({ dropIfExists: true }, createDbOptions));
        db_ = yield (0, db_1.connectDb)((0, config_1.default)().database);
        const mustache = new MustacheService_1.default((0, config_1.default)().viewDir, (0, config_1.default)().baseUrl);
        yield mustache.loadPartials();
        yield (0, joplinUtils_1.initializeJoplinUtils)((0, config_1.default)(), models(), mustache);
    });
}
exports.beforeAllDb = beforeAllDb;
function afterAllTests() {
    return __awaiter(this, void 0, void 0, function* () {
        if (db_) {
            yield (0, db_1.disconnectDb)(db_);
            db_ = null;
        }
        if (tempDir_) {
            yield fs.remove(tempDir_);
            tempDir_ = null;
        }
        if (createdDbPath_) {
            yield fs.remove(createdDbPath_);
            createdDbPath_ = null;
        }
    });
}
exports.afterAllTests = afterAllTests;
function beforeEachDb() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, db_1.truncateTables)(db_);
    });
}
exports.beforeEachDb = beforeEachDb;
function msleep(ms) {
    // It seems setTimeout can sometimes last less time than the provided
    // interval:
    //
    // https://stackoverflow.com/a/50912029/561309
    //
    // This can cause issues in tests where we expect the actual duration to be
    // the same as the provided interval or more, but not less. So the code
    // below check that the elapsed time is no less than the provided interval,
    // and if it is, it waits a bit longer.
    const startTime = Date.now();
    return new Promise((resolve) => {
        setTimeout(() => {
            if (Date.now() - startTime < ms) {
                const iid = setInterval(() => {
                    if (Date.now() - startTime >= ms) {
                        clearInterval(iid);
                        resolve(null);
                    }
                }, 2);
            }
            else {
                resolve(null);
            }
        }, ms);
    });
}
exports.msleep = msleep;
function koaAppContext(options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!db_)
            throw new Error('Database must be initialized first');
        options = Object.assign({}, options);
        initGlobalLogger();
        const reqOptions = Object.assign({}, options.request);
        const owner = options.sessionId ? yield models().session().sessionUser(options.sessionId) : null;
        // To pass the CSRF check, we create the token here and assign it
        // automatically if it's a POST request with a body.
        const csrfToken = owner ? yield (0, csrf_1.createCsrfToken)(models(), owner) : '';
        if (typeof reqOptions.body === 'object')
            reqOptions.body._csrf = csrfToken;
        if (!reqOptions.method)
            reqOptions.method = 'GET';
        if (!reqOptions.url)
            reqOptions.url = '/home';
        if (!reqOptions.headers)
            reqOptions.headers = {};
        if (!reqOptions.headers['content-type'])
            reqOptions.headers['content-type'] = 'application/json';
        if (options.sessionId) {
            reqOptions.headers['x-api-auth'] = options.sessionId;
        }
        const req = httpMocks.createRequest(reqOptions);
        req.__isMocked = true;
        const appLogger = Logger_1.default.create('AppTest');
        const baseAppContext = yield (0, setupAppContext_1.default)({}, types_1.Env.Dev, db_, () => appLogger);
        // Set type to "any" because the Koa context has many properties and we
        // don't need to mock all of them.
        const appContext = {
            baseAppContext,
            joplin: Object.assign(Object.assign({}, baseAppContext.joplinBase), { env: types_1.Env.Dev, db: db_, models: models(), owner: owner }),
            path: req.url,
            cookies: new FakeCookies_1.default(),
            request: new FakeRequest_1.default(req),
            response: new FakeResponse_1.default(),
            headers: Object.assign({}, reqOptions.headers),
            req: req,
            query: req.query,
            method: req.method,
            redirect: () => { },
            URL: new url_1.URL((0, config_1.default)().baseUrl), // origin
        };
        if (options.sessionId) {
            (0, cookies_1.cookieSet)(appContext, 'sessionId', options.sessionId);
        }
        return appContext;
    });
}
exports.koaAppContext = koaAppContext;
function koaNext() {
    return Promise.resolve();
}
exports.koaNext = koaNext;
exports.testAssetDir = `${packageRootDir}/assets/tests`;
function db() {
    return db_;
}
exports.db = db;
function models() {
    return (0, factory_1.default)(db(), (0, config_1.default)());
}
exports.models = models;
function parseHtml(html) {
    const dom = new jsdom.JSDOM(html);
    return dom.window.document;
}
exports.parseHtml = parseHtml;
const createUserAndSession = function (index = 1, isAdmin = false, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        const password = (0, uuidgen_1.default)();
        options = Object.assign({ email: `user${index}@localhost`, password }, options);
        const user = yield models().user().save({ email: options.email, password: options.password, is_admin: isAdmin ? 1 : 0 }, { skipValidation: true });
        const session = yield models().session().authenticate(options.email, options.password);
        return {
            user: yield models().user().load(user.id),
            session,
            password,
        };
    });
};
exports.createUserAndSession = createUserAndSession;
const createUser = function (index = 1, isAdmin = false) {
    return __awaiter(this, void 0, void 0, function* () {
        return models().user().save({ email: `user${index}@localhost`, password: '123456', is_admin: isAdmin ? 1 : 0 }, { skipValidation: true });
    });
};
exports.createUser = createUser;
function createItemTree(userId, parentFolderId, tree) {
    return __awaiter(this, void 0, void 0, function* () {
        const itemModel = models().item();
        for (const jopId in tree) {
            const children = tree[jopId];
            const isFolder = children !== null;
            const newItem = yield itemModel.saveForUser(userId, {
                jop_parent_id: parentFolderId,
                jop_id: jopId,
                jop_type: isFolder ? BaseModel_1.ModelType.Folder : BaseModel_1.ModelType.Note,
                name: `${jopId}.md`,
                content: Buffer.from(`{"title":"Item ${jopId}"}`),
            });
            if (isFolder && Object.keys(children).length)
                yield createItemTree(userId, newItem.jop_id, children);
        }
    });
}
exports.createItemTree = createItemTree;
// export async function createItemTree2(userId: Uuid, parentFolderId: string, tree: any[]): Promise<void> {
// 	const itemModel = models().item();
// 	const user = await models().user().load(userId);
// 	for (const jopItem of tree) {
// 		const isFolder = !!jopItem.children;
// 		const serializedBody = isFolder ?
// 			makeFolderSerializedBody({ ...jopItem, parent_id: parentFolderId }) :
// 			makeNoteSerializedBody({ ...jopItem, parent_id: parentFolderId });
// 		const result = await itemModel.saveFromRawContent(user, [{ name: `${jopItem.id}.md`, body: Buffer.from(serializedBody) }]);
// 		const newItem = result[`${jopItem.id}.md`].item;
// 		if (isFolder && jopItem.children.length) await createItemTree2(userId, newItem.jop_id, jopItem.children);
// 	}
// }
function createItemTree3(userId, parentFolderId, shareId, tree) {
    return __awaiter(this, void 0, void 0, function* () {
        const itemModel = models().item();
        const user = yield models().user().load(userId);
        for (const jopItem of tree) {
            const isFolder = !!jopItem.children;
            const serializedBody = isFolder ?
                makeFolderSerializedBody(Object.assign(Object.assign({}, jopItem), { parent_id: parentFolderId, share_id: shareId })) :
                makeNoteSerializedBody(Object.assign(Object.assign({}, jopItem), { parent_id: parentFolderId, share_id: shareId }));
            const result = yield itemModel.saveFromRawContent(user, [{ name: `${jopItem.id}.md`, body: Buffer.from(serializedBody) }]);
            const newItem = result[`${jopItem.id}.md`].item;
            if (isFolder && jopItem.children.length)
                yield createItemTree3(userId, newItem.jop_id, shareId, jopItem.children);
        }
    });
}
exports.createItemTree3 = createItemTree3;
function getItem(sessionId, path) {
    return __awaiter(this, void 0, void 0, function* () {
        const item = yield (0, apiUtils_1.getApi)(sessionId, `items/${path}/content`);
        return item.toString();
    });
}
exports.getItem = getItem;
function createItem(sessionId, path, content) {
    return __awaiter(this, void 0, void 0, function* () {
        const tempFilePath = yield makeTempFileWithContent(content);
        const item = yield (0, apiUtils_1.putApi)(sessionId, `items/${path}/content`, null, { filePath: tempFilePath });
        yield fs.remove(tempFilePath);
        return models().item().load(item.id);
    });
}
exports.createItem = createItem;
function updateItem(sessionId, path, content) {
    return __awaiter(this, void 0, void 0, function* () {
        const tempFilePath = yield makeTempFileWithContent(content);
        const item = yield (0, apiUtils_1.putApi)(sessionId, `items/${path}/content`, null, { filePath: tempFilePath });
        yield fs.remove(tempFilePath);
        return models().item().load(item.id);
    });
}
exports.updateItem = updateItem;
function createNote(sessionId, note) {
    return __awaiter(this, void 0, void 0, function* () {
        note = Object.assign({ id: '00000000000000000000000000000001', title: 'Note title', body: 'Note body' }, note);
        return createItem(sessionId, `root:/${note.id}.md:`, makeNoteSerializedBody(note));
    });
}
exports.createNote = createNote;
function updateNote(sessionId, note) {
    return __awaiter(this, void 0, void 0, function* () {
        return updateItem(sessionId, `root:/${note.id}.md:`, makeNoteSerializedBody(note));
    });
}
exports.updateNote = updateNote;
function updateFolder(sessionId, folder) {
    return __awaiter(this, void 0, void 0, function* () {
        return updateItem(sessionId, `root:/${folder.id}.md:`, makeFolderSerializedBody(folder));
    });
}
exports.updateFolder = updateFolder;
function createFolder(sessionId, folder) {
    return __awaiter(this, void 0, void 0, function* () {
        folder = Object.assign({ id: '000000000000000000000000000000F1', title: 'Folder title' }, folder);
        return createItem(sessionId, `root:/${folder.id}.md:`, makeFolderSerializedBody(folder));
    });
}
exports.createFolder = createFolder;
function createResource(sessionId, resource, content) {
    return __awaiter(this, void 0, void 0, function* () {
        resource = Object.assign({ id: '000000000000000000000000000000E1', mime: 'plain/text', file_extension: 'txt', size: content.length }, resource);
        const serializedBody = makeResourceSerializedBody(resource);
        const resourceItem = yield createItem(sessionId, `root:/${resource.id}.md:`, serializedBody);
        yield createItem(sessionId, `root:/.resource/${resource.id}:`, content);
        return resourceItem;
    });
}
exports.createResource = createResource;
function checkContextError(context) {
    if (context.response.status >= 400) {
        throw new errors_1.ApiError(`${context.method} ${context.path} ${JSON.stringify(context.response)}`, context.response.status);
    }
}
exports.checkContextError = checkContextError;
function credentialFile(filename) {
    return __awaiter(this, void 0, void 0, function* () {
        const filePath = `${require('os').homedir()}/joplin-credentials/${filename}`;
        if (yield fs.pathExists(filePath))
            return filePath;
        return '';
    });
}
exports.credentialFile = credentialFile;
function readCredentialFile(filename, defaultValue = null) {
    return __awaiter(this, void 0, void 0, function* () {
        const filePath = yield credentialFile(filename);
        if (!filePath) {
            if (defaultValue === null)
                throw new Error(`File not found: ${filename}`);
            return defaultValue;
        }
        const r = yield fs.readFile(filePath);
        return r.toString();
    });
}
exports.readCredentialFile = readCredentialFile;
function credentialFileSync(filename) {
    const filePath = `${require('os').homedir()}/joplin-credentials/${filename}`;
    if (fs.pathExistsSync(filePath))
        return filePath;
    return '';
}
exports.credentialFileSync = credentialFileSync;
function readCredentialFileSync(filename, defaultValue = null) {
    const filePath = credentialFileSync(filename);
    if (!filePath) {
        if (defaultValue === null)
            throw new Error(`File not found: ${filename}`);
        return defaultValue;
    }
    const r = fs.readFileSync(filePath);
    return r.toString();
}
exports.readCredentialFileSync = readCredentialFileSync;
function checkThrowAsync(asyncFn) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield asyncFn();
        }
        catch (error) {
            return error;
        }
        return null;
    });
}
exports.checkThrowAsync = checkThrowAsync;
function expectThrow(asyncFn, errorCode = undefined) {
    return __awaiter(this, void 0, void 0, function* () {
        let hasThrown = false;
        let thrownError = null;
        try {
            yield asyncFn();
        }
        catch (error) {
            hasThrown = true;
            thrownError = error;
        }
        if (!hasThrown) {
            expect('not throw').toBe('throw');
        }
        else if (errorCode !== undefined && thrownError.code !== errorCode) {
            console.error(thrownError);
            expect(`error code: ${thrownError.code}`).toBe(`error code: ${errorCode}`);
        }
        else {
            expect(true).toBe(true);
        }
        return thrownError;
    });
}
exports.expectThrow = expectThrow;
function expectHttpError(asyncFn, expectedHttpCode) {
    return __awaiter(this, void 0, void 0, function* () {
        let thrownError = null;
        try {
            yield asyncFn();
        }
        catch (error) {
            thrownError = error;
        }
        if (!thrownError) {
            expect('not throw').toBe('throw');
        }
        else {
            expect(thrownError.httpCode).toBe(expectedHttpCode);
        }
    });
}
exports.expectHttpError = expectHttpError;
function expectNoHttpError(asyncFn) {
    return __awaiter(this, void 0, void 0, function* () {
        let thrownError = null;
        try {
            yield asyncFn();
        }
        catch (error) {
            thrownError = error;
        }
        if (thrownError) {
            expect('throw').toBe('not throw');
        }
        else {
            expect(true).toBe(true);
        }
    });
}
exports.expectNoHttpError = expectNoHttpError;
function makeNoteSerializedBody(note = {}) {
    return `${'title' in note ? note.title : 'Title'}

${'body' in note ? note.body : 'Body'}

id: ${'id' in note ? note.id : 'b39dadd7a63742bebf3125fd2a9286d4'}
parent_id: ${'parent_id' in note ? note.parent_id : '000000000000000000000000000000F1'}
created_time: 2020-10-15T10:34:16.044Z
updated_time: 2021-01-28T23:10:30.054Z
is_conflict: 0
latitude: 0.00000000
longitude: 0.00000000
altitude: 0.0000
author: 
source_url: 
is_todo: 1
todo_due: 1602760405000
todo_completed: 0
source: joplindev-desktop
source_application: net.cozic.joplindev-desktop
application_data: 
order: 0
user_created_time: 2020-10-15T10:34:16.044Z
user_updated_time: 2020-10-19T17:21:03.394Z
encryption_cipher_text: 
encryption_applied: 0
markup_language: 1
is_shared: 1
share_id: ${note.share_id || ''}
conflict_original_id: 
master_key_id: 
type_: 1`;
}
exports.makeNoteSerializedBody = makeNoteSerializedBody;
function makeFolderSerializedBody(folder = {}) {
    return `${'title' in folder ? folder.title : 'Title'}

id: ${folder.id || '000000000000000000000000000000F1'}
created_time: 2020-11-11T18:44:14.534Z
updated_time: 2020-11-11T18:44:14.534Z
user_created_time: 2020-11-11T18:44:14.534Z
user_updated_time: 2020-11-11T18:44:14.534Z
encryption_cipher_text:
encryption_applied: 0
parent_id: ${folder.parent_id || ''}
is_shared: 0
share_id: ${folder.share_id || ''}
type_: 2`;
}
exports.makeFolderSerializedBody = makeFolderSerializedBody;
function makeResourceSerializedBody(resource = {}) {
    return `Test Resource

id: ${resource.id}
mime: ${resource.mime}
filename: 
created_time: 2020-10-15T10:37:58.090Z
updated_time: 2020-10-15T10:37:58.090Z
user_created_time: 2020-10-15T10:37:58.090Z
user_updated_time: 2020-10-15T10:37:58.090Z
file_extension: ${resource.file_extension}
encryption_cipher_text: 
encryption_applied: 0
encryption_blob_encrypted: 0
size: ${resource.size}
share_id: ${resource.share_id || ''}
is_shared: 0
type_: 4`;
}
exports.makeResourceSerializedBody = makeResourceSerializedBody;
function expectNotThrow(asyncFn) {
    return __awaiter(this, void 0, void 0, function* () {
        let thrownError = null;
        try {
            yield asyncFn();
        }
        catch (error) {
            thrownError = error;
        }
        if (thrownError) {
            console.error(thrownError);
            expect(thrownError.message).toBe('');
        }
        else {
            expect(true).toBe(true);
        }
    });
}
exports.expectNotThrow = expectNotThrow;
//# sourceMappingURL=testUtils.js.map