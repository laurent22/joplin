import EncryptionService from '../../services/EncryptionService';
import { _ } from '../../locale';
import BaseItem from '../../models/BaseItem';
import Setting from '../../models/Setting';
import MasterKey from '../../models/MasterKey';
import { reg } from '../../registry.js';
import shim from '../../shim';
import { MasterKeyEntity } from '../../services/database/types';
import time from '../../time';

class Shared {

	private refreshStatsIID_: any;

	public initialize(comp: any, props: any) {
		comp.state = {
			passwordChecks: {},
			stats: {
				encrypted: null,
				total: null,
			},
			passwords: Object.assign({}, props.passwords),
		};
		comp.isMounted_ = false;

		this.refreshStatsIID_ = null;
	}

	public async refreshStats(comp: any) {
		const stats = await BaseItem.encryptedItemsStats();
		comp.setState({
			stats: stats,
		});
	}

	public async reencryptData() {
		const ok = confirm(_('Please confirm that you would like to re-encrypt your complete database.'));
		if (!ok) return;

		await BaseItem.forceSyncAll();
		void reg.waitForSyncFinishedThenSync();
		Setting.setValue('encryption.shouldReencrypt', Setting.SHOULD_REENCRYPT_NO);
		alert(_('Your data is going to be re-encrypted and synced again.'));
	}

	public dontReencryptData() {
		Setting.setValue('encryption.shouldReencrypt', Setting.SHOULD_REENCRYPT_NO);
	}

	public async upgradeMasterKey(comp: any, masterKey: MasterKeyEntity) {
		const passwordCheck = comp.state.passwordChecks[masterKey.id];
		if (!passwordCheck) {
			alert(_('Please enter your password in the master key list below before upgrading the key.'));
			return;
		}

		try {
			const password = comp.state.passwords[masterKey.id];
			const newMasterKey = await EncryptionService.instance().upgradeMasterKey(masterKey, password);
			await MasterKey.save(newMasterKey);
			void reg.waitForSyncFinishedThenSync();
			alert(_('The master key has been upgraded successfully!'));
		} catch (error) {
			alert(_('Could not upgrade master key: %s', error.message));
		}
	}

	public componentDidMount(comp: any) {
		this.componentDidUpdate(comp);

		void this.refreshStats(comp);

		if (this.refreshStatsIID_) {
			shim.clearInterval(this.refreshStatsIID_);
			this.refreshStatsIID_ = null;
		}

		this.refreshStatsIID_ = shim.setInterval(() => {
			if (!comp.isMounted_) {
				shim.clearInterval(this.refreshStatsIID_);
				this.refreshStatsIID_ = null;
				return;
			}
			void this.refreshStats(comp);
		}, 3000);
	}

	public componentDidUpdate(comp: any, prevProps: any = null) {
		if (prevProps && comp.props.passwords !== prevProps.passwords) {
			comp.setState({ passwords: Object.assign({}, comp.props.passwords) });
		}

		if (!prevProps || comp.props.masterKeys !== prevProps.masterKeys || comp.props.passwords !== prevProps.passwords) {
			comp.checkPasswords();
		}
	}

	public componentWillUnmount() {
		if (this.refreshStatsIID_) {
			shim.clearInterval(this.refreshStatsIID_);
			this.refreshStatsIID_ = null;
		}
	}

	public async checkPasswords(comp: any) {
		const passwordChecks = Object.assign({}, comp.state.passwordChecks);
		for (let i = 0; i < comp.props.masterKeys.length; i++) {
			const mk = comp.props.masterKeys[i];
			const password = comp.state.passwords[mk.id];
			const ok = password ? await EncryptionService.instance().checkMasterKeyPassword(mk, password) : false;
			passwordChecks[mk.id] = ok;
		}
		comp.setState({ passwordChecks: passwordChecks });
	}

	public decryptedStatText(comp: any) {
		const stats = comp.state.stats;
		const doneCount = stats.encrypted !== null ? stats.total - stats.encrypted : '-';
		const totalCount = stats.total !== null ? stats.total : '-';
		const result = _('Decrypted items: %s / %s', doneCount, totalCount);
		return result;
	}

	public onSavePasswordClick(comp: any, mk: MasterKeyEntity) {
		const password = comp.state.passwords[mk.id];
		if (!password) {
			Setting.deleteObjectValue('encryption.passwordCache', mk.id);
		} else {
			Setting.setObjectValue('encryption.passwordCache', mk.id, password);
		}

		comp.checkPasswords();
	}

	public onPasswordChange(comp: any, mk: MasterKeyEntity, password: string) {
		const passwords = Object.assign({}, comp.state.passwords);
		passwords[mk.id] = password;
		comp.setState({ passwords: passwords });
	}

	public enableEncryptionConfirmationMessages(masterKey: MasterKeyEntity) {
		const msg = [_('Enabling encryption means *all* your notes and attachments are going to be re-synchronised and sent encrypted to the sync target. Do not lose the password as, for security purposes, this will be the *only* way to decrypt the data! To enable encryption, please enter your password below.')];
		if (masterKey) msg.push(_('Encryption will be enabled using the master key created on %s', time.unixMsToLocalDateTime(masterKey.created_time)));
		return msg;
	}

}

const shared = new Shared();

export default shared;
