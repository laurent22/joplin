import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import EncryptedProfileUnlockScreen from './EncryptedProfileUnlockScreen';
import { EncryptedProfileMetadata } from '@joplin/lib/services/encryptedProfile/types';

interface StartupGateProps {
	metadata: EncryptedProfileMetadata;
	purpose: 'unlock' | 'migration';
	onUnlockSucceeded: (databaseKeyHex: string)=> void;
}

const StartupGate = (props: StartupGateProps) => {
	return <EncryptedProfileUnlockScreen metadata={props.metadata} purpose={props.purpose} onUnlockSucceeded={props.onUnlockSucceeded} />;
};

export interface EncryptedProfileUnlockScreenOptions {
	purpose?: 'unlock' | 'migration';
}

const renderEncryptedProfileUnlockScreen = (metadata: EncryptedProfileMetadata, options: EncryptedProfileUnlockScreenOptions = {}) => {
	const purpose = options.purpose ?? 'unlock';
	return new Promise<string>((resolve) => {
		const container = document.getElementById('react-root');
		const root: Root = createRoot(container);
		root.render(
			<StartupGate
				metadata={metadata}
				purpose={purpose}
				onUnlockSucceeded={(databaseKeyHex) => {
					root.unmount();
					resolve(databaseKeyHex);
				}}
			/>,
		);
	});
};

export default renderEncryptedProfileUnlockScreen;
