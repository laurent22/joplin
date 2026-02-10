import MasterKey from '../../models/MasterKey';
import EncryptionService, { EncryptionMethod } from '../../services/e2ee/EncryptionService';
import { MasterKeyEntity } from '../../services/e2ee/types';
import { setEncryptionEnabled } from '../../services/synchronizer/syncInfoUtils';
import { msleep, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import { usePasswordChecker } from './utils';
import { renderHook } from '@testing-library/react-hooks/pure';

const waitForResult = async <T>(getResult: ()=> T, check: (result: T)=> boolean, timeout = 5000) => {
	const startTime = Date.now();
	while (Date.now() - startTime < timeout) {
		if (check(getResult())) return;
		await msleep(50);
	}
	throw new Error('Timed out waiting for result');
};

interface WrappedPasswordCheckerProps {
	masterKeys: MasterKeyEntity[];
	activeMasterKeyId: string;
	masterPassword: string;
	passwords: Record<string, string>;
}

const useWrappedPasswordChecker = ({
	masterKeys = [],
	activeMasterKeyId = '',
	masterPassword = '',
	passwords = {},
}: WrappedPasswordCheckerProps) => usePasswordChecker(
	masterKeys,
	activeMasterKeyId,
	masterPassword,
	passwords,
);

describe('EncryptionConfigScreen/utils', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
		setEncryptionEnabled(true);
	});

	test('should not mark keys as master password keys if the master password is incorrect for that key', async () => {
		const makeMasterKey = async (password: string) => {
			const result = await EncryptionService.instance().generateMasterKey(password, {
				encryptionMethod: EncryptionMethod.SJCL4,
			});
			return await MasterKey.save(result);
		};

		const activeMasterKey = await makeMasterKey('master-password');
		const secondaryMasterKey = await makeMasterKey('some other password');
		const masterKeys = [
			activeMasterKey,
			secondaryMasterKey,
		];

		const initialProps = {
			masterKeys,
			activeMasterKeyId: activeMasterKey.id,
			masterPassword: 'master-password',
			passwords: {
				[activeMasterKey.id]: 'master-password',
				[secondaryMasterKey.id]: 'some other password',
			},
		};
		const hook = renderHook(useWrappedPasswordChecker, {
			initialProps,
		});

		// Different password from the master password should cause the secondary key
		// to be marked as not using the master password.
		await waitForResult(
			() => hook.result.current.masterPasswordKeys,
			(keys) => keys[activeMasterKey.id] === true && keys[secondaryMasterKey.id] === false,
		);

		expect(hook.result.current.masterPasswordKeys).toMatchObject({
			[activeMasterKey.id]: true,
			[secondaryMasterKey.id]: false,
		});

		// Same password as the master password but fails to decrypt: Should not be marked
		// as using the master password.
		hook.rerender({
			...initialProps,
			passwords: {
				...initialProps.passwords,
				[secondaryMasterKey.id]: 'primary',
			},
		});

		await waitForResult(
			() => hook.result.current.masterPasswordKeys,
			(keys) => keys[activeMasterKey.id] === true && keys[secondaryMasterKey.id] === false,
		);

		expect(hook.result.current.masterPasswordKeys).toMatchObject({
			[activeMasterKey.id]: true,
			[secondaryMasterKey.id]: false,
		});
	});
});
