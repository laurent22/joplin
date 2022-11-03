'use strict';
const __awaiter = (this && this.__awaiter) || function(thisArg, _arguments, P, generator) {
	function adopt(value) { return value instanceof P ? value : new P(function(resolve) { resolve(value); }); }
	return new (P || (P = Promise))(function(resolve, reject) {
		function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
		function rejected(value) { try { step(generator['throw'](value)); } catch (e) { reject(e); } }
		function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
		step((generator = generator.apply(thisArg, _arguments || [])).next());
	});
};
Object.defineProperty(exports, '__esModule', { value: true });
const Note_1 = require('@joplin/lib/models/Note');
const test_utils_1 = require('@joplin/lib/testing/test-utils');
const testUtils_1 = require('./utils/testUtils');
const Command = require('./command-done');
describe('command-done', () => {
	beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
		yield (0, test_utils_1.setupDatabaseAndSynchronizer)(1);
		yield (0, test_utils_1.switchClient)(1);
		yield (0, testUtils_1.setupApplication)();
	}));
	it('should make a note as "done"', () => __awaiter(void 0, void 0, void 0, function* () {
		const note = yield Note_1.default.save({ title: 'hello', is_todo: 1, todo_completed: 0 });
		const command = (0, testUtils_1.setupCommandForTesting)(Command);
		const now = Date.now();
		yield command.action({ note: note.id });
		const checkNote = yield Note_1.default.load(note.id);
		expect(checkNote.todo_completed).toBeGreaterThanOrEqual(now);
	}));
});
// # sourceMappingURL=command-done.test.js.map
