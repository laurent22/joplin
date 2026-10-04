import * as React from 'react';

import { ProfileConfig } from '@joplin/lib/services/profileConfig/types';
import SidebarIcon, { IconStyle } from './SidebarIcon';
import SideMenuItem, { ToggleState } from './SideMenuItem';
import { _ } from '@joplin/lib/locale';
import { Dispatch } from 'redux';
import NavService from '@joplin/lib/services/NavService';
import { StyleProp } from 'react-native';
import { useCallback } from 'react';

interface Props {
	dispatch: Dispatch;
	profileConfig: ProfileConfig;
	iconStyle: StyleProp<IconStyle>;
	themeId: number;
}

const BottomPanelActions: React.FC<Props> = props => {
	type SidebarButtonOptions = {
		onPress: ()=> void;
	};
	const renderSidebarButton = (
		key: string,
		title: string,
		iconName: string,
		{ onPress }: SidebarButtonOptions,
	) => {
		const icon = <SidebarIcon icon={`ionicon ${iconName}`} style={props.iconStyle} />;

		return (
			<SideMenuItem
				key={key}
				text={title}
				touchableProps={{
					onPress: onPress,
				}}
				depth={0}
				selected={false}
				icon={icon}
				themeId={props.themeId}
				toggleState={ToggleState.Hidden}
			/>
		);
	};
	const tagButton_press = useCallback(() => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });
		void NavService.go('Tags');
	}, [props.dispatch]);

	const switchProfileButton_press = useCallback(() => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });
		void NavService.go('ProfileSwitcher');
	}, [props.dispatch]);

	const configButton_press = useCallback(() => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });
		void NavService.go('Config');
	}, [props.dispatch]);

	const newFolderButton_press = useCallback(() => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });
		void NavService.go('Folder', { folderId: null });
	}, [props.dispatch]);

	const items = [];

	items.push(renderSidebarButton('newFolder_button', _('New Notebook'), 'folder-open-outline', { onPress: newFolderButton_press }));
	items.push(renderSidebarButton('tag_button', _('Tags'), 'pricetag-outline', { onPress: tagButton_press }));

	if (props.profileConfig && props.profileConfig.profiles.length > 1) {
		items.push(renderSidebarButton('switchProfile_button', _('Switch profile'), 'people-circle-outline', { onPress: switchProfileButton_press }));
	}

	items.push(renderSidebarButton('config_button', _('Configuration'), 'settings-outline', { onPress: configButton_press }));

	return <>
		{items}
	</>;
};

export default BottomPanelActions;
