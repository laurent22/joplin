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
exports.setupApplication = exports.setupCommandForTesting = void 0;
const { app } = require('../app');
const Folder_1 = require('@joplin/lib/models/Folder');
const setupCommand_1 = require('../setupCommand');
const setupCommandForTesting = (CommandClass, stdout = null) => {
	const command = new CommandClass();
	(0, setupCommand_1.default)(command, stdout, null, null);
	return command;
};
exports.setupCommandForTesting = setupCommandForTesting;
const setupApplication = () => __awaiter(void 0, void 0, void 0, function* () {
	// We create a notebook and set it as default since most commands require
	// such notebook.
	yield Folder_1.default.save({ title: 'default' });
	yield app().refreshCurrentFolder();
});
exports.setupApplication = setupApplication;
// # sourceMappingURL=testUtils.js.map
