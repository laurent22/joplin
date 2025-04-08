'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const React = require('react');
const react_native_1 = require('react-native');
const Modal_1 = require('../Modal');
const react_1 = require('react');
const locale_1 = require('@joplin/lib/locale');
const buttons_1 = require('../buttons');
// react-native-paper's floating action button menu is inaccessible on web
// (can't be activated by a screen reader, and, in some cases, by the tab key).
// This component provides an alternative.
const AccessibleModalMenu = props => {
	let _a;
	const [open, setOpen] = (0, react_1.useState)(false);
	const onClick = (0, react_1.useCallback)(() => {
		if (props.onPress) {
			props.onPress();
		} else {
			setOpen(!open);
		}
	}, [open, props.onPress]);
	const options = [];
	for (const action of ((_a = props.actions) !== null && _a !== void 0 ? _a : [])) {
		options.push(React.createElement(buttons_1.PrimaryButton, { key: action.label, onPress: action.onPress }, action.label));
	}
	const modal = (React.createElement(Modal_1.default, { visible: open },
		options,
		React.createElement(buttons_1.SecondaryButton, { onPress: onClick }, (0, locale_1._)('Close menu'))));
	return React.createElement(react_native_1.View, { style: { height: 0, overflow: 'visible' } },
		modal,
		React.createElement(buttons_1.SecondaryButton, { onPress: onClick }, props.label));
};
exports.default = AccessibleModalMenu;
// # sourceMappingURL=AccessibleModalMenu.js.map
