'use strict';
// Based on https://github.com/caroso1222/notyf/blob/master/recipes/react.md
Object.defineProperty(exports, '__esModule', { value: true });
const React = require('react');
const notyf_1 = require('notyf');
const types_1 = require('@joplin/lib/services/plugins/api/types');
exports.default = React.createContext(new notyf_1.Notyf({
	// Set your global Notyf configuration here
	duration: 6000,
	types: [
		{
			type: types_1.ToastType.Info,
			icon: false,
			className: 'notyf__toast--info',
			background: 'blue', // Need to set a background, otherwise Notyf won't create the background element. But the color will be overriden in CSS.
		},
	],
}));
// # sourceMappingURL=NotyfContext.js.map
