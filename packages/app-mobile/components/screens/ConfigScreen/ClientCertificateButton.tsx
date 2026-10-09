import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { _ } from '@joplin/lib/locale';
import Logger from '@joplin/utils/Logger';
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';
import SettingsButton from './SettingsButton';
import { ConfigScreenStyles } from './configScreenStyles';
import { clearClientCertificate, clientCertificatesSupported, getClientCertificateAlias, selectClientCertificate } from '../../../utils/TlsUtils';

const logger = Logger.create('ClientCertificateButton');

// Sync targets that talk HTTP(S) to a server the user controls, and can therefore
// sit behind a reverse proxy that requires a client certificate.
const supportedSyncTargets = () => [
	SyncTargetRegistry.nameToId('nextcloud'),
	SyncTargetRegistry.nameToId('webdav'),
	SyncTargetRegistry.nameToId('joplinServer'),
	SyncTargetRegistry.nameToId('joplinServerSaml'),
];

export const showClientCertificateButton = (syncTargetId: number) => {
	return clientCertificatesSupported() && supportedSyncTargets().includes(syncTargetId);
};

export const clientCertificateButtonTitle = () => _('Client certificate');

interface Props {
	styles: ConfigScreenStyles;
	// URL of the sync target, shown by the system dialog
	serverUrl: string;
}

const ClientCertificateButton: React.FC<Props> = props => {
	const [alias, setAlias] = useState<string|null>(null);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			const currentAlias = await getClientCertificateAlias();
			if (!cancelled) setAlias(currentAlias);
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const onSelect = useCallback(async () => {
		try {
			const selectedAlias = await selectClientCertificate(props.serverUrl);
			if (selectedAlias) setAlias(selectedAlias);
		} catch (error) {
			logger.error('Could not select client certificate', error);
			Alert.alert(_('Error'), error.message);
		}
	}, [props.serverUrl]);

	const onRemove = useCallback(async () => {
		await clearClientCertificate();
		setAlias(null);
	}, []);

	const onPress = useCallback(() => {
		if (!alias) {
			void onSelect();
			return;
		}

		Alert.alert(clientCertificateButtonTitle(), _('Selected certificate: %s', alias), [
			{ text: _('Change'), onPress: () => {
				void onSelect();
			} },
			{ text: _('Remove'), style: 'destructive', onPress: () => {
				void onRemove();
			} },
			{ text: _('Cancel'), style: 'cancel' },
		]);
	}, [alias, onSelect, onRemove]);

	const description = alias
		? _('Selected certificate: %s', alias)
		: _('If your server requires a client certificate (mutual TLS), install it in the Android settings and select it here.');

	return (
		<SettingsButton
			title={clientCertificateButtonTitle()}
			description={description}
			clickHandler={onPress}
			styles={props.styles}
		/>
	);
};

export default ClientCertificateButton;
