
const getActiveTabs = async (browser) => {
	const options = { active: true, currentWindow: true };
	return await browser.tabs.query(options);
}

export default getActiveTabs;