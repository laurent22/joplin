'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const React = require('react');
const react_native_1 = require('react-native');
const react_native_paper_1 = require('react-native-paper');
const IconButton_1 = require('../IconButton');
const locale_1 = require('@joplin/lib/locale');
const react_1 = require('react');
const DismissibleDialog_1 = require('../DismissibleDialog');
const buttons_1 = require('../buttons');
const makeDiscourseDebugUrl_1 = require('@joplin/lib/makeDiscourseDebugUrl');
const getPackageInfo_1 = require('../../utils/getPackageInfo');
const PluginService_1 = require('@joplin/lib/services/plugins/PluginService');
const Setting_1 = require('@joplin/lib/models/Setting');
const onLeaveFeedback = () => {
	void react_native_1.Linking.openURL('https://forms.gle/B5YGDNzsUYBnoPx19');
};
const onReportBug = () => {
	void react_native_1.Linking.openURL((0, makeDiscourseDebugUrl_1.default)('', '', [], (0, getPackageInfo_1.default)(), PluginService_1.default.instance(), Setting_1.default.value('plugins.states')));
};
const styles = react_native_1.StyleSheet.create({
	feedbackContainer: {
		flexGrow: 1,
		flexDirection: 'row',
		gap: 16,
		justifyContent: 'flex-end',
		flexWrap: 'wrap',
	},
	paragraph: {
		paddingBottom: 7,
	},
});
const WebBetaButton = props => {
	const [dialogVisible, setDialogVisible] = (0, react_1.useState)(false);
	const onShowDialog = (0, react_1.useCallback)(() => {
		setDialogVisible(true);
	}, []);
	const onHideDialog = (0, react_1.useCallback)(() => {
		setDialogVisible(false);
	}, []);
	const renderParagraph = (content) => {
		return React.createElement(react_native_paper_1.Text, { variant: 'bodyLarge', style: styles.paragraph }, content);
	};
	return (React.createElement(React.Fragment, null,
		React.createElement(IconButton_1.default, { onPress: onShowDialog, description: (0, locale_1._)('Beta'), themeId: props.themeId, contentWrapperStyle: props.wrapperStyle, iconName: 'material beta', iconStyle: props.iconStyle }),
		React.createElement(DismissibleDialog_1.default, { heading: (0, locale_1._)('Beta'), size: DismissibleDialog_1.DialogVariant.SmallResize, themeId: props.themeId, visible: dialogVisible, onDismiss: onHideDialog },
			renderParagraph('Welcome to the beta version of the Joplin Web App!'),
			renderParagraph('Thank you for participating in the beta version of the Joplin Web App.'),
			renderParagraph('The Joplin Web App is available for a limited time in open beta and may later join the Joplin Cloud plans.'),
			renderParagraph('Feel free to use it and let us know if have any questions or notice any issues!'),
			React.createElement(react_native_1.View, { style: styles.feedbackContainer },
				React.createElement(buttons_1.LinkButton, { onPress: onReportBug }, 'Report bug'),
				React.createElement(buttons_1.PrimaryButton, { onPress: onLeaveFeedback }, 'Give feedback')))));
};
exports.default = WebBetaButton;
// # sourceMappingURL=WebBetaButton.js.map
