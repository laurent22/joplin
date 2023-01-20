"use strict";
// Note that these tests require an S3 bucket to be set, with the credentials
// defined in the below config file. If the credentials are missing, all the
// tests are skipped.
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
const testUtils_1 = require("../../../utils/testing/testUtils");
const types_1 = require("../../../utils/types");
const testUtils_2 = require("./testUtils");
let s3config_;
const s = (0, testUtils_1.readCredentialFileSync)('server-s3-test-units.json', '');
if (s) {
    const parse = JSON.parse(s);
    if ('enabled' in parse && parse.enabled === false) {
        // disable S3 tests
    }
    else {
        delete parse.enabled;
        s3config_ = parse;
    }
}
const newConfig = () => {
    return Object.assign({ type: types_1.StorageDriverType.S3 }, s3config_);
};
const configIsSet = () => {
    return !!s3config_;
};
describe('StorageDriverS3', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        if (!(configIsSet())) {
            return;
        }
        else {
            console.warn('Running S3 unit tests on live environment!');
            yield (0, testUtils_1.beforeAllDb)('StorageDriverS3');
        }
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        if (!(configIsSet()))
            return;
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        if (!(configIsSet()))
            return;
        yield (0, testUtils_1.beforeEachDb)();
    }));
    if (configIsSet()) {
        (0, testUtils_2.shouldWriteToContentAndReadItBack)(newConfig());
        (0, testUtils_2.shouldDeleteContent)(newConfig());
        (0, testUtils_2.shouldNotCreateItemIfContentNotSaved)(newConfig());
        (0, testUtils_2.shouldNotUpdateItemIfContentNotSaved)(newConfig());
        (0, testUtils_2.shouldSupportFallbackDriver)(newConfig(), { type: types_1.StorageDriverType.Memory });
        (0, testUtils_2.shouldSupportFallbackDriverInReadWriteMode)(newConfig(), { type: types_1.StorageDriverType.Memory, mode: types_1.StorageDriverMode.ReadAndWrite });
        (0, testUtils_2.shouldUpdateContentStorageIdAfterSwitchingDriver)(newConfig(), { type: types_1.StorageDriverType.Memory });
        (0, testUtils_2.shouldThrowNotFoundIfNotExist)(newConfig());
    }
    else {
        it('should pass', () => { });
    }
});
//# sourceMappingURL=StorageDriverS3.test.js.map