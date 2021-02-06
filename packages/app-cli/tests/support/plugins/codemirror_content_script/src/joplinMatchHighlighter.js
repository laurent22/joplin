
// Content scripts that extend the funcitonality of codemirror will need to have the exact signature 
// below. 
function plugin(CodeMirror) {
	// This is a dummy command that is registered with codemirror. 
	// Once created here it can be called by any other codemirror command
	// using cm.execCommand(stringName) or register a joplin command called 'editor.printSomething'
	// through the joplin.commands api
	CodeMirror.defineExtension('printSomething', function(something) {
		console.log(something);
	});
}

module.exports = {
	default: function(_context) { 
		return {
			// A plugin needs to either include a plugin here OR have enable an addon
			plugin: plugin,
			// Some resources are included with codemirror and extend the functionality in standard ways
			// via plugins (called addons) which you can find here: https://codemirror.net/doc/manual.html#addons
			// and are available under the addon/ directory
			// or by adding keymaps under the keymap/ directory
			// or additional modes available under the mode/ directory
			// All are available in the  CodeMirror source: https://github.com/codemirror/codemirror
			codeMirrorResources: ['addon/search/match-highlighter'],
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
