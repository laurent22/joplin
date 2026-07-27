import * as React from 'react';
import { useState, useCallback, useMemo, useRef } from 'react';
import { FAB } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import { Dispatch } from 'redux';
import { AccessibilityActionEvent, AccessibilityActionInfo, StyleSheet, useWindowDimensions, View } from 'react-native';
import { connect } from 'react-redux';
import { MenuAlignment, MenuType } from '../BottomDrawer';
import { Ionicons as Icon } from '@react-native-vector-icons/ionicons';
import BottomDrawerMenu, { MenuOption } from '../BottomDrawerMenu';
import { AppState } from '../../utils/types';
import { themeStyle } from '../global-style';

type OnButtonPress = ()=> void;
interface ButtonSpec {
	icon: string;
	label: string;
	color?: string;
	onPress?: OnButtonPress;
}

interface ActionButtonProps {
	themeId: number;

	// If not given, an "add" button will be used.
	mainButton: ButtonSpec;
	dispatch: Dispatch;

	menuContent?: MenuOption[];
	onMenuShow?: ()=> void;

	accessibilityActions?: readonly AccessibilityActionInfo[];
	// Can return a Promise to simplify unit testing
	onAccessibilityAction?: (event: AccessibilityActionEvent)=> void|Promise<void>;
	accessibilityHint?: string;
}

// Returns a render function compatible with React Native Paper.
const getIconRenderFunction = (iconName: string) => {
	type NameProp = React.ComponentProps<typeof Icon>['name'];
	return (props: Omit<React.ComponentProps<typeof Icon>, 'name'>) => <Icon name={iconName as NameProp} {...props} />;
};

const useIcon = (iconName: string) => {
	return useMemo(() => {
		return getIconRenderFunction(iconName);
	}, [iconName]);
};

interface StylesProps {
	buttonTop: number;
	themeId: number;
}

const useStyles = ({ buttonTop, themeId }: StylesProps) => {
	const { height: windowHeight } = useWindowDimensions();
	return useMemo(() => {
		const theme = themeStyle(themeId);
		return StyleSheet.create({
			menu: {
				marginBottom: (windowHeight - buttonTop) + theme.marginBottom,
				// Always float right:
				alignSelf: 'flex-end',
			},
			buttonContainer: {
				position: 'absolute',
				bottom: 10,
				right: 10,
			},
			button: {
				alignSelf: 'flex-end',
			},
		});
	}, [buttonTop, windowHeight, themeId]);
};

const FloatingActionButton = (props: ActionButtonProps) => {
	const [open, setOpen] = useState(false);
	const onMenuToggled = useCallback(() => {
		const newOpen = !open;
		if (newOpen) {
			props.dispatch({
				type: 'SIDE_MENU_CLOSE',
			});
		}
		setOpen(newOpen);
	}, [setOpen, open, props.dispatch]);

	const onDismiss = useCallback(() => {
		if (open) onMenuToggled();
	}, [open, onMenuToggled]);

	const mainButtonRef = useRef<View>(null);

	const closedIcon = useIcon(props.mainButton?.icon ?? 'add');
	const openIcon = useIcon('close');

	const label = props.mainButton?.label ?? _('Add new');

	const [buttonTop, setButtonTop] = useState(0);
	const styles = useStyles({ buttonTop, themeId: props.themeId });

	const menuButton = <FAB
		ref={mainButtonRef}
		icon={open ? openIcon : closedIcon}
		accessibilityLabel={label}
		onPress={props.mainButton?.onPress ?? onMenuToggled}
		style={styles.button}
		accessibilityActions={props.accessibilityActions}
		onAccessibilityAction={props.onAccessibilityAction}
	/>;

	const buttonContainerRef = useRef<View|null>(null);
	return <>
		<View
			style={styles.buttonContainer}
			ref={buttonContainerRef}
			onLayout={() => {
				buttonContainerRef.current?.measure((_x, _y, _width, _height, _pageX, pageY) => {
					setButtonTop(pageY);
				});
			}}
		>
			{menuButton}
		</View>
		{ props.menuContent && <BottomDrawerMenu
			visible={open}
			onDismiss={onDismiss}
			alignment={MenuAlignment.Right}
			style={styles.menu}
			menuType={MenuType.Floating}
			themeId={props.themeId}
			options={props.menuContent}
		/> }
	</>;
};

const ConnectedComponent: React.FC<Omit<ActionButtonProps, 'themeId'|'dispatch'>> = (
	connect((state: AppState) => ({ themeId: state.settings.theme }))(FloatingActionButton)
);
export default ConnectedComponent;
