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
const test_utils_1 = require('../testing/test-utils');
describe('models_Note', function() {
	beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
		yield test_utils_1.setupDatabaseAndSynchronizer(1);
		yield test_utils_1.switchClient(1);
		done();
	}));
	it('should migrate to v40', () => __awaiter(this, void 0, void 0, function* () {
	}));
});
// # sourceMappingURL=Migration.test.js.map
