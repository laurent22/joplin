const nord = ['#2e3440', '#3b4252', '#434c5e', '#4c566a', '#d8dee9', '#e5e9f0', '#eceff4', '#8fbcbb', '#88c0d0', '#81a1c1', '#5e81ac', '#bf616a', '#d08770', '#ebcb8b', '#a3be8c', '#b48ead'];

// DOCUMENTATION of Nord as of Oct 3
// 0 #2e3440 :     Base component color of "Polar Night".
// Used for texts, backgrounds, carets and structuring characters like curly- and square brackets.
// 1 #3b4252 :     Lighter shade color of the base component color.
// Used as a lighter background color for UI elements like status bars.
// 2 #434c5e :     Lighter shade color of the base component color.
// Used as line highlighting in the editor.
// In the UI scope it may be used as selection- and highlight color.
// 3 #4c566a :     Lighter shade color of the base component color.
// Used for comments, invisibles, indent- and wrap guide marker.
// In the UI scope used as pseudoclass color for disabled elements.
// 4 #d8dee9 :     Base component color of "Snow Storm".
// Main color for text, variables, constants and attributes.
// In the UI scope used as semi-light background depending on the theme shading design.
// 5 #e5e9f0 :     Lighter shade color of the base component color.
// Used as a lighter background color for UI elements like status bars.
// Used as semi-light background depending on the theme shading design.
// 6 #eceff4 :     Lighter shade color of the base component color.
// Used for punctuations, carets and structuring characters like curly- and square brackets.
// In the UI scope used as background, selection- and highlight color depending on the theme shading design.
// 7 #8fbcbb :     Bluish core color.
// Used for classes, types and documentation tags.
// 8 #88c0d0 :     Bluish core accent color.
// Represents the accent color of the color palette.
// Main color for primary UI elements and methods/functions.
// 9 #81a1c1 :     Bluish core color.
// Used for language-specific syntactic/reserved support characters and keywords, operators, tags, units and
// punctuations like (semi)colons,commas and braces.
// 10 #5e81ac :    Bluish core color.
// Used for markup doctypes, import/include/require statements, pre-processor statements and at-rules (`@`).
// 11 #bf616a :    Colorful component color.
// Used for errors, git/diff deletion and linter marker.
// 12 #d08770 :    Colorful component color.
// Used for annotations.
// 13 #ebcb8b :    Colorful component color.
// Used for escape characters, regular expressions and markup entities.
// In the UI scope used for warnings and git/diff renamings.
// 14 #a3be8c :    Colorful component color.
// Main color for strings and attribute values.
// In the UI scope used for git/diff additions and success visualizations.
// 15 #b48ead :    Colorful component color.
// Used for numbers.
// 2e3440 === rbga(46, 52, 64, 1)

const nordStyle = {
	backgroundColor: nord[0],
	backgroundColorTransparent: 'rgba(46, 52, 64, 0.9)',
	oddBackgroundColor: nord[1],
	color: nord[5], // For regular text
	colorError: nord[11],
	colorWarn: nord[12],
	colorFaded: nord[4], // For less important text;
	colorBright: nord[6], // For important text;
	dividerColor: nord[10],
	selectedColor: nord[9],
	urlColor: nord[8],

	backgroundColor2: nord[2],
	depthColor: 'rgb(200, 200, 200, OPACITY)',
	color2: nord[8],
	selectedColor2: nord[10],
	colorError2: nord[11],

	raisedBackgroundColor: nord[2],
	raisedColor: nord[7],

	warningBackgroundColor: nord[13],

	htmlColor: nord[4],
	htmlBackgroundColor: nord[1],
	htmlDividerColor: nord[2],
	htmlLinkColor: nord[10],
	htmlTableBackgroundColor: nord[0],
	htmlCodeBackgroundColor: nord[0],
	htmlCodeBorderColor: nord[2],
	htmlCodeColor: nord[13],

	editorTheme: 'chaos',
	codeThemeCss: 'atom-one-dark-reasonable.css',
};

module.exports = nordStyle;
