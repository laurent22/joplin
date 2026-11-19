import * as React from 'react';
import { act, findByRole, render } from '@testing-library/react';
import PpkWarningIcon from './PpkWarningIcon';
import { generateKeyPair, PublicPrivateKeyPair } from '@joplin/lib/services/e2ee/ppk/ppk';
import { encryptionService, runWithFakeTimers, setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import ShareService from '@joplin/lib/services/share/ShareService';
import { Second } from '@joplin/utils/time';

interface WrapperProps {
	recipientEmail: string;
	publicKeys: Map<string, PublicPrivateKeyPair>;
}

const IconWrapperComponent: React.FC<WrapperProps> = props => {
	return <PpkWarningIcon
		recipientEmail={props.recipientEmail}
		onShowPpkValidationDialog={jest.fn()}
		onGetPublicKey={email => Promise.resolve(props.publicKeys.get(email))}
		refreshCounter={0}
	/>;
};

describe('PpkWarningIcon', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it.each([
		{ label: 'Same key as last share', markKey: (email: string, ppk: PublicPrivateKeyPair) => ShareService.instance().markPublicKeyAsSeen_(email, ppk) },
		{ label: 'Fingerprint confirmed', markKey: (email: string, ppk: PublicPrivateKeyPair) => ShareService.instance().markPublicKeyAsConfirmed(email, ppk) },
	])('should show "$label" for a matching public key', ({ label, markKey }) => runWithFakeTimers(async () => {
		const publicKeys = new Map<string, PublicPrivateKeyPair>();
		const ppk = await generateKeyPair(encryptionService(), '11111');

		const email = 'test@example.com';
		publicKeys.set(email, ppk);
		await markKey(email, ppk);

		const { unmount, container } = render(
			<IconWrapperComponent
				recipientEmail={email}
				publicKeys={publicKeys}
			/>,
		);

		await act(async () => {
			await jest.advanceTimersByTimeAsync(Second);
		});

		const button = await findByRole(container, 'button', { name: label });
		expect(button).toBeTruthy();

		unmount();
	}));
});
