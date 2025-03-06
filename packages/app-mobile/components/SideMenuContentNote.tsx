import * as React from 'react';
import { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ScrollView, View, ViewStyle } from 'react-native';
import { connect } from 'react-redux';
const Icon = require('react-native-vector-icons/Ionicons').default;
import { themeStyle } from './global-style';
import { AppState } from '../utils/types';

type Option = {
	title: string;
	onPress: ()=> void;
	isDivider?: false;
} | {
	title?: string;
	isDivider: true;
};

interface Props {
	themeId: number;
	options: Option[];
}

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		const buttonStyle: ViewStyle = {
			flex: 1,
			flexBasis: 'auto',
			flexDirection: 'row',
			height: 36,
			alignItems: 'center',
			paddingLeft: theme.marginLeft,
			paddingRight: theme.marginRight,
		};
		const sideButtonStyle = {
			...buttonStyle,
			flex: 0,
		};

		return StyleSheet.create({
			container: {
				flex: 1,
				borderRightWidth: 1,
				borderRightColor: theme.dividerColor,
				backgroundColor: theme.backgroundColor,
				paddingTop: 10,
			},
			menu: {
				flex: 1,
				backgroundColor: theme.backgroundColor,
			},
			button: buttonStyle,
			sidebarIcon: {
				fontSize: 22,
				color: theme.color,
			},
			sideButtonText: {
				color: theme.color,
			},
			sideButton: sideButtonStyle,
			sideButtonDisabled: {
				...sideButtonStyle,
				opacity: 0.6,
			},
			divider: {
				marginTop: 15,
				marginBottom: 15,
				flex: -1,
				borderBottomWidth: 1,
				borderBottomColor: theme.dividerColor,
			},
		});
	}, [themeId]);
};

const SideMenuContentNoteComponent: React.FC<Props> = props => {
	const styles = useStyles(props.themeId);

	const renderDivider = (key: string) => {
		return <View style={styles.divider} key={key}/>;
	};

	const renderSidebarButton = (key: string, title: string, iconName: string, onPressHandler: ()=> void) => {
		const content = (
			<View key={key} style={onPressHandler ? styles.sideButton : styles.sideButtonDisabled}>
				{!iconName ? null : <Icon name={iconName} style={styles.sidebarIcon} />}
				<Text style={styles.sideButtonText}>{title}</Text>
			</View>
		);

		if (!onPressHandler) return content;

		return (
			<TouchableOpacity
				key={key}
				onPress={onPressHandler}
				accessibilityRole='button'
			>
				{content}
			</TouchableOpacity>
		);
	};


	const items = [];

	const options = props.options ? props.options : [];
	let dividerIndex = 0;

	for (const option of options) {
		if (option.isDivider === true) {
			items.push(renderDivider(`divider_${dividerIndex++}`));
		} else {
			items.push(renderSidebarButton(option.title, option.title, null, option.onPress));
		}
	}

	return (
		<View style={styles.container}>
			<ScrollView scrollsToTop={false} style={styles.menu}>
				{items}
			</ScrollView>
		</View>
	);
};

export default connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
	};
})(SideMenuContentNoteComponent);
