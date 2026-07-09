import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { _ } from '@joplin/lib/locale';
import Button, { ButtonLevel } from './Button/Button';
import {
	canAttemptEncryptedProfileUnlock,
	unlockEncryptedProfile,
} from '@joplin/lib/services/encryptedProfile/EncryptedProfileService';
import { EncryptedProfileMetadata, EncryptedProfileRuntimeState } from '@joplin/lib/services/encryptedProfile/types';

interface Props {
	metadata: EncryptedProfileMetadata;
	purpose?: 'unlock' | 'migration';
	onUnlockSucceeded: (databaseKeyHex: string)=> void;
}

const EncryptedProfileUnlockScreen = (props: Props) => {
	const purpose = props.purpose ?? 'unlock';
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [runtimeState, setRuntimeState] = useState<EncryptedProfileRuntimeState>({
		failedAttempts: 0,
		cooldownUntil: 0,
		unlocked: false,
	});
	const [now, setNow] = useState(Date.now());
	const cooldownRemainingMs = Math.max(0, runtimeState.cooldownUntil - now);
	const cooldownRemainingSeconds = Math.ceil(cooldownRemainingMs / 1000);

	useEffect(() => {
		if (!cooldownRemainingMs) return () => {};
		const intervalId = setInterval(() => {
			setNow(Date.now());
		}, 250);
		return () => clearInterval(intervalId);
	}, [cooldownRemainingMs]);

	const unlock = useCallback(async () => {
		if (!canAttemptEncryptedProfileUnlock(runtimeState, now)) {
			setError(_('Please wait %d seconds before trying again.', cooldownRemainingSeconds));
			return;
		}

		const output = await unlockEncryptedProfile(password, props.metadata, runtimeState);
		setRuntimeState(output.state);
		if (output.result.success && output.result.databaseKeyHex) {
			props.onUnlockSucceeded(output.result.databaseKeyHex);
			return;
		}

		setPassword('');
		setError(output.state.cooldownUntil ? _('Too many incorrect attempts. Please wait before trying again.') : _('Incorrect password.'));
	}, [cooldownRemainingSeconds, now, password, props, runtimeState]);

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
		width: 'min(420px, calc(100vw - 48px))',
		border: '1px solid #444444',
		borderRadius: 6,
		backgroundColor: '#2a2a2a',
		padding: 24,
		boxShadow: '0 16px 40px rgba(0, 0, 0, 0.28)',
	}), []);

	const inputStyle = useMemo((): React.CSSProperties => ({
		width: '100%',
		boxSizing: 'border-box',
		padding: '8px 10px',
		border: '1px solid #555555',
		borderRadius: 4,
		backgroundColor: '#1e1e1e',
		color: '#ffffff',
		fontFamily: 'sans-serif',
		fontSize: 14,
	}), []);

	return (
		<div
			style={rootStyle}
			role="dialog"
			aria-modal="true"
			aria-label={purpose === 'migration' ? _('Complete encrypted profile migration') : _('Unlock encrypted profile')}
			onKeyDownCapture={event => {
				event.stopPropagation();
				if (event.key === 'Enter') void unlock();
			}}
		>
			<div style={panelStyle}>
				<h1 style={{ marginTop: 0, fontSize: 22 }}>
					{purpose === 'migration' ? _('Complete encrypted profile migration') : _('Unlock encrypted profile')}
				</h1>
				<p>
					{purpose === 'migration'
						? _('Enter your encrypted profile password to encrypt the local database before Joplin starts.')
						: _('Enter your encrypted profile password to open the local database.')}
				</p>
				<input
					type="password"
					autoFocus
					value={password}
					disabled={cooldownRemainingMs > 0}
					onChange={event => setPassword(event.target.value)}
					style={inputStyle}
					aria-label={_('Encrypted profile password')}
				/>
				<div style={{ minHeight: 22, marginTop: 8, color: '#ff8080' }}>
					{cooldownRemainingMs > 0 ? _('Try again in %d seconds.', cooldownRemainingSeconds) : error}
				</div>
				<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
					<Button
						level={ButtonLevel.Primary}
						title={_('Unlock')}
						disabled={!password || cooldownRemainingMs > 0}
						onClick={() => { void unlock(); }}
					/>
				</div>
			</div>
		</div>
	);
};

export default EncryptedProfileUnlockScreen;
