'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const React = require('react');
const react_1 = require('react');
const Icon = require('react-native-vector-icons/Ionicons').default;
const react_native_paper_1 = require('react-native-paper');
const locale_1 = require('@joplin/lib/locale');
const defaultOnPress = () => { };
// Returns a render function compatible with React Native Paper.
const getIconRenderFunction = (iconName) => {
	return (props) => React.createElement(Icon, Object.assign({ name: iconName }, props));
};
const useIcon = (iconName) => {
	return (0, react_1.useMemo)(() => {
		return getIconRenderFunction(iconName);
	}, [iconName]);
};
const ActionButton = (props) => {
	let _a, _b, _c, _d, _e, _f, _g, _h;
	const [open, setOpen] = (0, react_1.useState)(false);
	const onMenuToggled = (0, react_1.useCallback)((state) => setOpen(state.open), [setOpen]);
	const actions = (0, react_1.useMemo)(() => {
		let _a;
		return ((_a = props.buttons) !== null && _a !== void 0 ? _a : []).map(button => {
			let _a;
			return Object.assign(Object.assign({}, button), { icon: getIconRenderFunction(button.icon), onPress: (_a = button.onPress) !== null && _a !== void 0 ? _a : defaultOnPress });
		});
	}, [props.buttons]);
	const closedIcon = useIcon((_b = (_a = props.mainButton) === null || _a === void 0 ? void 0 : _a.icon) !== null && _b !== void 0 ? _b : 'md-add');
	const openIcon = useIcon('close');
	return (React.createElement(react_native_paper_1.Portal, null,
		React.createElement(react_native_paper_1.FAB.Group, { open: open, accessibilityLabel: (_d = (_c = props.mainButton) === null || _c === void 0 ? void 0 : _c.label) !== null && _d !== void 0 ? _d : (0, locale_1._)('Add new'), icon: open ? openIcon : closedIcon, fabStyle: {
			backgroundColor: (_f = (_e = props.mainButton) === null || _e === void 0 ? void 0 : _e.color) !== null && _f !== void 0 ? _f : 'rgba(231,76,60,1)',
		}, onStateChange: onMenuToggled, actions: actions, onPress: (_h = (_g = props.mainButton) === null || _g === void 0 ? void 0 : _g.onPress) !== null && _h !== void 0 ? _h : defaultOnPress, visible: true })));
};
exports.default = ActionButton;
// # sourceMappingURL=ActionButton.js.map
