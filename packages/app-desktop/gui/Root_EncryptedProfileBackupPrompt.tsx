import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import EncryptedProfileBackupPromptScreen from './EncryptedProfileBackupPromptScreen';

const renderEncryptedProfileBackupPromptScreen = (profileDir: string) => {
	return new Promise<void>((resolve) => {
		const container = document.getElementById('react-root');
		const root: Root = createRoot(container);
		root.render(
			<EncryptedProfileBackupPromptScreen
				profileDir={profileDir}
				onContinue={() => {
					root.unmount();
					resolve();
				}}
			/>,
		);
	});
};

export default renderEncryptedProfileBackupPromptScreen;
