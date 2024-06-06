import { _ } from '@joplin/lib/locale';
import * as React from 'react';
import { View, Text, Linking } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import SettingsButton from './SettingsButton';
import { accountTypeToString } from '@joplin/lib/accountTypeUtils';
import { LinkButton } from '../../buttons';
import { ConfigScreenStyles } from './configScreenStyles';

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

	return (
		<View key="joplinCloud">
			<View style={props.styles.styleSheet.settingContainerNoBottomBorder}>
				<Text style={props.styles.styleSheet.settingTextEmphasis}>{accountInformationLabel()}</Text>
			</View>
			<View style={props.styles.styleSheet.settingContainerNoBottomBorder}>
				<Text style={props.styles.styleSheet.settingText}>{accountTypeLabel()}</Text>
				<Text style={props.styles.styleSheet.settingTextEmphasis}>{accountTypeToString(parseInt(props.accountType, 10))}</Text>
			</View>
			<View style={props.styles.styleSheet.settingContainerNoBottomBorder}>
				<Text style={props.styles.styleSheet.settingText}>{accountEmailLabel()}</Text>
				<Text style={props.styles.styleSheet.settingTextEmphasis}>{props.userEmail}</Text>
			</View>
			<LinkButton onPress={goToJoplinCloudProfile}>
				{_('Go to Joplin Cloud profile')}
			</LinkButton>
			<View style={props.styles.styleSheet.settingContainer}/>

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
