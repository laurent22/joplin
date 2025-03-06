import * as React from 'react';
import { useCallback, useContext, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import createRootStyle from '../../utils/createRootStyle';
import ScreenHeader from '../ScreenHeader';
import { Profile, ProfileConfig } from '@joplin/lib/services/profileConfig/types';
import useProfileConfig from './useProfileConfig';
import { _ } from '@joplin/lib/locale';
import { deleteProfileById } from '@joplin/lib/services/profileConfig';
import { saveProfileConfig, switchProfile } from '../../services/profiles';
import { themeStyle } from '../global-style';
import shim from '@joplin/lib/shim';
import { DialogContext } from '../DialogManager';
import { FAB, List, Portal } from 'react-native-paper';
import { TextStyle } from 'react-native';
import useOnLongPressProps from '../../utils/hooks/useOnLongPressProps';
import { Dispatch } from 'redux';
import NavService from '@joplin/lib/services/NavService';

interface Props {
	themeId: number;
	dispatch: Dispatch;
}

const useStyle = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);

		return StyleSheet.create({
			...createRootStyle(themeId),
			fab: {
				position: 'absolute',
				margin: 16,
				right: 0,
				bottom: 0,
			},
			profileListItem: {
				paddingLeft: theme.margin,
				paddingRight: theme.margin,
			},
		});
	}, [themeId]);
};

interface ProfileItemProps {
	themeId: number;
	profile: Profile;
	profileConfig: ProfileConfig;
	setProfileConfigTime: (time: number)=> void;
}

const ProfileListItem: React.FC<ProfileItemProps> = ({ profile, profileConfig, setProfileConfigTime, themeId }) => {
	const dialogs = useContext(DialogContext);

	const onProfileItemPress = useCallback(async (profile: Profile) => {
		const doIt = async () => {
			try {
				await switchProfile(profile.id);
			} catch (error) {
				dialogs.prompt(_('Error'), _('Could not switch profile: %s', error.message));
			}
		};

		const switchProfileMessage = _('To switch the profile, the app is going to close and you will need to restart it.');
		if (shim.mobilePlatform() === 'web') {
			if (confirm(switchProfileMessage)) {
				void doIt();
			}
		} else {
			dialogs.prompt(
				_('Confirmation'),
				switchProfileMessage,
				[
					{
						text: _('Continue'),
						onPress: () => doIt(),
						style: 'default',
					},
					{
						text: _('Cancel'),
						onPress: () => {},
						style: 'cancel',
					},
				],
			);
		}
	}, [dialogs]);

	const onEditProfile = useCallback(async (profileId: string) => {
		await NavService.go('ProfileEditor', {
			profileId,
		});
	}, []);

	const onDeleteProfile = useCallback(async (profile: Profile) => {
		const doIt = async () => {
			try {
				const newConfig = deleteProfileById(profileConfig, profile.id);
				await saveProfileConfig(newConfig);
				setProfileConfigTime(Date.now());
			} catch (error) {
				dialogs.prompt(_('Error'), error.message);
			}
		};

		dialogs.prompt(
			_('Delete this profile?'),
			_('All data, including notes, notebooks and tags will be permanently deleted.'),
			[
				{
					text: _('Delete profile "%s"', profile.name),
					onPress: () => doIt(),
					style: 'destructive',
				},
				{
					text: _('Cancel'),
					onPress: () => {},
					style: 'cancel',
				},
			],
		);
	}, [dialogs, profileConfig, setProfileConfigTime]);

	const onConfigure = () => {
		dialogs.prompt(
			_('Configuration'),
			'',
			[
				{
					text: _('Edit'),
					onPress: () => onEditProfile(profile.id),
					style: 'default',
				},
				{
					text: _('Delete'),
					onPress: () => onDeleteProfile(profile),
					style: 'default',
				},
				{
					text: _('Close'),
					onPress: () => {},
					style: 'cancel',
				},
			],
		);
	};

	const longPressProps = useOnLongPressProps({
		onLongPress: () => onConfigure(),
		actionDescription: _('Edit'),
	});

	const style = useStyle(themeId);
	const isSelected = profile.id === profileConfig.currentProfileId;
	const titleStyle: TextStyle = { fontWeight: isSelected ? 'bold' : 'normal' };
	return (
		<List.Item
			title={profile.name}
			style={style.profileListItem}
			titleStyle={titleStyle}
			left={() => <List.Icon icon="file-account-outline" />}
			key={profile.id}
			onPress={() => { void onProfileItemPress(profile); }}
			{...longPressProps}

			accessibilityRole='button'
			accessibilityState={isSelected ? { selected: true } : null}
			aria-selected={isSelected ? true : null}
		/>
	);
};

export default (props: Props) => {
	const style = useStyle(props.themeId);
	const [profileConfigTime, setProfileConfigTime] = useState(Date.now());

	const profileConfig = useProfileConfig(profileConfigTime);

	const profiles = useMemo(() => {
		return profileConfig ? profileConfig.profiles : [];
	}, [profileConfig]);

	const extraListItemData = useMemo(() => {
		return { profileConfig, themeId: props.themeId };
	}, [props.themeId, profileConfig]);


	const renderProfileItem = (event: { item: Profile }) => {
		return <ProfileListItem
			profile={event.item}
			themeId={extraListItemData.themeId}
			profileConfig={extraListItemData.profileConfig}
			setProfileConfigTime={setProfileConfigTime}
		/>;
	};

	return (
		<View style={style.root}>
			<ScreenHeader title={_('Profiles')} showSaveButton={false} showSideMenuButton={false} showSearchButton={false} />
			<View>
				<FlatList
					data={profiles}
					renderItem={renderProfileItem}
					keyExtractor={profile => profile.id}
					// Needed so that the list rerenders when its dependencies change:
					extraData={extraListItemData}
				/>
			</View>
			<Portal>
				<FAB
					icon="plus"
					accessibilityLabel={_('New profile')}
					style={style.fab}
					onPress={() => {
						props.dispatch({
							type: 'NAV_GO',
							routeName: 'ProfileEditor',
						});
					}}
				/>
			</Portal>
		</View>
	);
};
