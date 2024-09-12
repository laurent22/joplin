import shim from '../../shim';
import { _ } from '../../locale';
import BaseItem, { EncryptedItemsStats } from '../../models/BaseItem';
import useAsyncEffect, { AsyncEffectEvent } from '../../hooks/useAsyncEffect';
import { MasterKeyEntity } from '../../services/e2ee/types';
import { findMasterKeyPassword, getMasterPasswordStatus, masterPasswordIsValid, MasterPasswordStatus } from '../../services/e2ee/utils';
import EncryptionService from '../../services/e2ee/EncryptionService';
import { masterKeyEnabled, setMasterKeyEnabled } from '../../services/synchronizer/syncInfoUtils';
import MasterKey from '../../models/MasterKey';
import { reg } from '../../registry';
import Setting from '../../models/Setting';
const { useCallback, useEffect, useState } = shim.react();

type PasswordChecks = Record<string, boolean>;

export const useStats = () => {
	const [stats, setStats] = useState<EncryptedItemsStats>({ encrypted: null, total: null });
	const [statsUpdateTime, setStatsUpdateTime] = useState<number>(0);

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		const r = await BaseItem.encryptedItemsStats();
		if (event.cancelled) return;
		setStats(stats => {
			if (JSON.stringify(stats) === JSON.stringify(r)) return stats;
			return r;
		});
	}, [statsUpdateTime]);

	useEffect(() => {
		const iid = shim.setInterval(() => {
			setStatsUpdateTime(Date.now());
		}, 3000);

		return () => {
			shim.clearInterval(iid);
		};
	}, []);

	return stats;
};

export const decryptedStatText = (stats: EncryptedItemsStats) => {
	const doneCount = stats.encrypted !== null ? stats.total - stats.encrypted : '-';
	const totalCount = stats.total !== null ? stats.total : '-';
	const result = _('Decrypted items: %s / %s', doneCount, totalCount);
	return result;
};

export const enableEncryptionConfirmationMessages = (_masterKey: MasterKeyEntity, hasMasterPassword: boolean) => {
	const msg = [_('Enabling encryption means *all* your notes and attachments are going to be re-synchronised and sent encrypted to the sync target.')];

	if (hasMasterPassword) {
		msg.push(_('To continue, please enter your master password below.'));
	} else {
		msg.push(_('Do not lose the password as, for security purposes, this will be the *only* way to decrypt the data! To enable encryption, please enter your password below.'));
	}

	// if (masterKey) msg.push(_('Encryption will be enabled using the master key created on %s', time.unixMsToLocalDateTime(masterKey.created_time)));

	return msg;
};

export const reencryptData = async () => {
	const ok = confirm(_('Please confirm that you would like to re-encrypt your complete database.'));
	if (!ok) return;

	await BaseItem.forceSyncAll();
	void reg.waitForSyncFinishedThenSync();
	Setting.setValue('encryption.shouldReencrypt', Setting.SHOULD_REENCRYPT_NO);
	alert(_('Your data is going to be re-encrypted and synced again.'));
};

export const dontReencryptData = () => {
	Setting.setValue('encryption.shouldReencrypt', Setting.SHOULD_REENCRYPT_NO);
};

export const useToggleShowDisabledMasterKeys = () => {
	const [showDisabledMasterKeys, setShowDisabledMasterKeys] = useState<boolean>(false);

	const toggleShowDisabledMasterKeys = () => {
		setShowDisabledMasterKeys((current) => !current);
	};

	return { showDisabledMasterKeys, toggleShowDisabledMasterKeys };
};

export const onToggleEnabledClick = (mk: MasterKeyEntity) => {
	setMasterKeyEnabled(mk.id, !masterKeyEnabled(mk));
};

export const onSavePasswordClick = (mk: MasterKeyEntity, passwords: Record<string, string>) => {
	const password = passwords[mk.id];
	if (!password) {
		Setting.deleteObjectValue('encryption.passwordCache', mk.id);
	} else {
		Setting.setObjectValue('encryption.passwordCache', mk.id, password);
	}

	// When setting a master key password, if the master password is not set, we
	// assume that this password is the master password. If it turns out it's
	// not, it's always possible to change it in the UI.
	if (password && !Setting.value('encryption.masterPassword')) {
		Setting.setValue('encryption.masterPassword', password);
	}
};

export const onMasterPasswordSave = (masterPasswordInput: string) => {
	Setting.setValue('encryption.masterPassword', masterPasswordInput);
};

