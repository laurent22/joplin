import { useEffect, useState } from 'react';
import MigrationHandler from 'lib/services/synchronizer/MigrationHandler';
const Setting = require('lib/models/Setting');
const { reg } = require('lib/registry');

export interface SyncTargetUpgradeResult {
	done: boolean,
	error: any,
}

export default function useSyncTargetUpgrade():SyncTargetUpgradeResult {
	const [upgradeResult, setUpgradeResult] = useState<SyncTargetUpgradeResult>({
		done: false,
		error: null,
	});

	async function upgradeSyncTarget() {
		let error = null;
		try {
			const synchronizer = await reg.syncTarget().synchronizer();

			const migrationHandler = new MigrationHandler(
				synchronizer.api(),
				synchronizer.lockHandler(),
				Setting.value('appType'),
				Setting.value('clientId')
			);

			await migrationHandler.upgrade();
		} catch (e) {
			error = e;
		}

		if (!error) {
			Setting.setValue('sync.upgradeState', Setting.SYNC_UPGRADE_STATE_IDLE);
			await Setting.saveAll();
		}

		setUpgradeResult({
			done: true,
			error: error,
		});
	}

	useEffect(function() {
		upgradeSyncTarget();
	}, []);

	return upgradeResult;
}
