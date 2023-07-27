import { TextStyle, ViewStyle, StyleSheet } from 'react-native';
const { themeStyle } = require('../../global-style.js');

export interface ConfigScreenStyleSheet {
	body: ViewStyle;

	settingContainer: ViewStyle;
	settingContainerNoBottomBorder: ViewStyle;
	headerWrapperStyle: ViewStyle;

	headerTextStyle: TextStyle;
	settingText: TextStyle;
	linkText: TextStyle;
	descriptionText: TextStyle;
	warningText: TextStyle;

	sliderUnits: TextStyle;
	settingDescriptionText: TextStyle;
	permissionText: TextStyle;
	textInput: TextStyle;

	titlebarText: TextStyle;
	titlebarHeaderPart: ViewStyle;

	switchSettingText: TextStyle;
	switchSettingContainer: ViewStyle;
	switchSettingControl: TextStyle;

	settingControl: TextStyle;
}

export interface ConfigScreenStyles {
	styleSheet: ConfigScreenStyleSheet;

	selectedSectionButtonColor: string;
	keyboardAppearance: 'default'|'light'|'dark';
	getContainerStyle(hasDescription: boolean): ViewStyle;
}

const configScreenStyles = (themeId: number): ConfigScreenStyles => {
	const theme = themeStyle(themeId);

	const settingContainerStyle: ViewStyle = {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: theme.dividerColor,
		paddingTop: theme.marginTop,
		paddingBottom: theme.marginBottom,
		paddingLeft: theme.marginLeft,
		paddingRight: theme.marginRight,
	};

	const settingTextStyle: TextStyle = {
		color: theme.color,
		fontSize: theme.fontSize,
		flex: 1,
		paddingRight: 5,
	};

	const settingControlStyle: TextStyle = {
		color: theme.color,
		flex: 1,
		borderBottomWidth: 1,
		borderBottomColor: theme.dividerColor,
	};

	const styles: ConfigScreenStyleSheet = {
		body: {
			flex: 1,
			justifyContent: 'flex-start',
			flexDirection: 'column',
		},
		settingContainer: settingContainerStyle,
		settingContainerNoBottomBorder: {
			...settingContainerStyle,
			borderBottomWidth: 0,
			paddingBottom: theme.marginBottom / 2,
		},
		settingText: settingTextStyle,
		descriptionText: {
			color: theme.colorFaded,
			fontSize: theme.fontSizeSmaller,
			flex: 1,
		},
		linkText: {
			...settingTextStyle,
			borderBottomWidth: 1,
			borderBottomColor: theme.color,
			flex: 0,
			fontWeight: 'normal',
		},
		warningText: {
			color: theme.color,
			backgroundColor: theme.warningBackgroundColor,
			fontSize: theme.fontSizeSmaller,
		},
		titlebarText: theme.titlebarText,

		titlebarHeaderPart: {
			...theme.titlebarText,
			flex: 0,

			// TODO(personalizedrefrigerator): Why is division by two needed for consistency?
			paddingTop: (theme.titlebarText.paddingTop ?? 0) / 2,
			paddingBottom: (theme.titlebarText.paddingBottom ?? 0) / 2,
		},

		sliderUnits: {
			color: theme.color,
			fontSize: theme.fontSize,
			marginRight: 10,
		},
		settingDescriptionText: {
			color: theme.colorFaded,
			fontSize: theme.fontSizeSmaller,
			flex: 1,
			paddingLeft: theme.marginLeft,
			paddingRight: theme.marginRight,
			paddingBottom: theme.marginBottom,
		},
		permissionText: {
			color: theme.color,
			fontSize: theme.fontSize,
			flex: 1,
			marginTop: 10,
		},
		settingControl: settingControlStyle,
		textInput: {
			color: theme.color,
		},

		switchSettingText: {
			...settingTextStyle,
			width: '80%',
		},
		switchSettingContainer: {
			...settingContainerStyle,
			flexDirection: 'row',
			justifyContent: 'space-between',
		},

		headerTextStyle: theme.headerStyle,

		headerWrapperStyle: {
			...settingContainerStyle,
			...theme.headerWrapperStyle,
		},

		switchSettingControl: {
			...settingControlStyle,
			color: undefined,
			flex: 0,
		},
	};

	const styleSheet = StyleSheet.create(styles);

	return {
		styleSheet,

		selectedSectionButtonColor: theme.backgroundColorActive3,
		keyboardAppearance: theme.keyboardAppearance,
		getContainerStyle: (hasDescription) => {
			return !hasDescription ? styleSheet.settingContainer : styleSheet.settingContainerNoBottomBorder;
		},
	};
};

export default configScreenStyles;
