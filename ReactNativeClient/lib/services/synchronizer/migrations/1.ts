export default async function(api:any) {
	await Promise.all([
		api.mkdir('.resource'),
		api.mkdir('.sync'),
		api.mkdir('.lock'),
	]);

	await api.put('.sync/version.txt', '1');
}
