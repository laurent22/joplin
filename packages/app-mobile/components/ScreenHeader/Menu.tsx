import * as React from 'react';
import { useCallback, useState } from 'react';
import { themeStyle } from '../global-style';
import { TouchableRipple } from 'react-native-paper';
import BottomDrawerMenu, { MenuOption } from '../BottomDrawerMenu';
import { MenuAlignment } from '../BottomDrawer';

interface Props {
	themeId: number;
	options: MenuOption[];
	children: React.ReactNode;
}

const MenuComponent: React.FC<Props> = props => {
	const theme = themeStyle(props.themeId);

	const [open, setOpen] = useState(false);

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
		<BottomDrawerMenu
			visible={open}
			onDismiss={onMenuClosed}
			// To match the side of the screen with the action button:
			alignment={MenuAlignment.Right}
			themeId={props.themeId}
			options={props.options}
		/>
	</>;
};

export default MenuComponent;
