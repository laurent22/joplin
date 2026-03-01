'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const locale_1 = require('@joplin/lib/locale');
const React = require('react');
const react_native_1 = require('react-native');
const react_native_paper_1 = require('react-native-paper');
const IconButton_1 = require('./IconButton');
const react_1 = require('react');
const shim_1 = require('@joplin/lib/shim');
const global_style_1 = require('./global-style');
const react_redux_1 = require('react-redux');
const Setting_1 = require('@joplin/lib/models/Setting');
const buttons_1 = require('./buttons');
const Logger_1 = require('@joplin/utils/Logger');
const builtInMetadata_1 = require('@joplin/lib/models/settings/builtInMetadata');
const logger = Logger_1.default.create('FeedbackBanner');
const useStyles = (themeId, sentFeedback) => {
	const { width: windowWidth } = (0, react_native_1.useWindowDimensions)();
	return (0, react_1.useMemo)(() => {
		const theme = (0, global_style_1.themeStyle)(themeId);
		const iconBaseStyle = {
			fontSize: 24,
			color: theme.color3,
		};
		return react_native_1.StyleSheet.create({
			container: {
				backgroundColor: theme.backgroundColor3,
				borderTopRightRadius: 16,
				display: 'flex',
				flexGrow: 1,
				flexWrap: 'wrap',
				flexDirection: 'row',
				position: 'absolute',
				bottom: 0,
				left: 0,
				maxWidth: windowWidth - 50,
				gap: 18,
				padding: 12,
			},
			contentRight: {
				display: sentFeedback ? 'none' : 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: 16,
			},
			header: {
				fontWeight: 'bold',
			},
			iconUseful: { ...iconBaseStyle, color: theme.colorCorrect },
			iconNotUseful: { ...iconBaseStyle, color: theme.colorWarn },
			dismissButtonIcon: {
				fontSize: 16,
				color: theme.color2,
				marginLeft: 'auto',
				marginRight: 'auto',
			},
			dismissButton: {
				backgroundColor: theme.backgroundColor2,
				borderColor: theme.backgroundColor,
				borderWidth: 2,
				width: 29,
				height: 29,
				borderRadius: 14,
				position: 'absolute',
				top: -16,
				right: -16,
				justifyContent: 'center',
			},
			dismissButtonContent: {
				flexShrink: 1,
			},
		});
	}, [themeId, windowWidth, sentFeedback]);
};
const useSurveyUrl = (surveyKey) => {
	return (0, react_1.useMemo)(() => {
		let baseUrl = 'https://objects.joplinusercontent.com/';
		// For testing with a locally-hosted server:
		const useLocalServer = false;
		if (Setting_1.default.value('env') === 'dev' && useLocalServer) {
			baseUrl = 'http://localhost:3430/';
		}
		return `${baseUrl}r/survey--${encodeURIComponent(surveyKey)}`;
	}, [surveyKey]);
};
const setProgress = (progress) => {
	Setting_1.default.setValue('survey.webClientEval2025.progress', progress);
};
const onDismiss = () => {
	setProgress(builtInMetadata_1.SurveyProgress.Dismissed);
};
const FeedbackBanner = props => {
	const surveyUrl = useSurveyUrl(props.surveyKey);
	const sentFeedback = props.progress === builtInMetadata_1.SurveyProgress.Started;
	const sendSurveyResponse = (0, react_1.useCallback)(async (surveyResponse) => {
		const fetchUrl = `${surveyUrl}--${encodeURIComponent(surveyResponse)}`;
		logger.debug('sending response to', fetchUrl);
		const showError = (message) => {
			logger.error('Error', message);
			void shim_1.default.showErrorDialog((0, locale_1._)('An error occurred while sending the response. This can happen if the app is offline or cannot connect to the server.\nError: %s', message));
		};
		try {
			const response = await shim_1.default.fetch(fetchUrl);
			// The server currently redirects (status 302) in response
			// to many survey-related requests. This may be returned by
			// the web app service worker as a 200 OK response, however. Support both:
			if (response.ok || response.status === 302) {
				setProgress(builtInMetadata_1.SurveyProgress.Started);
			} else {
				const body = await response.text();
				showError(`Server error: ${response.status} ${body}`);
			}
		} catch (error) {
			showError(error);
		}
	}, [surveyUrl]);
	const onSurveyLinkClick = (0, react_1.useCallback)(() => {
		void react_native_1.Linking.openURL(surveyUrl);
		onDismiss();
	}, [surveyUrl]);
	const onNotUsefulClick = (0, react_1.useCallback)(() => {
		void sendSurveyResponse('unhelpful');
	}, [sendSurveyResponse]);
	const onUsefulClick = (0, react_1.useCallback)(() => {
		void sendSurveyResponse('helpful');
	}, [sendSurveyResponse]);
	const styles = useStyles(props.themeId, sentFeedback);
	const renderStatusMessage = () => {
		if (sentFeedback) {
			return React.createElement(react_native_1.View, null,
				React.createElement(react_native_paper_1.Text, null, (0, locale_1._)('Thank you for the feedback!\nDo you have time to complete a short survey?')),
				React.createElement(buttons_1.LinkButton, { onPress: onSurveyLinkClick }, (0, locale_1._)('Take survey')));
		} else {
			return React.createElement(react_native_paper_1.Text, null, (0, locale_1._)('Do you find the Joplin web app useful?'));
		}
	};
	if (shim_1.default.mobilePlatform() !== 'web' || props.progress === builtInMetadata_1.SurveyProgress.Dismissed) { return null; }
	return React.createElement(react_native_paper_1.Portal, null,
		React.createElement(react_native_1.View, { style: styles.container, role: 'complementary' },
			React.createElement(react_native_1.View, null,
				React.createElement(react_native_paper_1.Text, { accessibilityRole: 'header', variant: 'titleMedium', style: styles.header }, (0, locale_1._)('Feedback')),
				React.createElement(react_native_paper_1.Text, null, renderStatusMessage())),
			React.createElement(react_native_1.View, { style: styles.contentRight },
				React.createElement(IconButton_1.default, { iconName: 'fas times', themeId: props.themeId, onPress: onNotUsefulClick, description: (0, locale_1._)('Not useful'), iconStyle: styles.iconNotUseful }),
				React.createElement(IconButton_1.default, { iconName: 'fas check', themeId: props.themeId, onPress: onUsefulClick, description: (0, locale_1._)('Useful'), iconStyle: styles.iconUseful })),
			React.createElement(IconButton_1.default, { iconName: 'fas times', themeId: props.themeId, onPress: onDismiss, description: (0, locale_1._)('Dismiss'), iconStyle: styles.dismissButtonIcon, contentWrapperStyle: styles.dismissButtonContent, containerStyle: styles.dismissButton })));
};
exports.default = (0, react_redux_1.connect)((state) => ({
	themeId: state.settings.theme,
	surveyKey: 'web-app-test',
	progress: state.settings['survey.webClientEval2025.progress'],
}))(FeedbackBanner);
// # sourceMappingURL=FeedbackBanner.js.map
