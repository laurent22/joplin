import * as React from 'react';
import ButtonBar from './ConfigScreen/ButtonBar';
import { _ } from '@joplin/lib/locale';

const { connect } = require('react-redux');
const { themeStyle } = require('@joplin/lib/theme');
import bridge from '../services/bridge';
import dialogs from './dialogs';
import { ProfileConfig, Profile } from '@joplin/lib/services/profileConfig/types';
import { deleteProfileById, saveProfileConfig } from '@joplin/lib/services/profileConfig';
import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('ProfileManagementScreen');

interface Style {
	width: number;
	height: number;
}

interface Props {
	themeId: number;
	style: Style;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Changing types for these variables would be too big of a refactoring
	dispatch: Function;
	profileConfig: ProfileConfig;
}

interface State {
	profiles: Profile[];
	filter: string;
}

interface ProfileTable {
	profiles: Profile[];
	currentProfileId: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Assigning types to these variables would be too big of a refactoring
	onProfileRename: (profile: Profile)=> any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Assigning types to these variables would be too big of a refactoring
	onProfileDelete: (profile: Profile)=> any;
	filter: string;
	themeId: number;
	style: Style;
}

const ProfileTableComp = (props: ProfileTable) => {
	const theme = themeStyle(props.themeId);

	const nameCellStyle = {
		...theme.textStyle,
		textOverflow: 'ellipsis',
		overflowX: 'hidden',
		maxWidth: 1,
		width: '100%',
		whiteSpace: 'nowrap',
	};

	const cellStyle = {
		...theme.textStyle,
		whiteSpace: 'nowrap',
		color: theme.colorFaded,
		width: 1,
	};

	const headerStyle = {
		...theme.textStyle,
		whiteSpace: 'nowrap',
		width: 1,
		fontWeight: 'bold',
	};

	const filteredProfiles = props.profiles.filter(
		(profile: Profile) => !props.filter || profile.name?.toLowerCase().includes(props.filter.toLowerCase()) || profile.id.includes(props.filter),
	);

	return (
		<table style={{ width: '100%' }}>
			<thead>
				<tr>
					<th style={headerStyle}>{_('Profile name')}</th>
					<th style={headerStyle}>{_('ID')}</th>
					<th style={headerStyle}>{_('Status')}</th>
					<th style={headerStyle}>{_('Actions')}</th>
				</tr>
			</thead>
			<tbody>
				{filteredProfiles.map((profile: Profile, index: number) => {
					const isCurrentProfile = profile.id === props.currentProfileId;
					return (
						<tr key={index}>
							<td id={`name-${profile.id}`} style={nameCellStyle} className="nameCell">
								<span style={{ fontWeight: isCurrentProfile ? 'bold' : 'normal' }}>
									{profile.name || `(${_('Untitled')})`}
								</span>
							</td>
							<td style={cellStyle} className="dataCell">{profile.id}</td>
							<td style={cellStyle} className="dataCell">
								{isCurrentProfile ? _('Active') : ''}
							</td>
							<td style={cellStyle} className="dataCell">
								<button
									id={`rename-${profile.id}`}
									aria-labelledby={`rename-${profile.id} name-${profile.id}`}
									style={{ ...theme.buttonStyle, marginRight: 10 }}
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

class ProfileManagementScreenComponent extends React.Component<Props, State> {
	public constructor(props: Props) {
		super(props);
		this.state = {
			profiles: props.profileConfig.profiles,
			filter: '',
		};
	}

	public componentDidUpdate(prevProps: Props) {
		if (prevProps.profileConfig !== this.props.profileConfig) {
			this.setState({ profiles: this.props.profileConfig.profiles });
		}
	}

	public onProfileRename = async (profile: Profile) => {
		const newName = await dialogs.prompt(_('Profile name:'), '', profile.name);
		if (newName === null || newName === undefined || newName === profile.name) {
			return;
		}

		if (!newName.trim()) {
			bridge().showErrorMessageBox(_('Profile name cannot be empty'));
			return;
		}

		try {
			const newProfiles = this.props.profileConfig.profiles.map(p => {
				if (p.id === profile.id) {
					return {
						...p,
						name: newName.trim(),
					};
				}
				return p;
			});

			const newProfileConfig = {
				...this.props.profileConfig,
				profiles: newProfiles,
			};

			await saveProfileConfig(`${Setting.value('rootProfileDir')}/profiles.json`, newProfileConfig);
			this.props.dispatch({
				type: 'PROFILE_CONFIG_SET',
				value: newProfileConfig,
			});
		} catch (error) {
			logger.error(error);
			bridge().showErrorMessageBox(error.message);
		}
	};

	public onProfileDelete = async (profile: Profile) => {
		const isCurrentProfile = profile.id === this.props.profileConfig.currentProfileId;
		if (isCurrentProfile) {
			bridge().showErrorMessageBox(_('The active profile cannot be deleted. Switch to a different profile and try again.'));
			return;
		}

		const ok = bridge().showConfirmMessageBox(_('Delete profile "%s"?\n\nAll data, including notes, notebooks and tags will be permanently deleted.', profile.name), {
			buttons: [_('Delete'), _('Cancel')],
			defaultId: 1,
		});
		if (!ok) {
			return;
		}

		const rootDir = Setting.value('rootProfileDir');
		const profileDir = `${rootDir}/profile-${profile.id}`;

		try {
			await shim.fsDriver().remove(profileDir);
			logger.info('Deleted profile directory: ', profileDir);
		} catch (error) {
			logger.error('Error deleting profile directory: ', error);
			bridge().showErrorMessageBox(error.message);
		}

		try {
			const newConfig = deleteProfileById(this.props.profileConfig, profile.id);
			await saveProfileConfig(`${Setting.value('rootProfileDir')}/profiles.json`, newConfig);
			this.props.dispatch({
				type: 'PROFILE_CONFIG_SET',
				value: newConfig,
			});
		} catch (error) {
			logger.error(error);
			bridge().showErrorMessageBox(error.message);
		}
	};

	public onFilterUpdate = (updateEvent: React.ChangeEvent<HTMLInputElement>) => {
		this.setState({ filter: updateEvent.target.value });
	};

	public render() {
		const style = this.props.style;
		const theme = themeStyle(this.props.themeId);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Assigning types to these variables would be too big of a refactoring
		const rootStyle: any = {
			...style,
			overflowY: 'scroll',
			color: theme.color,
			padding: 20,
			boxSizing: 'border-box',
			flex: 1,
		};
		delete rootStyle.height;
		delete rootStyle.width;

		const containerHeight = style.height;

		return (
			<div style={{ ...theme.containerStyle, fontFamily: theme.fontFamily, height: containerHeight, display: 'flex', flexDirection: 'column' }}>
				<div style={rootStyle}>
					<div style={{ ...theme.notificationBox, marginBottom: 10 }}>
						{_('Manage your profiles. You can rename or delete profiles. The active profile cannot be deleted.')}
					</div>
					<div style={{ float: 'right' }}>
						<input
							style={theme.inputStyle}
							type="search"
							value={this.state.filter}
							onChange={this.onFilterUpdate}
							placeholder={_('Search...')}
						/>
					</div>
					<ProfileTableComp
						themeId={this.props.themeId}
						style={style}
						profiles={this.state.profiles}
						currentProfileId={this.props.profileConfig.currentProfileId}
						filter={this.state.filter}
						onProfileRename={(profile) => this.onProfileRename(profile)}
						onProfileDelete={(profile) => this.onProfileDelete(profile)}
					/>
				</div>
				<ButtonBar
					onCancelClick={() => this.props.dispatch({ type: 'NAV_BACK' })}
				/>
			</div>
		);
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Assigning types to these variables would be too big of a refactoring
const mapStateToProps = (state: any) => ({
	themeId: state.settings.theme,
	profileConfig: state.profileConfig,
});

const ProfileManagementScreen = connect(mapStateToProps)(ProfileManagementScreenComponent);

export default ProfileManagementScreen;
