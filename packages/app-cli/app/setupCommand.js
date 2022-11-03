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
const locale_1 = require('@joplin/lib/locale');
exports.default = (cmd, stdout, store, gui) => {
	cmd.setStdout((text) => {
		return stdout(text);
	});
	cmd.setDispatcher((action) => {
		if (store()) {
			return store().dispatch(action);
		} else {
			return () => { };
		}
	});
	cmd.setPrompt((message, options) => __awaiter(void 0, void 0, void 0, function* () {
		if (!options) { options = {}; }
		if (!options.type) { options.type = 'boolean'; }
		if (!options.booleanAnswerDefault) { options.booleanAnswerDefault = 'y'; }
		if (!options.answers) { options.answers = options.booleanAnswerDefault === 'y' ? [(0, locale_1._)('Y'), (0, locale_1._)('n')] : [(0, locale_1._)('N'), (0, locale_1._)('y')]; }
		if (options.type === 'boolean') {
			message += ` (${options.answers.join('/')})`;
		}
		let answer = yield gui().prompt('', `${message} `, options);
		if (options.type === 'boolean') {
			if (answer === null) { return false; } // Pressed ESCAPE
			if (!answer) { answer = options.answers[0]; }
			const positiveIndex = options.booleanAnswerDefault === 'y' ? 0 : 1;
			return answer.toLowerCase() === options.answers[positiveIndex].toLowerCase();
		} else {
			return answer;
		}
	}));
	return cmd;
};
// # sourceMappingURL=setupCommand.js.map
