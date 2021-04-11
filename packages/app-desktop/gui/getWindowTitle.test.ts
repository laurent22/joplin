import getWindowTitle from './getWindowTitle';
const Setting = require('@joplin/lib/models/Setting').default;

const props: any = {
	'screens': { 'Main': {}, 'DropboxLogin': { title: function() { return 'Dropbox Login'; } } },
	'route': { 'type': 'NAV_GO', 'routeName': 'Main', 'props': {} },
	'selectedNoteIds': ['1ce557cf187249e38f2458c78c20d09a'],
	'selectedFolderId': 'cea30a191961480ea7284861e90d5a54',
	'folders': [
		{
			'id': '349fcee65ad14fb2b64e69746c29a2d9',
			'title': 'self care',
		},
		{
			'id': 'cea30a191961480ea7284861e90d5a54',
			'title': 'testbook',
		}],
	'notes': [{
		'id': '1ce557cf187249e38f2458c78c20d09a',
		'title': 'Open source projects to contribute',
		'parent_id': 'cea30a191961480ea7284861e90d5a54',
	}],
};

describe('Get Window Title', () => {
	Setting.setConstant('env', 'dev');
	test('Should produce string as Folder > Note', () => {
		const title = getWindowTitle(props.notes, props.selectedNoteIds, props.selectedFolderId, props.folders, props.screens, props.route);
		expect(title).toBe('testbook > Open source projects to contribute - Joplin (DEV)');
	});
	test('When no note is selected', () => {
		const title = getWindowTitle(props.notes, [], props.selectedFolderId, props.folders, props.screens, props.route);
		expect(title).toBe('testbook - Joplin (DEV)');
	});
	test('When no folder is selected', () => {
		const title = getWindowTitle(props.notes, props.selectedNoteIds, null, props.folders, props.screens, props.route);
		expect(title).toBe('testbook > Open source projects to contribute - Joplin (DEV)');
	});
	test('When no note and folder is selected', () => {
		const title = getWindowTitle(props.notes, [], null, props.folders, props.screens, props.route);
		expect(title).toBe('Joplin (DEV)');
	});
	test('When not on main screen (dropbox login)', () => {
		const title = getWindowTitle(props.notes, props.selectedNoteIds, props.selectedFolderId, props.folders, props.screens, { 'type': 'NAV_GO', 'routeName': 'DropboxLogin', 'props': {} });
		expect(title).toBe('Dropbox Login - Joplin (DEV)');
	});
});
