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
const KeychainServiceDriverBase_1 = require('./KeychainServiceDriverBase');
class KeychainServiceDriver extends KeychainServiceDriverBase_1.default {
	setPassword(/* name:string, password:string*/) {
		return __awaiter(this, void 0, void 0, function* () {
			return false;
		});
	}
	password(/* name:string*/) {
		return __awaiter(this, void 0, void 0, function* () {
			return null;
		});
	}
	deletePassword(/* name:string*/) {
		return __awaiter(this, void 0, void 0, function* () {
		});
	}
}
exports.default = KeychainServiceDriver;
// # sourceMappingURL=KeychainServiceDriver.mobile.js.map
