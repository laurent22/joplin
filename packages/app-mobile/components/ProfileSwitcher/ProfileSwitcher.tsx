const React = require('react');
import { useCallback, useContext, useMemo, useState } from 'react';
const { View, FlatList, StyleSheet } = require('react-native');
import createRootStyle from '../../utils/createRootStyle';
import ScreenHeader from '../ScreenHeader';
const { FAB, List } = require('react-native-paper');
import { Profile } from '@joplin/lib/services/profileConfig/types';
import useProfileConfig from './useProfileConfig';
import { _ } from '@joplin/lib/locale';
import { deleteProfileById } from '@joplin/lib/services/profileConfig';
import { saveProfileConfig, switchProfile } from '../../services/profiles';
import { themeStyle } from '../global-style';
import shim from '@joplin/lib/shim';
import { DialogContext } from '../DialogManager';

interface Props {
	themeId: number;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	dispatch: Function;
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

export default (props: Props) => {
	const style = useStyle(props.themeId);
	const [profileConfigTime, setProfileConfigTime] = useState(Date.now());

	const profileConfig = useProfileConfig(profileConfigTime);

	const profiles = useMemo(() => {
		return profileConfig ? profileConfig.profiles : [];
	}, [profileConfig]);

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
		props.dispatch({
			type: 'NAV_GO',
			routeName: 'ProfileEditor',
			profileId: profileId,
		});
	}, [props.dispatch]);

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
	}, [dialogs, profileConfig]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const renderProfileItem = (event: any) => {
		const profile = event.item as Profile;
		const onConfigure = (event: Event) => {
			event.preventDefault();

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

		const titleStyle = { fontWeight: profile.id === profileConfig.currentProfileId ? 'bold' : 'normal' };
		return (
			<List.Item
				title={profile.name}
				style={style.profileListItem}
				titleStyle={titleStyle}
				left={() => <List.Icon icon="file-account-outline" />}
				key={profile.id}
				profileId={profile.id}
				onPress={() => { void onProfileItemPress(profile); }}
				onLongPress={onConfigure}
				onContextMenu={onConfigure}
			/>
		);
	};

	return (
		<View style={style.root}>
			<ScreenHeader title={_('Profiles')} showSaveButton={false} showSideMenuButton={false} showSearchButton={false} />
			<View>
				<FlatList
					data={profiles}
					renderItem={renderProfileItem}
					keyExtractor={(profile: Profile) => profile.id}
				/>
			</View>
			<FAB
				icon="plus"
				style={style.fab}
				onPress={() => {
					props.dispatch({
						type: 'NAV_GO',
						routeName: 'ProfileEditor',
					});
				}}
			/>

		</View>
	);
};
