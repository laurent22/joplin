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
const _1 = require('.');
const Setting_1 = require('../../models/Setting');
exports.default = (rootProfileDir) => __awaiter(void 0, void 0, void 0, function* () {
	const profileConfig = yield (0, _1.loadProfileConfig)(`${rootProfileDir}/profiles.json`);
	const profileDir = (0, _1.getProfileFullPath)((0, _1.getCurrentProfile)(profileConfig), rootProfileDir);
	Setting_1.default.setConstant('isSubProfile', profileConfig.currentProfile !== 0);
	Setting_1.default.setConstant('rootProfileDir', rootProfileDir);
	Setting_1.default.setConstant('profileDir', profileDir);
	return {
		profileConfig,
		profileDir,
	};
});
// # sourceMappingURL=initProfile.js.map
