import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { _ } from '@joplin/lib/locale';
import Button, { ButtonLevel } from './Button/Button';
import shim from '@joplin/lib/shim';
import bridge from '../services/bridge';
import { encryptedProfilePlaintextBackupPathFromMigration } from '@joplin/lib/services/encryptedProfile/backup';
import { deletePlaintextMigrationBackupForProfile } from '../services/encryptedProfile/deletePlaintextMigrationBackup';

interface Props {
	profileDir: string;
	onContinue: ()=> void;
}

const EncryptedProfileBackupPromptScreen = (props: Props) => {
	const [message, setMessage] = useState('');
	const backupPath = encryptedProfilePlaintextBackupPathFromMigration(props.profileDir);

	const rootStyle = useMemo((): React.CSSProperties => ({
		position: 'fixed',
		inset: 0,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#1e1e1e',
		color: '#ffffff',
		fontFamily: 'sans-serif',
	}), []);

	const panelStyle = useMemo((): React.CSSProperties => ({
		width: 'min(520px, calc(100vw - 48px))',
		border: '1px solid #444444',
		borderRadius: 6,
		backgroundColor: '#2a2a2a',
		padding: 24,
		boxShadow: '0 16px 40px rgba(0, 0, 0, 0.28)',
	}), []);

	const openBackupLocation = useCallback(() => {
		bridge().showItemInFolder(backupPath);
	}, [backupPath]);

	const deleteBackup = useCallback(async () => {
		if (!await shim.showConfirmationDialog(_('Delete the plaintext migration backup database.sqlite.before-encryption-backup from this profile only? This cannot be undone. Only use this if you already have another safe backup or no longer need the pre-migration copy.'))) {
			return;
		}

		const result = await deletePlaintextMigrationBackupForProfile(props.profileDir);
		if (result === 'deleted') {
			setMessage(_('Plaintext migration backup deleted.'));
			return;
		}
		setMessage(_('Plaintext migration backup was not found.'));
	}, [props.profileDir]);

	return (
		<div
			style={rootStyle}
			role="dialog"
			aria-modal="true"
			aria-label={_('Plaintext migration backup')}
		>
			<div style={panelStyle}>
				<h1 style={{ marginTop: 0, fontSize: 22 }}>{_('Plaintext migration backup')}</h1>
				<p>
					{_('Encrypted profile migration succeeded. Only database.sqlite is now encrypted. Resources, settings files, cache, logs, plugins, and plugin data remain readable on disk.')}
				</p>
				<p>
					{_('Joplin also left a plaintext copy of your old database at database.sqlite.before-encryption-backup in this profile. Anyone with access to your profile folder can read it. Move it to secure storage or delete it when you no longer need it.')}
				</p>
				<p style={{ wordBreak: 'break-all', color: '#cccccc' }}>{backupPath}</p>
				{message ? <p style={{ color: '#9fd89f' }}>{message}</p> : null}
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
					<Button level={ButtonLevel.Secondary} title={_('Open backup location')} onClick={openBackupLocation} />
					<Button level={ButtonLevel.Secondary} title={_('Delete plaintext backup')} onClick={() => { void deleteBackup(); }} />
					<Button level={ButtonLevel.Primary} title={_('I understand')} onClick={props.onContinue} />
				</div>
			</div>
		</div>
	);
};

export default EncryptedProfileBackupPromptScreen;
