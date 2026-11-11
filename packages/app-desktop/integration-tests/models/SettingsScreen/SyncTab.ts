import { Locator } from '@playwright/test';

export default class SyncTab {
	public readonly syncWizardButton: Locator;
	public readonly syncTargetDropdown: Locator;
	public readonly connectToJoplinCloudButton: Locator;

	public constructor(container: Locator) {
		this.syncWizardButton = container.getByRole('button', { name: 'Open Sync Wizard' });
		this.syncTargetDropdown = container.getByRole('combobox', { name: 'Synchronisation target' });
		this.connectToJoplinCloudButton = container.getByRole('button', { name: 'Connect to Joplin Cloud' });
	}
}
