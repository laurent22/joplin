/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars, prefer-const */

const time = require('../../time').default;
const { setupDatabaseAndSynchronizer, supportDir, db, createNTestNotes, switchClient } = require('../../testing/test-utils.js');
const SearchEngine = require('../../services/searchengine/SearchEngine').default;
const Note = require('../../models/Note').default;
const Folder = require('../../models/Folder').default;
const Tag = require('../../models/Tag').default;
const shim = require('../../shim').default;
const ResourceService = require('../../services/ResourceService').default;


let engine = null;

const ids = (array) => array.map(a => a.id);

// This suite is essentially a copy of SearchFilter, but with Chinese terms and a few cases omitted:
//  - resource filter: the logic is the same as for the tag filter
//  - special cases of date filters: if the English versions pass, these should too
//  - 'should ignore dashes': the non-fts search does not ignore dashes
//  - prefix search: since this is using substring matching, every query is a prefix/suffix search
//  - special cases of notebook filters: if the English versions pass, these should too
describe('services_SearchFilterNonLatin', function() {
	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);

		engine = new SearchEngine();
		engine.setDb(db());

		done();
	});


	it('should return note matching title', (async () => {
		let rows;
		const n1 = await Note.save({ title: '实验', body: '洛雷姆' });
		const n2 = await Note.save({ title: '占位符', body: '洛雷姆' });

		await engine.syncTables();
		rows = await engine.search('title: 实验');

		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n1.id);
	}));

	it('should return note matching negated title', (async () => {
		let rows;
		const n1 = await Note.save({ title: '实验', body: '洛雷姆' });
		const n2 = await Note.save({ title: '占位符', body: '洛雷姆' });

		await engine.syncTables();
		rows = await engine.search('-title: 实验');

		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n2.id);
	}));

	it('should return note matching body', (async () => {
		let rows;
		const n1 = await Note.save({ title: '实验', body: '乔普林' });
		const n2 = await Note.save({ title: '占位符', body: '文字正文' });

		await engine.syncTables();
		rows = await engine.search('body: 乔普林');

		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n1.id);
	}));

	it('should return note matching negated body', (async () => {
		let rows;
		const n1 = await Note.save({ title: '实验', body: '乔普林' });
		const n2 = await Note.save({ title: '占位符', body: '文字正文' });

		await engine.syncTables();
		rows = await engine.search('-body: 乔普林');

		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n2.id);
	}));

	it('should return note matching title containing multiple characters', (async () => {
		let rows;
		const n1 = await Note.save({ title: '这是用于测试目的的示例文本', body: '乔普林' });
		const n2 = await Note.save({ title: '占位符', body: '文字正文' });

		await engine.syncTables();
		rows = await engine.search('title: "这 测"');

		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n1.id);
	}));

	it('should return note matching body containing multiple characters', (async () => {
		let rows;
		const n1 = await Note.save({ title: '这是用于测试目的的示例文本', body: '乔普林' });
		const n2 = await Note.save({ title: '占位符', body: '文字正文' });

		await engine.syncTables();
		rows = await engine.search('body: "文 正"');

		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n2.id);
	}));

	it('should return note matching title AND body', (async () => {
		let rows;
		const n1 = await Note.save({ title: '这是用于测试目的的示例文本', body: '乔普林' });
		const n2 = await Note.save({ title: '占位符', body: '文字正文' });

		await engine.syncTables();
		rows = await engine.search('title: 占 body: "字 文"');
		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n2.id);

		rows = await engine.search('title: 这 body: "文 字"');
		expect(rows.length).toBe(0);
	}));

	it('should return note matching title OR body', (async () => {
		let rows;
		const n1 = await Note.save({ title: '写作', body: '乔普林' });
		const n2 = await Note.save({ title: '占位符', body: '文字正文' });

		await engine.syncTables();
		rows = await engine.search('any:1 title: 写 body: 字正');
		expect(rows.length).toBe(2);
		expect(rows.map(r=>r.id)).toContain(n1.id);
		expect(rows.map(r=>r.id)).toContain(n2.id);

		rows = await engine.search('any:1 title: 面 body: "他 书"');
		expect(rows.length).toBe(0);
	}));

	it('should return notes matching text', (async () => {
		let rows;
		const n1 = await Note.save({ title: '写作', body: '乔普林' });
		const n2 = await Note.save({ title: '占位符', body: '我上班猫' });
		const n3 = await Note.save({ title: '有趣的', body: '喜欢猫' });
		await engine.syncTables();

		// Interpretation: Match with notes containing foo in title/body and bar in title/body
		// Note: This is NOT saying to match notes containing foo bar in title/body
		rows = await engine.search('有 喜');
		expect(rows.length).toBe(1);
		expect(rows.map(r=>r.id)).toContain(n3.id);

		rows = await engine.search('写 -猫');
		expect(rows.length).toBe(1);
		expect(rows.map(r=>r.id)).toContain(n1.id);

		rows = await engine.search('位 上');
		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n2.id);

		rows = await engine.search('花');
		expect(rows.length).toBe(0);
	}));

	it('should return notes matching any negated text', (async () => {
		let rows;
		const n1 = await Note.save({ title: '写作', body: '乔普林' });
		const n2 = await Note.save({ title: '占位符', body: '我上班猫' });
		const n3 = await Note.save({ title: '有趣的', body: '喜欢猫' });
		await engine.syncTables();

		rows = await engine.search('any:1 -写 -猫');
		expect(rows.length).toBe(3);
		expect(rows.map(r=>r.id)).toContain(n1.id);
		expect(rows.map(r=>r.id)).toContain(n2.id);
		expect(rows.map(r=>r.id)).toContain(n3.id);
	}));

	it('should return notes matching any negated title', (async () => {
		let rows;
		const n1 = await Note.save({ title: '写作', body: '乔普林' });
		const n2 = await Note.save({ title: '占位符', body: '我上班猫' });
		const n3 = await Note.save({ title: '有趣的', body: '喜欢猫' });
		await engine.syncTables();

		rows = await engine.search('any:1 -title:写 -title:占');
		expect(rows.length).toBe(3);
		expect(rows.map(r=>r.id)).toContain(n1.id);
		expect(rows.map(r=>r.id)).toContain(n2.id);
		expect(rows.map(r=>r.id)).toContain(n3.id);
	}));

	it('should return notes matching any negated body', (async () => {
		let rows;
		const n1 = await Note.save({ title: '写作', body: '乔普林' });
		const n2 = await Note.save({ title: '占位符', body: '我上班猫' });
		const n3 = await Note.save({ title: '有趣的', body: '喜欢猫' });
		await engine.syncTables();

		rows = await engine.search('any:1 -body:猫 -body:林');
		expect(rows.length).toBe(3);
		expect(rows.map(r=>r.id)).toContain(n1.id);
		expect(rows.map(r=>r.id)).toContain(n2.id);
		expect(rows.map(r=>r.id)).toContain(n3.id);
	}));

	it('should support phrase search', (async () => {
		let rows;
		const n1 = await Note.save({ title: '写作', body: '我上猫' });
		const n2 = await Note.save({ title: '占位符', body: '我上班猫' });
		await engine.syncTables();

		rows = await engine.search('"上猫"');
		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n1.id);
	}));

	it('should support filtering by tags', (async () => {
		let rows;
		const n1 = await Note.save({ title: '曲项', body: '向天歌' });
		const n2 = await Note.save({ title: '曲项', body: '向天歌' });
		const n3 = await Note.save({ title: '曲项', body: '向天歌' });
		const n4 = await Note.save({ title: '曲项', body: '向天歌' });
		const n5 = await Note.save({ title: '曲项', body: '向天歌' });

		await Tag.setNoteTagsByTitles(n1.id, ['标签']);
		await Tag.setNoteTagsByTitles(n2.id, ['标签']);

		await engine.syncTables();

		rows = await engine.search('向 tag:*');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('向 -tag:*');
		expect(rows.length).toBe(3);
		expect(ids(rows)).toContain(n3.id);
		expect(ids(rows)).toContain(n4.id);
		expect(ids(rows)).toContain(n5.id);
	}));


	it('should support filtering by notebook', (async () => {
		let rows;
		const folder0 = await Folder.save({ title: '笔记本0' });
		const folder1 = await Folder.save({ title: '笔记本1' });
		await Note.save({ title: '曲项', body: '向天歌', parent_id: folder0.id });
		await Note.save({ title: '曲项', body: '向天歌', parent_id: folder1.id });

		await engine.syncTables();

		rows = await engine.search('notebook:笔记本1');
		expect(rows.length).toBe(1);
	}));

	it('should support filtering by created date', (async () => {
		let rows;
		const n1 = await Note.save({ title: '这是做的', body: '2021年5月27日', user_created_time: Date.parse('2021-05-27') });
		const n2 = await Note.save({ title: '这是做的', body: '2021年5月26日', user_created_time: Date.parse('2021-05-26') });
		const n3 = await Note.save({ title: '这是做的', body: '2021年5月25日', user_created_time: Date.parse('2021-05-25') });

		await engine.syncTables();

		rows = await engine.search('这 created:20210527');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n1.id);

		rows = await engine.search('这 created:20210526');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('这 -created:20210526');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n3.id);

	}));

	it('should support filtering by type todo', (async () => {
		let rows;
		const t1 = await Note.save({ title: '曲项', body: '向天歌', is_todo: 1 });
		const t2 = await Note.save({ title: '曲项', body: '向天歌', is_todo: 1, todo_completed: 1590085027710 });
		const t3 = await Note.save({ title: '曲项', body: '向天歌' });

		await engine.syncTables();

		rows = await engine.search('曲 type:todo');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(t1.id);
		expect(ids(rows)).toContain(t2.id);

		rows = await engine.search('曲 iscompleted:1');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(t2.id);

		rows = await engine.search('曲 iscompleted:0');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(t1.id);
	}));

	it('should support filtering by type note', (async () => {
		let rows;
		const t1 = await Note.save({ title: '曲项', body: '向天歌', is_todo: 1 });
		const t2 = await Note.save({ title: '曲项', body: '向天歌', is_todo: 1, todo_completed: 1590085027710 });
		const t3 = await Note.save({ title: '曲项', body: '向天歌' });

		await engine.syncTables();

		rows = await engine.search('type:note');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(t3.id);
	}));

	it('should support filtering by due date', (async () => {
		let rows;
		const toDo1 = await Note.save({ title: '曲项', body: '向天歌', is_todo: 1, todo_due: Date.parse('2021-04-27') });
		const toDo2 = await Note.save({ title: '曲项', body: '向天歌', is_todo: 1, todo_due: Date.parse('2021-03-17') });
		const note1 = await Note.save({ title: '曲项', body: '向天歌' });

		await engine.syncTables();

		rows = await engine.search('曲 due:20210425');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(toDo1.id);

		rows = await engine.search('曲 -due:20210425');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(toDo2.id);
	}));

	it('should support filtering by latitude, longitude, altitude', (async () => {
		let rows;
		const n1 = await Note.save({ title: '曲项', body: '向天歌', latitude: 12.97, longitude: 88.88, altitude: 69.96 });
		const n2 = await Note.save({ title: '曲项', body: '向天歌', latitude: 42.11, longitude: 77.77, altitude: 42.00 });
		const n3 = await Note.save({ title: '曲项', body: '向天歌', latitude: 82.01, longitude: 66.66, altitude: 13.13 });

		await engine.syncTables();

		rows = await engine.search('曲 latitude:13.5');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n2.id);
		expect(ids(rows)).toContain(n3.id);

		rows = await engine.search('曲 -latitude:40');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n1.id);

		rows = await engine.search('曲 latitude:13 -latitude:80');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('曲 altitude:13.5');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('曲 -altitude:80.12');
		expect(rows.length).toBe(3);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);
		expect(ids(rows)).toContain(n3.id);

		rows = await engine.search('曲 longitude:70 -longitude:80');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('曲 latitude:20 longitude:50 altitude:40');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('曲 any:1 latitude:20 longitude:50 altitude:40');
		expect(rows.length).toBe(3);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);
		expect(ids(rows)).toContain(n3.id);
	}));


	it('should support filtering by sourceurl', (async () => {
		const n0 = await Note.save({ title: '曲项', source_url: 'https://discourse.joplinapp.org' });
		const n1 = await Note.save({ title: '曲项', source_url: 'https://google.com' });
		const n2 = await Note.save({ title: '曲项', source_url: 'https://reddit.com' });
		const n3 = await Note.save({ title: '曲项', source_url: 'https://joplinapp.org' });

		await engine.syncTables();

		let rows = await engine.search('曲 sourceurl:https://joplinapp.org');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n3.id);

		rows = await engine.search('曲 sourceurl:https://google.com');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n1.id);

		rows = await engine.search('曲 -sourceurl:https://google.com');
		expect(rows.length).toBe(3);
		expect(ids(rows)).toContain(n0.id);
		expect(ids(rows)).toContain(n2.id);
		expect(ids(rows)).toContain(n3.id);

		rows = await engine.search('曲 sourceurl:*joplinapp.org');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n0.id);
		expect(ids(rows)).toContain(n3.id);

	}));

	it('should support negating notebooks', (async () => {

		const folder1 = await Folder.save({ title: 'folder1' });
		const n1 = await Note.save({ title: '曲项', body: '向天歌', parent_id: folder1.id });
		const n2 = await Note.save({ title: '曲项', body: '向天歌', parent_id: folder1.id });

		const folder2 = await Folder.save({ title: 'folder2' });
		const n3 = await Note.save({ title: '曲项', body: '向天歌', parent_id: folder2.id });
		const n4 = await Note.save({ title: '曲项', body: '向天歌', parent_id: folder2.id });

		await engine.syncTables();

		let rows = await engine.search('曲 -notebook:folder1');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n3.id);
		expect(ids(rows)).toContain(n4.id);


		rows = await engine.search('曲 -notebook:folder2');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);

	}));

	it('should support filtering by note id', (async () => {
		let rows;
		const note1 = await Note.save({ title: '曲项', body: '向天歌' });
		const note2 = await Note.save({ title: '曲项', body: '向天歌' });
		await engine.syncTables();

		rows = await engine.search(`id:${note1.id}`);
		expect(rows.length).toBe(1);
		expect(rows.map(r=>r.id)).toContain(note1.id);

		rows = await engine.search(`any:1 id:${note1.id} id:${note2.id}`);
		expect(rows.length).toBe(2);
		expect(rows.map(r=>r.id)).toContain(note1.id);
		expect(rows.map(r=>r.id)).toContain(note2.id);

		rows = await engine.search(`any:0 id:${note1.id} id:${note2.id}`);
		expect(rows.length).toBe(0);

		rows = await engine.search(`-id:${note2.id}`);
		expect(rows.length).toBe(1);
		expect(rows.map(r=>r.id)).toContain(note1.id);
	}));

});
