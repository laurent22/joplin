import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import EncryptedProfileMigrationFailedScreen from './EncryptedProfileMigrationFailedScreen';

const renderEncryptedProfileMigrationFailedScreen = (errorMessage: string) => {
	return new Promise<void>((resolve) => {
		const container = document.getElementById('react-root');
		const root: Root = createRoot(container);
		root.render(
			<EncryptedProfileMigrationFailedScreen
				errorMessage={errorMessage}
				onContinue={() => {
					root.unmount();
					resolve();
				}}
			/>,
		);
	});
};

export default renderEncryptedProfileMigrationFailedScreen;
