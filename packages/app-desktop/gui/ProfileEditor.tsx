import * as React from 'react';
import { useState, useEffect, CSSProperties } from 'react';
import ButtonBar from './ConfigScreen/ButtonBar';
import { _ } from '@joplin/lib/locale';
import { connect } from 'react-redux';
import { themeStyle } from '@joplin/lib/theme';
import bridge from '../services/bridge';
import dialogs from './dialogs';
import { Profile, ProfileConfig } from '@joplin/lib/services/profileConfig/types';
import { deleteProfileById, saveProfileConfig } from '@joplin/lib/services/profileConfig';
import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
import { AppState } from '../app.reducer';
import { Dispatch } from 'redux';

const logger = Logger.create('ProfileEditor');

interface Props {
	themeId: number;
	dispatch: Dispatch;
	style: CSSProperties;
	profileConfig: ProfileConfig;
}

interface ProfileTableProps {
	profiles: Profile[];
	currentProfileId: string;
	onProfileRename: (profile: Profile)=> void;
	onProfileDelete: (profile: Profile)=> void;
	themeId: number;
}

const ProfileTableComp: React.FC<ProfileTableProps> = props => {
	const theme = themeStyle(props.themeId);

	return (
		<table className="profile-table">
			<thead>
				<tr>
					<th className="headerCell">{_('Profile name')}</th>
					<th className="headerCell">{_('ID')}</th>
					<th className="headerCell">{_('Status')}</th>
					<th className="headerCell">{_('Actions')}</th>
				</tr>
			</thead>
			<tbody>
				{props.profiles.map((profile: Profile, index: number) => {
					const isCurrentProfile = profile.id === props.currentProfileId;
					return (
						<tr key={index}>
							<td id={`name-${profile.id}`} className="nameCell">
								<span style={{ fontWeight: isCurrentProfile ? 'bold' : 'normal' }}>
									{profile.name || `(${_('Untitled')})`}
								</span>
							</td>
							<td className="dataCell">{profile.id}</td>
							<td className="dataCell">
								{isCurrentProfile ? _('Active') : ''}
							</td>
							<td className="dataCell profileActions">
								<button
									id={`rename-${profile.id}`}
									aria-labelledby={`rename-${profile.id} name-${profile.id}`}
									style={theme.buttonStyle}
									onClick={() => props.onProfileRename(profile)}
								>
									{_('Rename')}
								</button>
								{!isCurrentProfile && (
									<button
										id={`delete-${profile.id}`}
										aria-labelledby={`delete-${profile.id} name-${profile.id}`}
										style={theme.buttonStyle}
										onClick={() => props.onProfileDelete(profile)}
									>
										{_('Delete')}
									</button>
								)}
							</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
};

const ProfileEditorComponent: React.FC<Props> = props => {
	const { profileConfig, themeId, dispatch } = props;
	const theme = themeStyle(themeId);
	const style = props.style;
	const containerHeight = style.height;

	const [profiles, setProfiles] = useState<Profile[]>(profileConfig.profiles);

	useEffect(() => {
		setProfiles(profileConfig.profiles);
	}, [profileConfig]);

	const saveNewProfileConfig = async (makeNewProfileConfig: ()=> ProfileConfig) => {
		try {
			const newProfileConfig = makeNewProfileConfig();
			await saveProfileConfig(`${Setting.value('rootProfileDir')}/profiles.json`, newProfileConfig);
			dispatch({
				type: 'PROFILE_CONFIG_SET',
				value: newProfileConfig,
			});
		} catch (error) {
			logger.error(error);
			bridge().showErrorMessageBox(error.message);
		}
	};

	const onProfileRename = async (profile: Profile) => {
		const newName = await dialogs.prompt(_('Profile name:'), '', profile.name);
		if (newName === null || newName === undefined || newName === profile.name) return;

		if (!newName.trim()) {
			bridge().showErrorMessageBox(_('Profile name cannot be empty'));
			return;
		}

		const makeNewProfileConfig = () => {
			const newProfiles = profileConfig.profiles.map(p =>
				p.id === profile.id ? { ...p, name: newName.trim() } : p,
			);

			const newProfileConfig = {
				...profileConfig,
				profiles: newProfiles,
			};

			return newProfileConfig;
		};

		await saveNewProfileConfig(makeNewProfileConfig);
	};

	const onProfileDelete = async (profile: Profile) => {
		const isCurrentProfile = profile.id === profileConfig.currentProfileId;
		if (isCurrentProfile) {
			bridge().showErrorMessageBox(_('The active profile cannot be deleted. Switch to a different profile and try again.'));
			return;
		}

		const ok = bridge().showConfirmMessageBox(_('Delete profile "%s"?\n\nAll data, including notes, notebooks and tags will be permanently deleted.', profile.name), {
			buttons: [_('Delete'), _('Cancel')],
			defaultId: 1,
		});
		if (!ok) return;

		const rootDir = Setting.value('rootProfileDir');
		const profileDir = `${rootDir}/profile-${profile.id}`;

		try {
			await shim.fsDriver().remove(profileDir);
			logger.info('Deleted profile directory: ', profileDir);
		} catch (error) {
			logger.error('Error deleting profile directory: ', error);
			bridge().showErrorMessageBox(error.message);
		}

		await saveNewProfileConfig(() => deleteProfileById(profileConfig, profile.id));
	};

	return (
		<div className="profile-management" style={{ ...theme.containerStyle, height: containerHeight }}>
			<div className="tableContainer">
				<div className="notification" style={theme.notificationBox}>
					{_('Manage your profiles. You can rename or delete profiles. The active profile cannot be deleted.')}
				</div>
				<ProfileTableComp
					themeId={themeId}
					profiles={profiles}
					currentProfileId={profileConfig.currentProfileId}
					onProfileRename={onProfileRename}
					onProfileDelete={onProfileDelete}
				/>
			</div>
			<ButtonBar
				onCancelClick={() => dispatch({ type: 'NAV_BACK' })}
			/>
		</div>
	);
};

const mapStateToProps = (state: AppState) => ({
	themeId: state.settings.theme,
	profileConfig: state.profileConfig,
});

export default connect(mapStateToProps)(ProfileEditorComponent);
