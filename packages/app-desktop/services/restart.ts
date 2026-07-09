import Setting from '@joplin/lib/models/Setting';
import bridge from './bridge';

export type RestartResult = {
	requiresManualRestart: boolean;
};

export default async () => {
	Setting.setValue('wasClosedSuccessfully', true);
	await Setting.saveAll();

	return await bridge().restart();
};
