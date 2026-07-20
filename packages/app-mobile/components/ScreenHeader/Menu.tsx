import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, Text, useWindowDimensions, TextStyle } from 'react-native';
import { themeStyle } from '../global-style';
import BottomDrawer from '../BottomDrawer';
import { TouchableRipple } from 'react-native-paper';
import Icon from '../Icon';

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

export type MenuOptionType = MenuOptionDivider|MenuOptionButton;

interface Props {
	themeId: number;
	options: MenuOptionType[];
	children: React.ReactNode;
}

const useStyles = (themeId: number) => {
	const windowWidth = useWindowDimensions().width;
	return useMemo(() => {
		const theme = themeStyle(themeId);

		return StyleSheet.create({
			menu: {
				paddingHorizontal: 0,
			},
			menuContent: { flexDirection: 'column', width: '100%' },
			menuItem: {
				alignItems: 'flex-start',
				padding: theme.margin,
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				minWidth: Math.min(350, windowWidth),
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
				marginVertical: theme.marginSmall,
				marginHorizontal: theme.margin,
			},
		});
	}, [themeId, windowWidth]);
};

const MenuComponent: React.FC<Props> = props => {
	const styles = useStyles(props.themeId);
	const theme = themeStyle(props.themeId);

	const menuOptionComponents: React.ReactNode[] = [];

	const [open, setOpen] = useState(false);

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
						setOpen(false);
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

	const onMenuClosed = useCallback(() => {
		setOpen(false);
	}, []);

	return <>
		<TouchableRipple
			borderless={true}
			onPress={() => setOpen(true)}
			rippleColor={theme.backgroundColorTransparent2}
			role='button'
			testID='screen-header-menu-trigger'
		>
			{props.children}
		</TouchableRipple>
		<BottomDrawer
			visible={open}
			onDismiss={onMenuClosed}
			draggable={true}
			style={styles.menu}
		>
			<View
				style={styles.menuContent}
				testID={`menu-content-${open ? 'open' : 'closed'}`}
			>
				{menuOptionComponents}
			</View>
		</BottomDrawer>
	</>;
};

export default MenuComponent;
