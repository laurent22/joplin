const React = require('react');
const { connect } = require('react-redux');
const SideMenu_ = require('react-native-side-menu-updated').default;
import { Dimensions, DrawerLayoutAndroid, Platform } from 'react-native';
import { State } from '@joplin/lib/reducer';
import { FunctionComponent, useEffect, useRef } from 'react';

type DrawerStateChangeCallback = (isOpen: boolean)=> void;

interface Props {
	menu: JSX.Element;
	edgeHitWidth: number;
	menuPosition: 'left' | 'right';
	isOpen?: boolean;
	openMenuOffset?: number;
	onDrawerStateChange?: DrawerStateChangeCallback;
}

class SideMenuFallback extends SideMenu_ {
	public onLayoutChange(e: any) {
		const { width, height } = e.nativeEvent.layout;
		const openMenuOffsetPercentage = this.props.openMenuOffset / Dimensions.get('window').width;
		const openMenuOffset = width * openMenuOffsetPercentage;
		const hiddenMenuOffset = width * this.state.hiddenMenuOffsetPercentage;
		this.setState({ width, height, openMenuOffset, hiddenMenuOffset });
	}
}

const SideMenuComponent: FunctionComponent<Props> = ({
	children,
	...props
}) => {
	const androidLayoutRef = useRef<DrawerLayoutAndroid>();

	useEffect(() => {
		if (androidLayoutRef.current) {
			if (props.isOpen) {
				androidLayoutRef.current.openDrawer();
			} else {
				androidLayoutRef.current.closeDrawer();
			}
		}
	}, [props.isOpen, androidLayoutRef]);

	if (Platform.OS === 'android') {
		return (
			<DrawerLayoutAndroid
				// Need to do this if the drawer position switches from left to right
				// Otherwise, there's a bug
				// To reproduce:
				// - Open menu with no note open
				// - Close menu
				// - Open note
				// - Open menu from the right
				// - Menu flashes into open state
				key={`drawer-${props.menuPosition}`}
				ref={androidLayoutRef}
				renderNavigationView={() => props.menu}
				drawerPosition={props.menuPosition}
				drawerWidth={props.openMenuOffset}
				onDrawerOpen={() => (props.onDrawerStateChange && props.onDrawerStateChange(true))}
				onDrawerClose={() => (props.onDrawerStateChange && props.onDrawerStateChange(false))}
				{...props}
			>
				{children}
			</DrawerLayoutAndroid>
		);
	}

	return (
		// Need @ts-ignore here because the old react-native-side-menu-updated won't work with TypeScript
		// @ts-ignore
		<SideMenuFallback {...props} onChange={props.onDrawerStateChange}>
			{children}
		</SideMenuFallback>
	);
};

const SideMenu = connect((state: State) => {
	return {
		isOpen: state.showSideMenu,
	};
})(SideMenuComponent);

export default SideMenu;
