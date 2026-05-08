import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, TextStyle, View, Text, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { themeStyle } from '../global-style';
import { Menu, MenuOption as MenuOptionComponent, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
import AccessibleView from '../accessibility/AccessibleView';
import debounce from '../../utils/debounce';
import FocusControl from '../accessibility/FocusControl/FocusControl';
import { ModalState } from '../accessibility/FocusControl/types';
import useKeyboardState from '../../utils/hooks/useKeyboardState';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();
	const safeAreaInsets = useSafeAreaInsets();
	const { dockedKeyboardHeight: keyboardHeight } = useKeyboardState();

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

		const isLandscape = windowWidth > windowHeight;
		const extraPadding = isLandscape ? 25 : 50;

		// When a docked on-screen keyboard is showing, we want to maximise the height of the menu as much as possible, due to the limited available space.
		// However, when the on-screen keyboard is hidden or floating in either portrait or landscape orientation, it is less of an issue to have excess in the amount
		// of padding, to ensure nothing is cut off on all varieties of supported mobile platforms with different input and navigation bar settings. In particular,
		// on Android it is not possible to distinguish between a floating keyboard and a horizontal input bar which is docked, but the latter requires a larger
		// reduction in height. For this reason we use a fixed value for insetOrExtraFullscreenPadding when the keyboard height is zero. However, Android versions
		// earlier than 15 have an IME toolbar in addition to the input toolbar when using an external keyboard, so to cater for this scenario, we can use the fixed
		// value if the keyboardHeight is <= 25 (as any proper on-screen keyboard would be much taller than this). If the keyboard height is larger than this, we can assume
		// a docked keyboard is visible, so we only need cater for the insets in addition to the fixed extraPadding required for compatibility across Android versions
		const insetOrExtraFullscreenPadding = keyboardHeight <= 25 ? 70 : safeAreaInsets.top + safeAreaInsets.bottom;
		const maxMenuHeight = windowHeight - keyboardHeight - extraPadding - insetOrExtraFullscreenPadding;

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
				maxHeight: maxMenuHeight,
			},
			contextMenuButton: {
				padding: 0,
			},
		});
	}, [themeId, windowWidth, windowHeight, safeAreaInsets, keyboardHeight]);
};

const MenuComponent: React.FC<Props> = props => {
	const styles = useStyles(props.themeId);

	const menuOptionComponents: React.ReactNode[] = [];

	// When undefined/null: Don't auto-focus anything.
	const [refocusCounter, setRefocusCounter] = useState<number|undefined>(undefined);

	let keyCounter = 0;
	let isFirst = true;
	for (const option of props.options) {
		if (option.isDivider === true) {
			menuOptionComponents.push(
				<View key={`menuOption_divider_${keyCounter++}`} style={styles.divider} />,
			);
		} else {
			// Don't auto-focus on iOS -- as of RN 0.74, this causes focus to get stuck. However,
			// the auto-focus seems to be necessary on web (and possibly Android) to avoid first focusing
			// the dismiss button and other items not in the menu:
			const canAutoFocus = isFirst && Platform.OS !== 'ios';
			const key = `menuOption_${option.key ?? keyCounter++}`;
			menuOptionComponents.push(
				<MenuOptionComponent value={option.onPress} key={key} style={styles.contextMenuItem} disabled={!!option.disabled}>
					<AccessibleView refocusCounter={canAutoFocus ? refocusCounter : undefined} testID={key}>
						<Text
							style={option.disabled ? styles.contextMenuItemTextDisabled : styles.contextMenuItemText}
							disabled={option.disabled}
						>{option.title}</Text>
					</AccessibleView>
				</MenuOptionComponent>,
			);

			isFirst = false;
		}
	}

	const [open, setOpen] = useState(false);

	const onMenuItemSelect = useCallback((value: unknown) => {
		if (typeof value === 'function') {
			value();
		}
		setRefocusCounter(undefined);
		setOpen(false);
	}, []);

	// debounce: If the menu is focused during its transition animation, it briefly
	// appears to be in the wrong place. As such, add a brief delay before focusing.
	const onMenuOpened = useMemo(() => debounce(() => {
		setRefocusCounter(counter => (counter ?? 0) + 1);
		setOpen(true);
	}, 200), []);

	// Resetting the refocus counter to undefined causes the menu to not be focused immediately
	// after opening.
	const onMenuClosed = useCallback(() => {
		setRefocusCounter(undefined);
		setOpen(false);
	}, []);

	return (
		<Menu
			onSelect={onMenuItemSelect}
			onClose={onMenuClosed}
			onOpen={onMenuOpened}
			style={styles.contextMenu}
		>
			<MenuTrigger style={styles.contextMenuButton} testID='screen-header-menu-trigger'>
				{props.children}
			</MenuTrigger>
			<MenuOptions>
				<FocusControl.ModalWrapper state={open ? ModalState.Open : ModalState.Closed}>
					<ScrollView
						style={styles.menuContentScroller}
						testID={`menu-content-${open ? 'open' : 'closed'}`}
					>{menuOptionComponents}</ScrollView>
				</FocusControl.ModalWrapper>
			</MenuOptions>
		</Menu>
	);
};

export default MenuComponent;
