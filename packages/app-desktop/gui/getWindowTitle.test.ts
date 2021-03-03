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
		const title = getWindowTitle(props);
		expect(title).toBe('testbook > Open source projects to contribute - Joplin (DEV)');
	});
	test('When no note is selected', () => {
		const _props = { ...props, selectedNoteIds: [] };
		const title = getWindowTitle(_props);
		expect(title).toBe('testbook - Joplin (DEV)');
	});
	test('When no folder is selected', () => {
		const _props = { ...props, selectedFolderId: null };
		const title = getWindowTitle(_props);
		expect(title).toBe('testbook > Open source projects to contribute - Joplin (DEV)');
	});
	test('When no note and folder is selected', () => {
		const _props = { ...props, selectedNoteIds: [], selectedFolderId: null };
		const title = getWindowTitle(_props);
		expect(title).toBe('Joplin (DEV)');
	});
	test('When not on main screen (dropbox login)', () => {
		const _props = { ...props, route: { 'routeName': 'DropboxLogin' } };
		const title = getWindowTitle(_props);
		expect(title).toBe('Dropbox Login - Joplin (DEV)');
	});
});
