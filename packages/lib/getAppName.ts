export default (isDesktop: boolean, isDev: boolean) => {
	let appName = isDev ? 'joplindev' : 'joplin';
	if (isDesktop) appName += '-desktop';
	return appName;
};