export const useInputMasterPassword = (masterKeys: MasterKeyEntity[], activeMasterKeyId: string) => {
	const [inputMasterPassword, setInputMasterPassword] = useState<string>('');

	const onMasterPasswordSave = useCallback(async () => {
		Setting.setValue('encryption.masterPassword', inputMasterPassword);

		if (!(await masterPasswordIsValid(inputMasterPassword, masterKeys.find(mk => mk.id === activeMasterKeyId)))) {
			alert('Password is invalid. Please try again.');
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [inputMasterPassword]);

	const onMasterPasswordChange = useCallback((password: string) => {
		setInputMasterPassword(password);
	}, []);

	return { inputMasterPassword, onMasterPasswordSave, onMasterPasswordChange };
};

export const useInputPasswords = (propsPasswords: Record<string, string>) => {
	const [inputPasswords, setInputPasswords] = useState<Record<string, string>>(propsPasswords);

	useEffect(() => {
		setInputPasswords(propsPasswords);
	}, [propsPasswords]);

	const onInputPasswordChange = useCallback((mk: MasterKeyEntity, password: string) => {
		setInputPasswords(current => {
			return {
				...current,
				[mk.id]: password,
			};
		});
	}, []);

	return { inputPasswords, onInputPasswordChange };
};

export const usePasswordChecker = (masterKeys: MasterKeyEntity[], activeMasterKeyId: string, masterPassword: string, passwords: Record<string, string>) => {
	const [passwordChecks, setPasswordChecks] = useState<PasswordChecks>({});

	// "masterPasswordKeys" are the master key that can be decrypted with the
	// master password. It should be all of them normally, but in previous
	// versions it was possible to have different passwords for different keys,
	// so we need this for backward compatibility.
	const [masterPasswordKeys, setMasterPasswordKeys] = useState<PasswordChecks>({});
	const [masterPasswordStatus, setMasterPasswordStatus] = useState<MasterPasswordStatus>(MasterPasswordStatus.Unknown);

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		const newPasswordChecks: PasswordChecks = {};
		const newMasterPasswordKeys: PasswordChecks = {};

		const masterPasswordOk = masterPassword ? await masterPasswordIsValid(masterPassword, masterKeys.find(mk => mk.id === activeMasterKeyId)) : true;
		newPasswordChecks['master'] = masterPasswordOk;

		for (let i = 0; i < masterKeys.length; i++) {
			const mk = masterKeys[i];
			const password = await findMasterKeyPassword(EncryptionService.instance(), mk, passwords);
			const ok = password ? await EncryptionService.instance().checkMasterKeyPassword(mk, password) : false;
			newPasswordChecks[mk.id] = ok;

			// Even if the password matches the master password, it isn't a master password key if the
			// master password can't decrypt this key.
			newMasterPasswordKeys[mk.id] = password === masterPassword && (ok || !masterPasswordOk);
		}


		if (event.cancelled) return;

		setPasswordChecks(passwordChecks => {
			if (JSON.stringify(newPasswordChecks) === JSON.stringify(passwordChecks)) return passwordChecks;
			return newPasswordChecks;
		});

		setMasterPasswordKeys(masterPasswordKeys => {
			if (JSON.stringify(newMasterPasswordKeys) === JSON.stringify(masterPasswordKeys)) return masterPasswordKeys;
			return newMasterPasswordKeys;
		});

		setMasterPasswordStatus(await getMasterPasswordStatus(masterPassword));
	}, [masterKeys, masterPassword]);

	return { passwordChecks, masterPasswordKeys, masterPasswordStatus };
};

export const useNeedMasterPassword = (passwordChecks: PasswordChecks, masterKeys: MasterKeyEntity[]) => {
	for (const [mkId, valid] of Object.entries(passwordChecks)) {
		const mk = masterKeys.find(mk => mk.id === mkId);
		if (!mk) continue;
		if (!masterKeyEnabled(mk)) continue;
		if (!valid) return true;
	}
	return false;
};

export const determineKeyPassword = (masterKeyId: string, masterPasswordKeys: PasswordChecks, masterPassword: string, passwords: Record<string, string>): string => {
	if (masterPasswordKeys[masterKeyId]) return masterPassword;
	return passwords[masterKeyId];
};

export const upgradeMasterKey = async (masterKey: MasterKeyEntity, password: string): Promise<string> => {
	if (!password) {
		return _('Please enter your password in the master key list below before upgrading the key.');
	}

	try {
		// Just re-encrypt the master key, but using the new encryption method
		// (which would be the default).
		const newMasterKey = await EncryptionService.instance().reencryptMasterKey(masterKey, password, password);
		await MasterKey.save(newMasterKey);
		void reg.waitForSyncFinishedThenSync();
		return _('The master key has been upgraded successfully!');
	} catch (error) {
		return _('Could not upgrade master key: %s', error.message);
	}
};
