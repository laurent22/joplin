
// Content scripts that extend the funcitonality of codemirror will need to have the exact signature 
// below. 
function plugin(CodeMirror) {
	// This is a dummy command that is registered with codemirror. 
	// Once created here it can be called by any other codemirror command
	// using cm.execCommand(stringName) or by binding the command to a key in the keymap
	CodeMirror.commands.printSomething = function(cm) {
		console.log("Something");
	}
	// Here we manually bind the keys using the codemirror keymap
	CodeMirror.keyMap.basic["Ctrl-U"] = "printSomething"
}

module.exports = {
	default: function(_context) { 
		return {
			// A plugin needs to either include a plugin here OR have enable an addon
			plugin: plugin,
			// Some assets are included with codemirror and extend the functionality in standard ways
			// via plugins (called addons) which you can find here: https://codemirror.net/doc/manual.html#addons
			// and are available under the addon/ director
			// or by adding keymaps under the keymap/ directory
			// or additional modes available under the mode/ directory
			codeMirrorAssets: ['addon/search/match-highlighter'],
			// Often addons for codemirror need to be enabled using an option,
			// There is also certain codemirror functionality that can be enabled/disabled using
			// simple options
			codeMirrorOptions: {'highlightSelectionMatches': true},
			// More complex plugins (and some addons) will require additional css styling
			// which is available through the assets function. As seen below, this styling can
			// either point to a css file in the plugin src directory or be included inline.
			assets: function() {
				return [
					{ name:'./selection.css' }
					// { inline: true,
						// text: '.cm-matchhighlight {	background-color: lightgreen;}',
						// mime: 'text/css',
					// }
				];
			},
		}
	},
}
