require('app-module-path').addPath(__dirname);

import { uuid } from 'src/uuid.js';
import moment from 'moment';


const Promise = require('promise');
const fs = require('fs');
const xml2js = require("xml2js");

function parseXml(xml) {
	return new Promise((resolve, reject) => {
		xml2js.parseString(xml, (err, result) => {
			if (err) {
				reject(err);
			} else {
				resolve(result);
			}
		});
	});
}

function readFile(path, options = null) {
	return new Promise((resolve, reject) => {
		fs.readFile(path, options, (err, result) => {
			if (err) {
				reject(err);
			} else {
				resolve(result);
			}
		});
	});
}

function xmlNodeText(xmlNode) {
	if (!xmlNode || !xmlNode.length) return '';
	return xmlNode[0];
}


function dateToTimestamp(s) {
	let m = moment(s, 'YYYYMMDDTHHmmssZ');
	if (!m.isValid()) {
		throw new Error('Invalid date: ' + s);
	}
	return Math.round(m.toDate().getTime() / 1000);
}

function xmlToMd(xml) {
	return parseXml(xml).then((xml) => {
		
	});
}

let contentTest = `
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note style="word-wrap: break-word; -webkit-nbsp-mode: space; -webkit-line-break: after-white-space;">
	Hello, World.
	<div>
		<br/>
	</div>
	<div>
		<en-media alt="" type="image/jpeg" hash="dd7b6d285d09ec054e8cd6a3814ce093"/>
	</div>
	<div>
		<br/>
	</div>
</en-note>
`;

xmlToMd(contentTest).then((md) => {
	console.info(md);
});


function toApiNote(xml) {
	let o = {};

	//console.info(xml);

	o.id = uuid.create();
	o.title = xmlNodeText(xml.title);

	// o.body = '';
	// if (xml.content && xml.content.length) {
	// 	o.body = xmlToMd(xml.content[0]);
	// }

	o.created_time = dateToTimestamp(xml.created);
	o.updated_time = dateToTimestamp(xml.updated);

	if (xml['note-attributes'] && xml['note-attributes'].length) {
		let attributes = xml['note-attributes'][0];
		o.latitude = xmlNodeText(attributes.latitude);
		o.longitude = xmlNodeText(attributes.longitude);
		o.altitude = xmlNodeText(attributes.altitude);
		o.author = xmlNodeText(attributes.author);
	}

	o.tags = [];
	if (xml.tag && xml.tag.length) o.tags = xml.tag;

	//console.info(o);

	return o;
}

	// `id` binary(16) NOT NULL,
	// `completed` tinyint(1) NOT NULL default '0',
	// `created_time` int(11) NOT NULL default '0',
	// `updated_time` int(11) NOT NULL default '0',
	// `latitude` DECIMAL(10, 8) NOT NULL default '0',
	// `longitude` DECIMAL(11, 8) NOT NULL default '0',
	// `altitude` DECIMAL(9, 4) NOT NULL default '0',
	// `parent_id` binary(16) NULL default NULL,
	// `owner_id` binary(16),
	// `is_encrypted` tinyint(1) NOT NULL default '0',
	// `encryption_method` int(11) NOT NULL default '0',
	// `order` int(11) NOT NULL default '0',
	// `is_todo` tinyint(1) NOT NULL default '0',
	// `todo_due` int(11) NOT NULL default '0',
	// `todo_completed` int(11) NOT NULL default '0',
	// `application_data` varchar(1024) NOT NULL DEFAULT "",
	// `author` varchar(512) NOT NULL DEFAULT "",
	// `source` varchar(512) NOT NULL DEFAULT "",
	// `source_application` varchar(512) NOT NULL DEFAULT "",
	// `source_url` varchar(1024) NOT NULL DEFAULT "",

// readFile('sample.enex', 'utf8').then((content) => {
// 	return parseXml(content);
// }).then((doc) => {
// 	let notes = doc['en-export']['note'];
// 	for (let i = 0; i < notes.length; i++) {
// 		let note = notes[i];
// 		let apiNote = toApiNote(note);
// 	}
// }).catch((error) => {
// 	console.error('Error reading XML file', error);
// });








// import { WebApi } from 'src/web-api.js'

// let api = new WebApi('http://joplin.local');

// api.post('sessions', null, {
// 	email: 'laurent@cozic.net',
// 	password: '12345678',
// }).then((session) => {
// 	console.info(session);
// });


