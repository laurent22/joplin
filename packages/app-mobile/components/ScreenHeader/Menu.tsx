import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, TextStyle, View, Text, ScrollView, useWindowDimensions } from 'react-native';
import { themeStyle } from '../global-style';
import { Menu, MenuOption as MenuOptionComponent, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
import AccessibleView from '../accessibility/AccessibleView';
import debounce from '../../utils/debounce';

interface MenuOptionDivider {
	isDivider: true;
}

interface MenuOptionButton {
	key?: string;
	isDivider?: false|undefined;
	disabled?: boolean;
	onPress: ()=> void;
	title: string;
}

export type MenuOptionType = MenuOptionDivider|MenuOptionButton;

interface Props {
	themeId: number;
	options: MenuOptionType[];
	children: React.ReactNode;
}

const useStyles = (themeId: number) => {
	const { height: windowHeight } = useWindowDimensions();

	return useMemo(() => {
		const theme = themeStyle(themeId);

		const contextMenuItemTextBase: TextStyle = {
			flex: 1,
			textAlignVertical: 'center',
			paddingLeft: theme.marginLeft,
			paddingRight: theme.marginRight,
			paddingTop: theme.itemMarginTop,
			paddingBottom: theme.itemMarginBottom,
			color: theme.color,
			backgroundColor: theme.backgroundColor,
			fontSize: theme.fontSize,
		};

		return StyleSheet.create({
			divider: {
				borderBottomWidth: 1,
				borderColor: theme.dividerColor,
				backgroundColor: '#0000ff',
			},
			contextMenu: {
				backgroundColor: theme.backgroundColor2,
			},
			contextMenuItem: {
				backgroundColor: theme.backgroundColor,
			},
			contextMenuItemText: {
				...contextMenuItemTextBase,
			},
			contextMenuItemTextDisabled: {
				...contextMenuItemTextBase,
				opacity: 0.5,
			},
			menuContentScroller: {
				maxHeight: windowHeight - 50,
			},
			contextMenuButton: {
				padding: 0,
			},
		});
	}, [themeId, windowHeight]);
};

const MenuComponent: React.FC<Props> = props => {
	const styles = useStyles(props.themeId);

	const menuOptionComponents: React.ReactNode[] = [];

	// When undefined/null: Don't auto-focus anything.
	const [refocusCounter, setRefocusCounter] = useState<number|undefined>(undefined);

	let key = 0;
	let isFirst = true;
	for (const option of props.options) {
		if (option.isDivider === true) {
			menuOptionComponents.push(
				<View key={`menuOption_divider_${key++}`} style={styles.divider} />,
			);
		} else {
			const canAutoFocus = isFirst;
			menuOptionComponents.push(
				<MenuOptionComponent value={option.onPress} key={`menuOption_${option.key ?? key++}`} style={styles.contextMenuItem} disabled={!!option.disabled}>
					<AccessibleView refocusCounter={canAutoFocus ? refocusCounter : undefined}>
						<Text
							style={option.disabled ? styles.contextMenuItemTextDisabled : styles.contextMenuItemText}
							disabled={!!option.disabled}
						>{option.title}</Text>
					</AccessibleView>
				</MenuOptionComponent>,
			);

			isFirst = false;
		}
	}

	const onMenuItemSelect = useCallback((value: unknown) => {
		if (typeof value === 'function') {
			value();
		}
		setRefocusCounter(undefined);
	}, []);

	// debounce: If the menu is focused during its transition animation, it briefly
	// appears to be in the wrong place. As such, add a brief delay before focusing.
	const onMenuOpen = useMemo(() => debounce(() => {
		setRefocusCounter(counter => (counter ?? 0) + 1);
	}, 200), []);

	// Resetting the refocus counter to undefined causes the menu to not be focused immediately
	// after opening.
	const onMenuClose = useCallback(() => {
		setRefocusCounter(undefined);
	}, []);

	return (
		<Menu
			onSelect={onMenuItemSelect}
			onClose={onMenuClose}
			onOpen={onMenuOpen}
			style={styles.contextMenu}
		>
			<MenuTrigger style={styles.contextMenuButton} testID='screen-header-menu-trigger'>
				{props.children}
			</MenuTrigger>
			<MenuOptions>
				<ScrollView
					style={styles.menuContentScroller}
					aria-modal={true}
					accessibilityViewIsModal={true}
					testID={`menu-content-${refocusCounter ? 'refocusing' : ''}`}
				>{menuOptionComponents}</ScrollView>
			</MenuOptions>
		</Menu>
	);
};

export default MenuComponent;
