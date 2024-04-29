
// Although `platforms: ['desktop', 'mobile']` is required to support both mobile
// and desktop, no plugin authors have done this as of 04/25/2024. As such, we include
// a list of plugins that have "platforms" default to ['desktop', 'mobile'] rather
// than just ['desktop'].
// cSpell:disable
const defaultSupportMobile = [
	'com.github.joplin.kanban',
	'com.hieuthi.joplin.function-plot',
	'com.hieuthi.joplin.markdown-table-colorize',
	'com.joplin.copy.codeBlocks',
	'com.whatever.inline-tags',
	'com.whatever.quick-links',
	'cx.evermeet.tessus.menu-shortcut-toolbar',
	'io.github.personalizedrefrigerator.codemirror6-settings',
	'io.github.personalizedrefrigerator.revealjs-integration',
	'io.treymo.LinkGraph',
	'jl15988.JoplinAlertsPerfectPlugin',
	'jl15988.JoplinCodePerfectPlugin',
	'joplin.plugin.alondmnt.history-panel',
	'joplin.plugin.ambrt.backlinksToNote',
	'joplin.plugin.ambrt.embedSearch',
	'joplin.plugin.note.tabs',
	'joplin.plugin.spoiler.cards',
	'net.cwesson.joplin-plugin-typograms',
	'org.joplinapp.plugins.AbcSheetMusic',
	'org.joplinapp.plugins.admonition',
	'org.joplinapp.plugins.joplin-calendar',
	'outline',
	'plugin.calebjohn.MathMode',
	'plugin.calebjohn.rich-markdown',
];
// cSpell:enable

const getDefaultPluginPlatforms = (id: string) => {
	if (defaultSupportMobile.includes(id)) {
		return ['desktop', 'mobile'];
	} else {
		return ['desktop'];
	}
};

export default getDefaultPluginPlatforms;
