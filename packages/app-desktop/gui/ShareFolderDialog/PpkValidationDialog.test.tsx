import * as React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { formatPublicKeyFingerprint, generateKeyPair, ppkPublicKeyFingerprint } from '@joplin/lib/services/e2ee/ppk/ppk';
import ShareService, { PublicKeyStatus, UserPublicKeyResponse } from '@joplin/lib/services/share/ShareService';
import { createMockReduxStore, encryptionService, setupDatabaseAndSynchronizer, switchClient, withWarningSilenced } from '@joplin/lib/testing/test-utils';
import PpkValidationDialog from './PpkValidationDialog';
import '../../utils/initReact';
import { State } from '@joplin/lib/reducer';
import Setting from '@joplin/lib/models/Setting';

const email = 'test@example.com';
let store: Store<State>;

type GetPublicKey = ()=> Promise<UserPublicKeyResponse>;

const renderDialog = (onGetPublicKey: GetPublicKey) => {
	const onFingerprintShown = jest.fn();
	const onFingerprintConfirmed = jest.fn();
	const onDismiss = jest.fn();
	const view = render(
		<Provider store={store}>
			<PpkValidationDialog
				recipientEmail={email}
				onGetPublicKey={onGetPublicKey}
				onFingerprintShown={onFingerprintShown}
				onFingerprintConfirmed={onFingerprintConfirmed}
				onDismiss={onDismiss}
			/>
		</Provider>,
	);
	return { ...view, onFingerprintShown, onFingerprintConfirmed, onDismiss };
};

const flushPromises = () => act(async () => {
	await new Promise(resolve => setTimeout(resolve, 0));
});

const renderDialogWithPendingKey = async () => {
	let resolveKey: (key: UserPublicKeyResponse)=> void;
	const view = renderDialog(() => new Promise(resolve => {
		resolveKey = resolve;
	}));
	await flushPromises();
	return { ...view, resolveKey };
};

describe('PpkValidationDialog', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		HTMLDialogElement.prototype.showModal = jest.fn();

		store = createMockReduxStore();
		Setting.dispatch = store.dispatch;
		Setting.dispatchUpdateAll();
	});

	it('should report a public key as shown only once its fingerprint has loaded', async () => {
		const ppk = await generateKeyPair(encryptionService(), '11111');
		const { onFingerprintShown, unmount, resolveKey } = await renderDialogWithPendingKey();
		expect(onFingerprintShown).not.toHaveBeenCalled();

		resolveKey(ppk);
		expect(await screen.findByText(formatPublicKeyFingerprint(await ppkPublicKeyFingerprint(ppk)))).toBeTruthy();
		expect(onFingerprintShown).toHaveBeenCalledWith(email, ppk);

		unmount();
	});

	it.each([
		['fetching the key fails', (): Promise<UserPublicKeyResponse> => Promise.reject(new Error('Test error'))],
		['the recipient has no key', (): Promise<UserPublicKeyResponse> => Promise.resolve('')],
	])('should not report a public key as shown if %s', async (_label, onGetPublicKey) => {
		await withWarningSilenced(/Failed to fetch public key/, async () => {
			const { onFingerprintShown, unmount } = renderDialog(onGetPublicKey);
			await flushPromises();

			expect(onFingerprintShown).not.toHaveBeenCalled();

			unmount();
		});
	});

	it('should save the key as confirmed when "Fingerprints match" is clicked', async () => {
		const ppk = await generateKeyPair(encryptionService(), '11111');
		const { onFingerprintConfirmed, onDismiss, unmount } = renderDialog(() => Promise.resolve(ppk));

		fireEvent.click(await screen.findByRole('button', { name: 'Fingerprints match', hidden: true }));
		// The dialog is dismissed once the confirmation is saved
		await waitFor(() => expect(onDismiss).toHaveBeenCalled());

		expect(await ShareService.instance().publicKeyStatus(email, ppk)).toBe(PublicKeyStatus.Confirmed);
		expect(onFingerprintConfirmed).toHaveBeenCalledWith(email, ppk);
		unmount();

		const reopened = renderDialog(() => Promise.resolve(ppk));
		expect(await screen.findByText('Fingerprint confirmed:')).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'Fingerprints match', hidden: true })).toBeNull();
		reopened.unmount();
	});
});
