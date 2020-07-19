export default async function(api:any) {
	await api.mkdir('.resource');
	await api.mkdir('.sync');
	await api.mkdir('.lock');
	await api.put('.sync/version.txt', '1');
}
