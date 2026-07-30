import * as React from 'react';
import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions, TextStyle, StyleProp, ViewStyle } from 'react-native';
import { themeStyle } from './global-style';
import BottomDrawer, { MenuAlignment, MenuType } from './BottomDrawer';
import { TouchableRipple, Text } from 'react-native-paper';
import Icon from './Icon';

interface MenuOptionDivider {
	isDivider: true;
}

export enum MenuOptionStyle {
	Normal = 'normal',
	Destructive = 'destructive',
}

export interface MenuOptionButton {
	key?: string;
	isDivider?: false|undefined;
	disabled?: boolean;
	style?: MenuOptionStyle;
	onPress: ()=> void;
	icon?: string;
	title: string;
}

export type MenuOption = MenuOptionDivider|MenuOptionButton;

interface Props {
	themeId: number;
	visible: boolean;
	style?: StyleProp<ViewStyle>;
	menuType?: MenuType;
	alignment: MenuAlignment;
	autoScrollToEnd?: boolean;
	title?: string;
	onDismiss: ()=> void;
	options: MenuOption[];
}

const useStyles = (themeId: number) => {
	const windowWidth = useWindowDimensions().width;
	return useMemo(() => {
		const theme = themeStyle(themeId);
		const dividerMargin = theme.marginSmall;

		return StyleSheet.create({
			title: {
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				// Match the space from button text to a neighbouring divider:
				paddingVertical: theme.marginMedium + dividerMargin,
				marginBottom: theme.marginSmall,

				lineHeight: theme.fontSizeLarger,
				fontSize: theme.fontSizeLarger,

				borderColor: theme.dividerColor,
				borderBottomWidth: 1,
			},
			menu: {
				paddingHorizontal: 0,
				width: 350,
				maxWidth: windowWidth,
			},
			menuContent: { flexDirection: 'column', width: '100%' },
			menuItem: {
				alignItems: 'flex-start',
				padding: theme.marginMedium,
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
			},
			menuItemContent: {
				flexDirection: 'row',
				gap: theme.marginSmall,
				alignItems: 'center',
			},
			menuItemText: {
				color: theme.color,
				fontSize: theme.fontSize,
			},
			menuItemTextDisabled: {
				opacity: theme.disabledOpacity,
			},
			menuItemTextDestructive: {
				color: theme.destructiveColor,
			},
			divider: {
				height: 0,
				borderBottomWidth: 1,
				borderColor: theme.dividerColor,
				marginVertical: dividerMargin,
				marginHorizontal: theme.margin,
			},
		});
	}, [themeId, windowWidth]);
};

const BottomDrawerMenu: React.FC<Props> = props => {
	const styles = useStyles(props.themeId);

	const menuOptionComponents: React.ReactNode[] = [];

	let keyCounter = 0;
	for (const option of props.options) {
		if (option.isDivider === true) {
			menuOptionComponents.push(
				<View key={`menuOption_divider_${keyCounter++}`} style={styles.divider} />,
			);
		} else {
			const key = `menuOption_${option.key ?? keyCounter++}`;
			const textStyles: TextStyle[] = [styles.menuItemText];
			if (option.disabled) {
				textStyles.push(styles.menuItemTextDisabled);
			}
			if (option.style === MenuOptionStyle.Destructive) {
				textStyles.push(styles.menuItemTextDestructive);
			}

			menuOptionComponents.push(
				<TouchableRipple
					borderless={true}
					role='button'
					style={styles.menuItem}
					onPress={() => {
						option.onPress();
						props.onDismiss();
					}}
					key={key}
					disabled={!!option.disabled}
				>
					<View style={styles.menuItemContent}>
						{option.icon && <Icon name={option.icon} style={textStyles} accessibilityLabel={null} />}
						<Text
							style={textStyles}
							disabled={option.disabled}
						>{option.title}</Text>
					</View>
				</TouchableRipple>,
			);
		}
	}

	const titleComponent = props.title ? <>
		<Text
			role='heading'
			variant='titleMedium'
			style={styles.title}
		>{props.title}</Text>
	</> : null;
	return <BottomDrawer
		visible={props.visible}
		onDismiss={props.onDismiss}
		alignment={props.alignment}
		autoScrollToEnd={props.autoScrollToEnd}
		draggable={true}
		menuType={props.menuType}
		contentStyle={styles.menu}
		style={props.style}
	>
		<View
			style={styles.menuContent}
			testID={`menu-content-${props.visible ? 'open' : 'closed'}`}
		>
			{titleComponent}
			{menuOptionComponents}
		</View>
	</BottomDrawer>;
};

export default BottomDrawerMenu;
