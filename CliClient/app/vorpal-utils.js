import { time } from 'lib/time-utils.js';

const vorpalUtils = {};

let vorpal_ = null;
let redrawStarted_ = false;
let redrawLastUpdateTime_ = time.unixMs();
let redrawLastLog_ = null;
let redrawEnabled_ = true;
let errorStackTraceEnabled_ = false;

function initialize(vorpal) {
	vorpal_ = vorpal;
}

function redrawEnabled() {
	// // Always disabled for now - doesn't play well with command.cancel()
	// // function (it makes the whole app quit instead of just the 
	// // current command).
	return false;

	return redrawEnabled_;
}

function setRedrawEnabled(v) {
	redrawEnabled_ = v;
}

function setStackTraceEnabled(v) {
	errorStackTraceEnabled_ = v;
}

function redraw(s) {
	if (!redrawEnabled()) {
		const now = time.unixMs();
		if (now - redrawLastUpdateTime_ > 4000) {
			if (vorpal_.activeCommand) {
				vorpal_.activeCommand.log(s);
			} else {
				vorpal_.log(s);
			}
			redrawLastUpdateTime_ = now;
			redrawLastLog_ = null;
		} else {
			redrawLastLog_ = s;
		}
	} else {
		vorpal_.ui.redraw(s);
	}

	redrawStarted_ = true;
}

function redrawDone() {
	if (!redrawStarted_) return;

	if (!redrawEnabled()) {
		if (redrawLastLog_) {
			if (vorpal_.activeCommand) {
				vorpal_.activeCommand.log(redrawLastLog_);
			} else {
				vorpal_.log(redrawLastLog_);
			}
		}
	} else {
		vorpal_.ui.redraw.done();
	}

	redrawLastLog_ = null;
	redrawStarted_ = false;
}

function log(commandInstance, o) {
	if (errorStackTraceEnabled_) {
		commandInstance.log(o);
	} else {
		if (o instanceof Error) {
			commandInstance.log(o.message);
		} else {
			commandInstance.log(o);
		}
	}
}

function cmdPromptConfirm(commandInstance, message) {
	return new Promise((resolve, reject) => {
		let options = {
			type: 'confirm',
			name: 'ok',
			default: false, // This needs to be false so that, when pressing Ctrl+C, the prompt returns false
			message: message,
		};

		commandInstance.prompt(options, (result) => {
			if (result.ok) {
				resolve(true);
			} else {
				resolve(false);
			}
		});
	});
}

vorpalUtils.initialize = initialize;
vorpalUtils.redraw = redraw;
vorpalUtils.redrawDone = redrawDone;
vorpalUtils.setRedrawEnabled = setRedrawEnabled;
vorpalUtils.setStackTraceEnabled = setStackTraceEnabled;
vorpalUtils.log = log;
vorpalUtils.cmdPromptConfirm = cmdPromptConfirm;

export { vorpalUtils };