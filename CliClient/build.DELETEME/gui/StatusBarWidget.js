const BaseWidget = require('tkwidgets/BaseWidget.js');
const chalk = require('chalk');
const termutils = require('tkwidgets/framework/termutils.js');
const stripAnsi = require('strip-ansi');
const { handleAutocompletion } = require('../autocompletion.js');

class StatusBarWidget extends BaseWidget {

	constructor() {
		super();

		this.promptState_ = null;
		this.inputEventEmitter_ = null;
		this.history_ = [];
		this.items_ = [];
	}

	get name() {
		return 'statusBar';
	}

	get canHaveFocus() {
		return false;
	}

	setItemAt(index, text) {
		this.items_[index] = stripAnsi(text).trim();
		this.invalidate();
	}

	async prompt(initialText = '', promptString = null, options = null) {
		if (this.promptState_) throw new Error('Another prompt already active');
		if (promptString === null) promptString = ':';
		if (options === null) options = {};

		this.root.globalDisableKeyboard(this);

		this.promptState_ = {
			promise: null,
			initialText: stripAnsi(initialText),
			promptString: stripAnsi(promptString),
		};

		if ('cursorPosition' in options) this.promptState_.cursorPosition = options.cursorPosition;
		if ('secure' in options) this.promptState_.secure = options.secure;

		this.promptState_.promise = new Promise((resolve, reject) => {
			this.promptState_.resolve = resolve;
			this.promptState_.reject = reject;
		});

		this.invalidate();

		return this.promptState_.promise;
	}

	get promptActive() {
		return !!this.promptState_;
	}

	get history() {
		return this.history_;
	}

	resetCursor() {
		if (!this.promptActive) return;
		if (!this.inputEventEmitter_) return;

		this.inputEventEmitter_.redraw();
		this.inputEventEmitter_.rebase(this.absoluteInnerX + termutils.textLength(this.promptState_.promptString), this.absoluteInnerY);
		this.term.moveTo(this.absoluteInnerX + termutils.textLength(this.promptState_.promptString) + this.inputEventEmitter_.getInput().length, this.absoluteInnerY);
	}

	render() {
		super.render();

		const doSaveCursor = !this.promptActive;
		
		if (doSaveCursor) this.term.saveCursor();

		this.innerClear();

		// Note:
		// On Ubuntu, bgBlueBright looks too bright which makes the white text illegible
		// On Windows, bgBlueBright is fine and looks dark enough (Windows is probably in the wrong though)
		// For now, just don't use any colour at all.

		//const textStyle = this.promptActive ? (s) => s : chalk.bgBlueBright.white;
		//const textStyle = (s) => s;
		const textStyle = this.promptActive ? (s) => s : chalk.gray;

		this.term.drawHLine(this.absoluteInnerX, this.absoluteInnerY, this.innerWidth, textStyle(' '));

		this.term.moveTo(this.absoluteInnerX, this.absoluteInnerY);

		if (this.promptActive) {

			this.term.write(textStyle(this.promptState_.promptString));

			if (this.inputEventEmitter_) {
				// inputField is already waiting for input so in that case just make
				// sure that the cursor is at the right position and exit.
				this.resetCursor();
				return;
			}

			this.term.showCursor(true);

			const isSecurePrompt = !!this.promptState_.secure;

			let options = {
				cancelable: true,
				history: this.history,
				default: this.promptState_.initialText,
				autoComplete: handleAutocompletion,
				autoCompleteHint : true,
				autoCompleteMenu : true,
			};

			if ('cursorPosition' in this.promptState_) options.cursorPosition = this.promptState_.cursorPosition;
			if (isSecurePrompt) options.echoChar = true;

			this.inputEventEmitter_ = this.term.inputField(options, (error, input) => {
				let resolveResult = null;
				const resolveFn = this.promptState_.resolve;

				if (error) {
					this.logger().error('StatusBar: inputField error:', error);
				} else {
					if (input === undefined) {
						// User cancel
					} else {
						resolveResult = input ? input.trim() : input;
						// Add the command to history but only if it's longer than one character.
						// Below that it's usually an answer like "y"/"n", etc.
						const isConfigPassword = input.indexOf('config ') >= 0 && input.indexOf('password') >= 0;
						if (!isSecurePrompt && input && input.length > 1 && !isConfigPassword) this.history_.push(input);
					}
				}

				// If the inputField spans several lines invalidate the root so that
				// the interface is relayouted.
				if (termutils.textLength(this.promptState_.promptString) + termutils.textLength(input) >= this.innerWidth - 5) {
					this.root.invalidate();
				}

				this.inputEventEmitter_ = null;
				this.term.showCursor(false);
				this.promptState_ = null;
				this.root.globalEnableKeyboard(this);
				this.invalidate();

				// Only callback once everything has been cleaned up and reset
				resolveFn(resolveResult);
			});

		} else {

			for (let i = 0; i < this.items_.length; i++) {
				const s = this.items_[i].substr(0, this.innerWidth - 1);
				this.term.write(textStyle(s));
			}

		}

		if (doSaveCursor) this.term.restoreCursor();
	}

}

module.exports = StatusBarWidget;
