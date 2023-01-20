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
exports.shouldThrowNotFoundIfNotExist = exports.shouldUpdateContentStorageIdAfterSwitchingDriver = exports.shouldSupportFallbackDriverInReadWriteMode = exports.shouldSupportFallbackDriver = exports.shouldNotUpdateItemIfContentNotSaved = exports.shouldNotCreateItemIfContentNotSaved = exports.shouldDeleteContent = exports.shouldWriteToContentAndReadItBack = void 0;
const config_1 = require("../../../config");
const errors_1 = require("../../../utils/errors");
const testUtils_1 = require("../../../utils/testing/testUtils");
const types_1 = require("../../../utils/types");
const factory_1 = require("../../factory");
const loadStorageDriver_1 = require("./loadStorageDriver");
const newTestModels = (driverConfig, driverConfigFallback = null) => {
    const newConfig = Object.assign(Object.assign({}, (0, config_1.default)()), { storageDriver: driverConfig, storageDriverFallback: driverConfigFallback });
    return (0, factory_1.default)((0, testUtils_1.db)(), newConfig);
};
function shouldWriteToContentAndReadItBack(driverConfig) {
    test('should write to content and read it back', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user } = yield (0, testUtils_1.createUserAndSession)(1);
            const noteBody = (0, testUtils_1.makeNoteSerializedBody)({
                id: '00000000000000000000000000000001',
                title: 'testing driver',
            });
            const testModels = newTestModels(driverConfig);
            const driver = yield testModels.item().storageDriver();
            const output = yield testModels.item().saveFromRawContent(user, [{
                    name: '00000000000000000000000000000001.md',
                    body: Buffer.from(noteBody),
                }]);
            const result = output['00000000000000000000000000000001.md'];
            expect(result.error).toBeFalsy();
            const item = yield testModels.item().loadWithContent(result.item.id);
            expect(item.content.byteLength).toBe(item.content_size);
            expect(item.content_storage_id).toBe(driver.storageId);
            const rawContent = yield driver.read(item.id, { models: (0, testUtils_1.models)() });
            expect(rawContent.byteLength).toBe(item.content_size);
            const jopItem = testModels.item().itemToJoplinItem(item);
            expect(jopItem.id).toBe('00000000000000000000000000000001');
            expect(jopItem.title).toBe('testing driver');
        });
    });
}
exports.shouldWriteToContentAndReadItBack = shouldWriteToContentAndReadItBack;
function shouldDeleteContent(driverConfig) {
    test('should delete the content', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user } = yield (0, testUtils_1.createUserAndSession)(1);
            const noteBody = (0, testUtils_1.makeNoteSerializedBody)({
                id: '00000000000000000000000000000001',
                title: 'testing driver',
            });
            const testModels = newTestModels(driverConfig);
            const output = yield testModels.item().saveFromRawContent(user, [{
                    name: '00000000000000000000000000000001.md',
                    body: Buffer.from(noteBody),
                }]);
            const item = output['00000000000000000000000000000001.md'].item;
            expect((yield testModels.item().all()).length).toBe(1);
            yield testModels.item().delete(item.id);
            expect((yield testModels.item().all()).length).toBe(0);
        });
    });
}
exports.shouldDeleteContent = shouldDeleteContent;
function shouldNotCreateItemIfContentNotSaved(driverConfig) {
    test('should not create the item if the content cannot be saved', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const testModels = newTestModels(driverConfig);
            const driver = yield testModels.item().storageDriver();
            const previousWrite = driver.write;
            driver.write = () => { throw new Error('not working!'); };
            try {
                const { user } = yield (0, testUtils_1.createUserAndSession)(1);
                const noteBody = (0, testUtils_1.makeNoteSerializedBody)({
                    id: '00000000000000000000000000000001',
                    title: 'testing driver',
                });
                const output = yield testModels.item().saveFromRawContent(user, [{
                        name: '00000000000000000000000000000001.md',
                        body: Buffer.from(noteBody),
                    }]);
                expect(output['00000000000000000000000000000001.md'].error.message).toBe('not working!');
                expect((yield testModels.item().all()).length).toBe(0);
            }
            finally {
                driver.write = previousWrite;
            }
        });
    });
}
exports.shouldNotCreateItemIfContentNotSaved = shouldNotCreateItemIfContentNotSaved;
function shouldNotUpdateItemIfContentNotSaved(driverConfig) {
    test('should not update the item if the content cannot be saved', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user } = yield (0, testUtils_1.createUserAndSession)(1);
            const noteBody = (0, testUtils_1.makeNoteSerializedBody)({
                id: '00000000000000000000000000000001',
                title: 'testing driver',
            });
            const testModels = newTestModels(driverConfig);
            const driver = yield testModels.item().storageDriver();
            yield testModels.item().saveFromRawContent(user, [{
                    name: '00000000000000000000000000000001.md',
                    body: Buffer.from(noteBody),
                }]);
            const noteBodyMod1 = (0, testUtils_1.makeNoteSerializedBody)({
                id: '00000000000000000000000000000001',
                title: 'updated 1',
            });
            yield testModels.item().saveFromRawContent(user, [{
                    name: '00000000000000000000000000000001.md',
                    body: Buffer.from(noteBodyMod1),
                }]);
            const itemMod1 = testModels.item().itemToJoplinItem(yield testModels.item().loadByJopId(user.id, '00000000000000000000000000000001', { withContent: true }));
            expect(itemMod1.title).toBe('updated 1');
            const noteBodyMod2 = (0, testUtils_1.makeNoteSerializedBody)({
                id: '00000000000000000000000000000001',
                title: 'updated 2',
            });
            const previousWrite = driver.write;
            driver.write = () => { throw new Error('not working!'); };
            try {
                const output = yield testModels.item().saveFromRawContent(user, [{
                        name: '00000000000000000000000000000001.md',
                        body: Buffer.from(noteBodyMod2),
                    }]);
                expect(output['00000000000000000000000000000001.md'].error.message).toBe('not working!');
                const itemMod2 = testModels.item().itemToJoplinItem(yield testModels.item().loadByJopId(user.id, '00000000000000000000000000000001', { withContent: true }));
                expect(itemMod2.title).toBe('updated 1'); // Check it has not been updated
            }
            finally {
                driver.write = previousWrite;
            }
        });
    });
}
exports.shouldNotUpdateItemIfContentNotSaved = shouldNotUpdateItemIfContentNotSaved;
function shouldSupportFallbackDriver(driverConfig, fallbackDriverConfig) {
    test('should support fallback content drivers', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user } = yield (0, testUtils_1.createUserAndSession)(1);
            const testModels = newTestModels(driverConfig);
            const driver = yield testModels.item().storageDriver();
            const output = yield testModels.item().saveFromRawContent(user, [{
                    name: '00000000000000000000000000000001.md',
                    body: Buffer.from((0, testUtils_1.makeNoteSerializedBody)({
                        id: '00000000000000000000000000000001',
                        title: 'testing',
                    })),
                }]);
            const itemId = output['00000000000000000000000000000001.md'].item.id;
            let previousByteLength = 0;
            {
                const content = yield driver.read(itemId, { models: (0, testUtils_1.models)() });
                expect(content.byteLength).toBeGreaterThan(10);
                previousByteLength = content.byteLength;
            }
            const testModelWithFallback = newTestModels(driverConfig, fallbackDriverConfig);
            // If the item content is not on the main content driver, it should get
            // it from the fallback one.
            const itemFromDb = yield testModelWithFallback.item().loadWithContent(itemId);
            expect(itemFromDb.content.byteLength).toBe(previousByteLength);
            // When writing content, it should use the main content driver, and set
            // the content for the fallback one to "".
            yield testModelWithFallback.item().saveFromRawContent(user, [{
                    name: '00000000000000000000000000000001.md',
                    body: Buffer.from((0, testUtils_1.makeNoteSerializedBody)({
                        id: '00000000000000000000000000000001',
                        title: 'testing1234',
                    })),
                }]);
            {
                const fallbackDriver = yield testModelWithFallback.item().storageDriverFallback();
                // Check that it has cleared the fallback driver content
                const context = { models: (0, testUtils_1.models)() };
                const fallbackContent = yield fallbackDriver.read(itemId, context);
                expect(fallbackContent.byteLength).toBe(0);
                // Check that it has written to the main driver content
                const mainContent = yield driver.read(itemId, context);
                expect(mainContent.byteLength).toBe(previousByteLength + 4);
            }
        });
    });
}
exports.shouldSupportFallbackDriver = shouldSupportFallbackDriver;
function shouldSupportFallbackDriverInReadWriteMode(driverConfig, fallbackDriverConfig) {
    test('should support fallback content drivers in rw mode', function () {
        return __awaiter(this, void 0, void 0, function* () {
            if (fallbackDriverConfig.mode !== types_1.StorageDriverMode.ReadAndWrite)
                throw new Error('Content driver must be configured in RW mode for this test');
            const { user } = yield (0, testUtils_1.createUserAndSession)(1);
            const testModelWithFallback = newTestModels(driverConfig, fallbackDriverConfig);
            const output = yield testModelWithFallback.item().saveFromRawContent(user, [{
                    name: '00000000000000000000000000000001.md',
                    body: Buffer.from((0, testUtils_1.makeNoteSerializedBody)({
                        id: '00000000000000000000000000000001',
                        title: 'testing',
                    })),
                }]);
            const itemId = output['00000000000000000000000000000001.md'].item.id;
            {
                const driver = yield testModelWithFallback.item().storageDriver();
                const fallbackDriver = yield testModelWithFallback.item().storageDriverFallback();
                // Check that it has written the content to both drivers
                const context = { models: (0, testUtils_1.models)() };
                const fallbackContent = yield fallbackDriver.read(itemId, context);
                expect(fallbackContent.byteLength).toBeGreaterThan(10);
                const mainContent = yield driver.read(itemId, context);
                expect(mainContent.toString()).toBe(fallbackContent.toString());
            }
        });
    });
}
exports.shouldSupportFallbackDriverInReadWriteMode = shouldSupportFallbackDriverInReadWriteMode;
function shouldUpdateContentStorageIdAfterSwitchingDriver(oldDriverConfig, newDriverConfig) {
    test('should update content storage ID after switching driver', function () {
        return __awaiter(this, void 0, void 0, function* () {
            if (oldDriverConfig.type === newDriverConfig.type)
                throw new Error('Drivers must be different for this test');
            const { user } = yield (0, testUtils_1.createUserAndSession)(1);
            const oldDriverModel = newTestModels(oldDriverConfig);
            const newDriverModel = newTestModels(newDriverConfig);
            const oldDriver = yield oldDriverModel.item().storageDriver();
            const newDriver = yield newDriverModel.item().storageDriver();
            const output = yield oldDriverModel.item().saveFromRawContent(user, [{
                    name: '00000000000000000000000000000001.md',
                    body: Buffer.from((0, testUtils_1.makeNoteSerializedBody)({
                        id: '00000000000000000000000000000001',
                        title: 'testing',
                    })),
                }]);
            const itemId = output['00000000000000000000000000000001.md'].item.id;
            expect((yield oldDriverModel.item().load(itemId)).content_storage_id).toBe(oldDriver.storageId);
            yield newDriverModel.item().saveFromRawContent(user, [{
                    name: '00000000000000000000000000000001.md',
                    body: Buffer.from((0, testUtils_1.makeNoteSerializedBody)({
                        id: '00000000000000000000000000000001',
                        title: 'testing',
                    })),
                }]);
            expect(yield newDriverModel.item().count()).toBe(1);
            expect((yield oldDriverModel.item().load(itemId)).content_storage_id).toBe(newDriver.storageId);
        });
    });
}
exports.shouldUpdateContentStorageIdAfterSwitchingDriver = shouldUpdateContentStorageIdAfterSwitchingDriver;
function shouldThrowNotFoundIfNotExist(driverConfig) {
    test('should throw not found if item does not exist', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const driver = yield (0, loadStorageDriver_1.default)(driverConfig, (0, testUtils_1.db)());
            let error = null;
            try {
                yield driver.read('doesntexist', { models: (0, testUtils_1.models)() });
            }
            catch (e) {
                error = e;
            }
            expect(error).toBeTruthy();
            expect(error.code).toBe(errors_1.ErrorCode.NotFound);
        });
    });
}
exports.shouldThrowNotFoundIfNotExist = shouldThrowNotFoundIfNotExist;
//# sourceMappingURL=testUtils.js.map