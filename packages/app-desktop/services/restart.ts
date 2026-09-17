import Setting from '@joplin/lib/models/Setting';
import bridge from './bridge';
import app from '../app';


export default async () => {
	await app().saveChatHistory();
	Setting.setValue('wasClosedSuccessfully', true);
	await Setting.saveAll();

	await bridge().restart();
};
