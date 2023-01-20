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
const testUtils_1 = require("../utils/testing/testUtils");
describe('ItemResourceModel', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('ItemResourceModel');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should get an item tree', () => __awaiter(this, void 0, void 0, function* () {
        const { session } = yield (0, testUtils_1.createUserAndSession)();
        const linkedNote1 = yield (0, testUtils_1.createNote)(session.id, {
            id: '000000000000000000000000000000C1',
        });
        const resource = yield (0, testUtils_1.createResource)(session.id, {
            id: '000000000000000000000000000000E1',
        }, 'test');
        const linkedNote2 = yield (0, testUtils_1.createNote)(session.id, {
            id: '000000000000000000000000000000C2',
            body: `![](:/${resource.jop_id})`,
        });
        const rootNote = yield (0, testUtils_1.createNote)(session.id, {
            id: '00000000000000000000000000000001',
            body: `[](:/${linkedNote1.jop_id}) [](:/${linkedNote2.jop_id})`,
        });
        const tree = yield (0, testUtils_1.models)().itemResource().itemTree(rootNote.id, rootNote.jop_id);
        expect(tree).toEqual({
            item_id: rootNote.id,
            resource_id: '00000000000000000000000000000001',
            children: [
                {
                    item_id: linkedNote1.id,
                    resource_id: '000000000000000000000000000000C1',
                    children: [],
                },
                {
                    item_id: linkedNote2.id,
                    resource_id: '000000000000000000000000000000C2',
                    children: [
                        {
                            item_id: resource.id,
                            resource_id: '000000000000000000000000000000E1',
                            children: [],
                        },
                    ],
                },
            ],
        });
    }));
    test('should not go into infinite loop when a note links to itself', () => __awaiter(this, void 0, void 0, function* () {
        const { session } = yield (0, testUtils_1.createUserAndSession)();
        const rootNote = yield (0, testUtils_1.createNote)(session.id, {
            id: '00000000000000000000000000000001',
            body: '![](:/00000000000000000000000000000002)',
        });
        const linkedNote = yield (0, testUtils_1.createNote)(session.id, {
            id: '00000000000000000000000000000002',
            title: 'Linked note 2',
            body: '![](:/00000000000000000000000000000001)',
        });
        const tree = yield (0, testUtils_1.models)().itemResource().itemTree(rootNote.id, rootNote.jop_id);
        expect(tree).toEqual({
            item_id: rootNote.id,
            resource_id: '00000000000000000000000000000001',
            children: [
                {
                    item_id: linkedNote.id,
                    resource_id: '00000000000000000000000000000002',
                    children: [
                        {
                            item_id: rootNote.id,
                            resource_id: '00000000000000000000000000000001',
                            children: [], // Empty to prevent an infinite loop
                        },
                    ],
                },
            ],
        });
    }));
});
//# sourceMappingURL=ItemResourceModel.test.js.map