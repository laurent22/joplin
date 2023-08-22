const React = require('react');
import { useCallback, useMemo, useState } from 'react';
const { View, FlatList, StyleSheet } = require('react-native');
import createRootStyle from '../../utils/createRootStyle';
import ScreenHeader from '../ScreenHeader';
const { FAB, List } = require('react-native-paper');
import { Profile } from '@joplin/lib/services/profileConfig/types';
import useProfileConfig from './useProfileConfig';
import { Alert } from 'react-native';
import { _ } from '@joplin/lib/locale';
import { deleteProfileById } from '@joplin/lib/services/profileConfig';
import { saveProfileConfig, switchProfile } from '../../services/profiles';
const { themeStyle } = require('../global-style');

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

	const onProfileItemPress = useCallback(async (profile: Profile) => {
		const doIt = async () => {
			try {
				await switchProfile(profile.id);
			} catch (error) {
				Alert.alert(_('Could not switch profile: %s', error.message));
			}
		};

		Alert.alert(
			_('Confirmation'),
			_('To switch the profile, the app is going to close and you will need to restart it.'),
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
	}, []);

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
				Alert.alert(error.message);
			}
		};

		Alert.alert(
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
	}, [profileConfig]);

	const renderProfileItem = (event: any) => {
		const profile = event.item as Profile;
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
				onLongPress={() => {
					Alert.alert(
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
				}}
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
