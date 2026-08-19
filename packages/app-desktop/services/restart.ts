import Setting from '@joplin/lib/models/Setting';
import bridge from './bridge';


export default async () => {
	Setting.setValue('wasClosedSuccessfully', true);
	await Setting.saveAll();

	await bridge().restart();
};
