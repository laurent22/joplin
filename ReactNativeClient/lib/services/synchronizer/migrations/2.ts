import { Dirnames } from '../utils/types';

export default async function exec(api:any) {
	await api.delete('.lock');
	await api.delete('.sync');
	await api.mkdir(Dirnames.Locks);
	await api.mkdir(Dirnames.Temp);
}
