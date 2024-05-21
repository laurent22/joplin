import { TextStyle, ViewStyle, StyleSheet } from 'react-native';
import { themeStyle } from '../../global-style';

type SidebarButtonStyle = ViewStyle & { height: number };

export interface ConfigScreenStyleSheet {
	body: ViewStyle;

	settingContainer: ViewStyle;
	settingContainerNoBottomBorder: ViewStyle;
	headerWrapperStyle: ViewStyle;

	headerTextStyle: TextStyle;
	settingText: TextStyle;
	settingTextEmphasis: TextStyle;
	linkText: TextStyle;
	descriptionText: TextStyle;
	descriptionAlert: TextStyle;
	warningText: TextStyle;

	sliderUnits: TextStyle;
	settingDescriptionText: TextStyle;
	permissionText: TextStyle;
	textInput: TextStyle;

	switchSettingText: TextStyle;
	switchSettingContainer: ViewStyle;
	switchSettingControl: TextStyle;

	sidebarButton: SidebarButtonStyle;
	sidebarIcon: TextStyle;
	selectedSidebarButton: SidebarButtonStyle;
	sidebarButtonMainText: TextStyle;
	sidebarSelectedButtonText: TextStyle;
	sidebarButtonDescriptionText: TextStyle;

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

	const sidebarButtonHeight = theme.fontSize * 4 + 5;
	const sidebarButton: SidebarButtonStyle = {
		height: sidebarButtonHeight,
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		paddingEnd: theme.marginRight,
	};

	const sidebarButtonMainText: TextStyle = {
		color: theme.color,
		fontSize: theme.fontSize,
	};

	const fadedOpacity = 0.75;
	const sidebarButtonDescriptionText: TextStyle = {
		...sidebarButtonMainText,
		fontSize: theme.fontSizeSmaller,
		color: theme.color,
		opacity: fadedOpacity,
		paddingTop: 3,
	};

	const styleSheet = StyleSheet.create<ConfigScreenStyleSheet>({
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
		settingTextEmphasis: {
			fontWeight: 'bold',
			color: theme.color,
		},
		descriptionText: {
			color: theme.colorFaded,
			fontSize: theme.fontSizeSmaller,
			flex: 1,
		},
		descriptionAlert: {
			color: theme.color,
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


		sidebarButton,
		selectedSidebarButton: {
			...sidebarButton,
			backgroundColor: theme.selectedColor,
		},

		sidebarButtonMainText: sidebarButtonMainText,
		sidebarIcon: {
			...sidebarButtonMainText,
			textAlign: 'center',
			fontSize: 18,
			width: sidebarButtonHeight * 0.8,
			opacity: fadedOpacity,
		},
		sidebarSelectedButtonText: {
			...sidebarButtonMainText,
			fontWeight: 'bold',
		},
		sidebarButtonDescriptionText,
	});

	return {
		styleSheet,

		selectedSectionButtonColor: theme.selectedColor,
		keyboardAppearance: theme.keyboardAppearance,
		getContainerStyle: (hasDescription) => {
			return !hasDescription ? styleSheet.settingContainer : styleSheet.settingContainerNoBottomBorder;
		},
	};
};

export default configScreenStyles;
