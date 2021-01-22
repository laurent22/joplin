const getWindowTitle = require('./getWindowTitle');
const Setting = require('@joplin/lib/models/Setting').default;

describe('Get Window Title', () => {

	test('Should produce string as Folder > Note', () => {

		const props = {
			'style': { 'width': 1440, 'height': 776 },
			'screens': { 'Main': {}, 'OneDriveLogin': {}, 'DropboxLogin': {}, 'Import': {}, 'Config': {}, 'Resources': {}, 'Status': {} },
			'route': { 'type': 'NAV_GO', 'routeName': 'Main', 'props': {} },
			'selectedNoteIds': ['1ce557cf187249e38f2458c78c20d09a'],
			'selectedFolderId': 'cea30a191961480ea7284861e90d5a54',
			'folders': [
				{
					'id': '349fcee65ad14fb2b64e69746c29a2d9',
					'title': 'self care',
					'created_time': 1611051715268,
					'updated_time': 1611051715268,
					'user_created_time': 1611051715268,
					'user_updated_time': 1611051715268,
					'encryption_cipher_text': '',
					'encryption_applied': 0,
					'parent_id': '',
					'is_shared': 0,
					'type_': 2,
					'note_count': 4,
				},
				{
					'id': 'cea30a191961480ea7284861e90d5a54',
					'title': 'testbook',
					'created_time': 1610346011550,
					'updated_time': 1611164153770,
					'user_created_time': 1610346011550,
					'user_updated_time': 1611164153770,
					'encryption_cipher_text': '',
					'encryption_applied': 0,
					'parent_id': '349fcee65ad14fb2b64e69746c29a2d9',
					'is_shared': 0,
					'type_': 2,
					'note_count': 2,
				}],
			'notes': [{
				'id': '1ce557cf187249e38f2458c78c20d09a',
				'title': 'Open source projects to contribute',
				'is_todo': 0,
				'todo_completed': 0,
				'todo_due': 0,
				'parent_id': 'cea30a191961480ea7284861e90d5a54',
				'encryption_applied': 0,
				'order': 0,
				'markup_language': 1,
				'is_conflict': 0,
				'updated_time': 1611164158759,
				'user_updated_time': 1611164158759,
				'user_created_time': 1610346016622,
				'type_': 1,
			}],
		};

		Setting.setConstant('env', 'dev');
		const title = getWindowTitle(props);
		expect(title).toBe('testbook > Open source projects to contribute - Joplin (DEV)');
	});



});
