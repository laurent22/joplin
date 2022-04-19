export function pluginCategories() {

    type pluginCategory = {
        [key: string]: string;
    };
    const pluginCategoriesOptions: pluginCategory = {
    	'Attaché': 'files',
    	'Disable PDF': 'files',
    	'Simple Backup': 'files',
    	'Victor': 'files',
    	'Resource Search Plugin': 'files',
    	'Conflict Resolution': 'developer',
    	'Get Notebook ID': 'developer',
    	'Better Markdown Viewer': 'appearance',
    	'CodeMirror Line Numbers': 'appearance',
    	'Rich Markdown': 'editing',
    	'Insert Date': 'editing',
    	'Note Variables': 'editing',
    	'Paste Special': 'editing',
    	'Table Formatter Plugin': 'editing',
    	'BibTeX': 'integrations',
    	'Email Note': 'integrations',
    	'Export To SSG': 'integrations',
    	'Pages Publisher': 'integrations',
    	'Bible Quote': 'integrations',
    	'Jira Issue': 'integrations',
    	'Joplin Anki Sync': 'integration',
    	'joplin-hackmd': 'integrations',
    	'NLR': 'integrations',
    	'PlantUML2': 'integrations',
    	'Home Note': 'interface',
    	'Quick Goto': 'interface',
    	'Note Tabs': 'interface',
    	'Menu items, Shortcuts, Toolbar icons': 'interface',
    	'Note list and sidebar toggle buttons': 'interface',
    	'Favorites': 'interface',
    	'Folding in Code Mirror Editor': 'interface',
    	'Notes Station Import': 'interface',
    	'Outline': 'interface',
    	'Persistent Editor Layout': 'interface',
    	'Kanban': 'kanban',
    	'Autolinker': 'personal knowledge management',
    	'Automatic Backlinks to note': 'personal knowledge management',
    	'Copy Anchor Link': 'personal knowledge management',
    	'Copy link to active note': 'personal knowledge management',
    	'Create and go to #tags and @notebooks': 'personal knowledge management',
    };
    return pluginCategoriesOptions;
}

// export default pluginCategories;
