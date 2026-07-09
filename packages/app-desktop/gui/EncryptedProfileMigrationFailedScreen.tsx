import * as React from 'react';
import { useMemo } from 'react';
import { _ } from '@joplin/lib/locale';
import Button, { ButtonLevel } from './Button/Button';

interface Props {
	errorMessage: string;
	onContinue: ()=> void;
}

const EncryptedProfileMigrationFailedScreen = (props: Props) => {
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

	return (
		<div
			style={rootStyle}
			role="dialog"
			aria-modal="true"
			aria-label={_('Encrypted profile migration failed')}
		>
			<div style={panelStyle}>
				<h1 style={{ marginTop: 0, fontSize: 22 }}>{_('Encrypted profile migration failed')}</h1>
				<p>{props.errorMessage}</p>
				<p>
					{_('Joplin will continue with your unencrypted database.sqlite. Encrypted profile is not enabled. You can try again from Settings -> Security. This is separate from Joplin sync end-to-end encryption.')}
				</p>
				<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
					<Button level={ButtonLevel.Primary} title={_('Continue to Joplin')} onClick={props.onContinue} />
				</div>
			</div>
		</div>
	);
};

export default EncryptedProfileMigrationFailedScreen;