// <?xml version="1.0" encoding="UTF-8"?>
// <!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export3.dtd">
// <en-export export-date="20130730T205637Z" application="Evernote" version="Evernote Mac">
// 	<note>
// 		<title>Test Note for Export</title>
// 		<content>
// 			<![CDATA[<?xml version="1.0" encoding="UTF-8" standalone="no"?>
// 			<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
// 			<en-note style="word-wrap: break-word; -webkit-nbsp-mode: space; -webkit-line-break: after-white-space;">
// 				Hello, World.
// 				<div>
// 					<br/>
// 				</div>
// 				<div>
// 					<en-media alt="" type="image/jpeg" hash="dd7b6d285d09ec054e8cd6a3814ce093"/>
// 				</div>
// 				<div>
// 					<br/>
// 				</div>
// 			</en-note>
// 			]]>
// 		</content>
// 		<created>20130730T205204Z</created>
// 		<updated>20130730T205624Z</updated>
// 		<tag>fake-tag</tag>
// 		<note-attributes>
// 			<latitude>33.88394692352314</latitude>
// 			<longitude>-117.9191355110099</longitude>
// 			<altitude>96</altitude>
// 			<author>Brett Kelly</author>
// 		</note-attributes>
// 		<resource>
// 			<data encoding="base64">/9j/4AAQSkZJRgABAQAAAQABAAD/4gxYSUNDX1BST0ZJTEUAAQEAAAxITGlubwIQAABtbnRyUkdCIFhZ
// 			WiAHzgACAAkABgAxAABhY3NwTVNGVAAAAABJRUMgc1JHQgAAAAAAAAAAAAAAAAAA9tYAAQAAAADTLUhQ
// 			<!-- ... -->
// 			kfeIGT/+uufk8DpM0gyVjGfmzkgetesnUoTHJ+5Cxn86zmv4/wB75EW+QHAPUH/P9Ky+s1rtrr/wfvOm
// 			dBSamnq/xPKp/hpLKmS7x4OBjgn6elee6v4OuLJirRSHb/FtyG9s9u1fR0+oTiIRvGq7W4bpisfUGk1C
// 			GVWtkIyM57n1rfDY+uqigtU76ffZkUsA6iajHZ6v/P8A4B//2Q==</data>
// 			<mime>image/jpeg</mime>
// 			<width>1280</width>
// 			<height>720</height>
// 			<resource-attributes>
// 				<file-name>snapshot-DAE9FC15-88E3-46CF-B744-DA9B1B56EB57.jpg</file-name>
// 			</resource-attributes>
// 		</resource>
// 	</note>
// 	<note>
// 		<title>Test Note for Export</title>
// 		<content>
// 			<![CDATA[<?xml version="1.0" encoding="UTF-8" standalone="no"?>
// 			<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
// 			<en-note style="word-wrap: break-word; -webkit-nbsp-mode: space; -webkit-line-break: after-white-space;">
// 				Hello, World.
// 				<div>
// 					<br/>
// 				</div>
// 				<div>
// 					<en-media alt="" type="image/jpeg" hash="dd7b6d285d09ec054e8cd6a3814ce093"/>
// 				</div>
// 				<div>
// 					<br/>
// 				</div>
// 			</en-note>
// 			]]>
// 		</content>
// 		<created>20130730T205204Z</created>
// 		<updated>20130730T205624Z</updated>
// 		<tag>fake-tag</tag>
// 		<note-attributes>
// 			<latitude>33.88394692352314</latitude>
// 			<longitude>-117.9191355110099</longitude>
// 			<altitude>96</altitude>
// 			<author>Brett Kelly</author>
// 		</note-attributes>
// 		<resource>
// 			<data encoding="base64">/9j/4AAQSkZJRgABAQAAAQABAAD/4gxYSUNDX1BST0ZJTEUAAQEAAAxITGlubwIQAABtbnRyUkdCIFhZ
// 			WiAHzgACAAkABgAxAABhY3NwTVNGVAAAAABJRUMgc1JHQgAAAAAAAAAAAAAAAAAA9tYAAQAAAADTLUhQ
// 			<!-- ... -->
// 			kfeIGT/+uufk8DpM0gyVjGfmzkgetesnUoTHJ+5Cxn86zmv4/wB75EW+QHAPUH/P9Ky+s1rtrr/wfvOm
// 			dBSamnq/xPKp/hpLKmS7x4OBjgn6elee6v4OuLJirRSHb/FtyG9s9u1fR0+oTiIRvGq7W4bpisfUGk1C
// 			GVWtkIyM57n1rfDY+uqigtU76ffZkUsA6iajHZ6v/P8A4B//2Q==</data>
// 			<mime>image/jpeg</mime>
// 			<width>1280</width>
// 			<height>720</height>
// 			<resource-attributes>
// 				<file-name>snapshot-DAE9FC15-88E3-46CF-B744-DA9B1B56EB57.jpg</file-name>
// 			</resource-attributes>
// 		</resource>
// 	</note>
// </en-export>

