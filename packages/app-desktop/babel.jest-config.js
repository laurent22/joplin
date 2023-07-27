module.exports = {
	// Jest doesn't understand ES6 exports: Babel needs to transform ES6 modules
	// to CommonJS so that they can be imported successfully.
	'plugins': ['@babel/plugin-transform-modules-commonjs'],

	// This fixes `this` being `undefined` in ../renderer/MdToHtml/rules/katex_mhchem.js
	// (and other files) by forcing Babel to treat files as CommonJS unless they include
	// an `export` statement.
	//
	// See https://stackoverflow.com/a/34983495
	'sourceType': 'unambiguous',
};
