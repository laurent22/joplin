import { _ } from '@joplin/lib/locale';
import * as React from 'react';
import { View, Text, Linking } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import SettingsButton from './SettingsButton';
import accountTypeToString from '@joplin/lib/utils/joplinCloud/accountTypeToString';
import { LinkButton } from '../../buttons';
import { ConfigScreenStyles } from './configScreenStyles';
import { Divider } from 'react-native-paper';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('JoplinCloudConfig');

type JoplinCloudConfigProps = {
	styles: ConfigScreenStyles;
	accountType: string;
	inboxEmail: string;
	website: string;
	userEmail: string;
};

export const emailToNoteLabel = () => _('Email to note');
export const emailToNoteDescription = () => _('Any email sent to this address will be converted into a note and added to your collection. The note will be saved into the Inbox notebook');
export const accountInformationLabel = () => _('Account information');
export const accountTypeLabel = () => _('Account type');
export const accountEmailLabel = () => _('Email');

const JoplinCloudConfig = (props: JoplinCloudConfigProps) => {

	const isEmailToNoteAvailableInAccount = props.accountType !== '1';
	const inboxEmailValue = props.inboxEmail ?? '-';

	const goToJoplinCloudProfile = async () => {
		await Linking.openURL(`${props.website}/users/me`);
	};

	const accountTypeName = () => {
		try {
			return accountTypeToString(parseInt(props.accountType, 10));
		} catch (error) {
			logger.error(error);
			return 'Unknown';
		}
	};

	return (
		<View>
			<View style={props.styles.styleSheet.settingContainerNoBottomBorder}>
				<Text style={props.styles.styleSheet.settingTextEmphasis}>{accountInformationLabel()}</Text>
			</View>
			<View style={props.styles.styleSheet.settingContainerNoBottomBorder}>
				<Text style={props.styles.styleSheet.settingText}>{accountTypeLabel()}</Text>
				<Text style={props.styles.styleSheet.settingTextEmphasis}>{accountTypeName()}</Text>
			</View>
			<View style={props.styles.styleSheet.settingContainerNoBottomBorder}>
				<Text style={props.styles.styleSheet.settingText}>{accountEmailLabel()}</Text>
				<Text selectable style={props.styles.styleSheet.settingTextEmphasis}>{props.userEmail}</Text>
			</View>
			<LinkButton onPress={goToJoplinCloudProfile}>
				{_('Go to Joplin Cloud profile')}
			</LinkButton>
			<Divider style={props.styles.styleSheet.divider} bold />

			<View style={props.styles.styleSheet.settingContainerNoBottomBorder}>
				<Text style={props.styles.styleSheet.settingText}>{emailToNoteLabel()}</Text>
				<Text style={props.styles.styleSheet.settingTextEmphasis}>{inboxEmailValue}</Text>
			</View>
			{
				!isEmailToNoteAvailableInAccount && (
					<View style={props.styles.styleSheet.settingContainerNoBottomBorder}>
						<Text style={props.styles.styleSheet.descriptionAlert}>{_('Your account doesn\'t have access to this feature')}</Text>
					</View>
				)
			}
			<SettingsButton
				title={_('Copy to clipboard')}
				clickHandler={() => isEmailToNoteAvailableInAccount && Clipboard.setString(props.inboxEmail)}
				description={emailToNoteDescription()}
				statusComponent={undefined}
				styles={props.styles}
				disabled={!isEmailToNoteAvailableInAccount}
			/>
		</View>
	);

};

export default JoplinCloudConfig;
