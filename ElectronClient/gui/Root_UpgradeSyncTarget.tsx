import * as React from 'react';
import { useEffect } from 'react';
import MigrationHandler from 'lib/services/synchronizer/MigrationHandler';

const { render } = require('react-dom');
const ipcRenderer = require('electron').ipcRenderer;
const { reg } = require('lib/registry');
const Setting = require('lib/models/Setting');

async function upgradeSyncTarget() {
	const syncTarget = reg.syncTarget();
	const synchronizer = await syncTarget.synchronizer();

	const migrationHandler = new MigrationHandler(
		synchronizer.api(),
		synchronizer.lockHandler(),
		Setting.value('appType'),
		Setting.value('clientId')
	);

	migrationHandler.upgrade(2); // TODO - handle upgrading to max

	// migrationHandler.upgrade();
}

export default function Root_UpgradeSyncTarget() {
	useEffect(function() {
		ipcRenderer.on('appClose', async function() {
			const canClose = confirm('The synchronisation target upgrade is still running and it is recommanded to let it finish. Close the application anyway?');

			if (canClose) {
				// We set the state back to IDLE so that the app can start normally and
				// potentially the user can fix issues if any. The message to upgrade
				// will show up again.
				Setting.setValue('sync.upgradeState', Setting.SYNC_UPGRADE_STATE_IDLE);
				await Setting.saveAll();
			}

			ipcRenderer.send('asynchronous-message', 'appCloseReply', {
				canClose: canClose,
			});
		});
	}, []);

	useEffect(function() {
		upgradeSyncTarget();
	}, []);

	return <div>TEST</div>;
}

render(<Root_UpgradeSyncTarget />, document.getElementById('react-root'));
