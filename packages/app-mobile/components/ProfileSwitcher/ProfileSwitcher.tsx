const React = require('react');
import { useCallback, useMemo, useState } from 'react';
const { View, FlatList, StyleSheet } = require('react-native');
import createRootStyle from '../../utils/createRootStyle';
import ScreenHeader from '../ScreenHeader';
const { FAB, List } = require('react-native-paper');
import { DefaultProfileId, Profile } from '@joplin/lib/services/profileConfig/types';
import useProfileConfig from './useProfileConfig';
import { Alert } from 'react-native';
import { _ } from '@joplin/lib/locale';
import { deleteProfileById } from '@joplin/lib/services/profileConfig';
import { saveProfileConfig } from '../../services/profiles';

interface Props {
	themeId: number;
	dispatch: Function;
}

const useStyle = (themeId: number) => {
	return useMemo(() => {
		return StyleSheet.create({
			...createRootStyle(themeId),
			fab: {
				position: 'absolute',
				margin: 16,
				right: 0,
				bottom: 0,
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

	const onProfileItemPress = useCallback((profile: Profile) => {
		props.dispatch({
			type: 'NAV_GO',
			routeName: 'ProfileEditor',
			profileId: profile.id,
		});
	}, [props.dispatch]);

	const onEditProfile = useCallback(async (profileId: string) => {
		props.dispatch({
			type: 'NAV_GO',
			routeName: 'ProfileEditor',
			profileId: profileId,
		});
	}, [props.dispatch]);

	const onDeleteProfile = useCallback(async (profile: Profile) => {
		const doIt = async () => {
			if (profile.id === DefaultProfileId) {
				Alert.alert('The default profile cannot be deleted');
				return;
			}

			const newConfig = deleteProfileById(profileConfig, profile.id);
			await saveProfileConfig(newConfig);
			setProfileConfigTime(Date.now());
		};

		Alert.alert(
			'Delete this profile?',
			'All data, including notes, notebooks and tags will be permanently deleted.',
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
			]
		);
	}, [profileConfig]);

	const renderProfileItem = (event: any) => {
		const profile = event.item as Profile;
		return (
			<List.Item
				title={profile.name}
				left={() => <List.Icon icon="file-account-outline" />}
				key={profile.id}
				profileId={profile.id}
				onPress={() => onProfileItemPress(profile)}
				onLongPress={() => {
					Alert.alert(
						'Configuration',
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
						]
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
