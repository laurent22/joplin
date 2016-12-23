#include <QCoreApplication>
#include <QDebug>
#include <QFile>
#include <QXmlStreamReader>
#include <QDateTime>
#include <QSqlDatabase>
#include <QSqlQuery>
#include <QDir>
#include <QSqlError>
#include <QSqlRecord>
#include <QCryptographicHash>
#include <QTextCodec>
#include <QDataStream>

#include "xmltomd.h"

struct EnMediaElement {
	QString hash;
	QString alt;
};

struct ContentElements {
	QList<EnMediaElement> enMediaElements;
};

struct Note {
	QString id;
	QString title;
	QString content;
	time_t created;
	time_t updated;
	QStringList tags;
	QString longitude;
	QString latitude;
	QString altitude;
	QString source;
	QString author;
	QString sourceUrl;
	QString reminderOrder;
	QString reminderDoneTime;
	QString reminderTime;
	QString sourceApplication;
	QString applicationData;
	QList<EnMediaElement> enMediaElements;
	std::vector<xmltomd::Resource> resources;

	Note() : created(0), updated(0) {}
};

QString createUuid(const QString& s) {
	QString hash = QString(QCryptographicHash::hash(s.toUtf8(), QCryptographicHash::Sha256).toHex());
	return hash.left(32);
}

time_t dateStringToTimestamp(const QString& s) {
	QDateTime d = QDateTime::fromString(s, "yyyyMMddThhmmssZ");
	d.setTimeSpec(Qt::UTC);
	if (!d.isValid()) return 0;
	return d.toTime_t();
}

void parseAttributes(QXmlStreamReader& reader, Note& note) {
	while (reader.readNextStartElement()) {
		if (reader.name() == "longitude") {
			note.longitude = reader.readElementText();
		} else if (reader.name() == "latitude") {
			note.latitude = reader.readElementText();
		} else if (reader.name() == "altitude") {
			note.altitude = reader.readElementText();
		} else if (reader.name() == "source") {
			note.source = reader.readElementText();
		} else if (reader.name() == "author") {
			note.author = reader.readElementText();
		} else if (reader.name() == "source-url") {
			note.sourceUrl = reader.readElementText();
		} else if (reader.name() == "source-application") {
			note.sourceApplication = reader.readElementText();
		} else if (reader.name() == "reminder-order") {
			note.reminderOrder = reader.readElementText();
		} else if (reader.name() == "reminder-time") {
			note.reminderTime = reader.readElementText();
		} else if (reader.name() == "reminder-done-time") {
			note.reminderDoneTime = reader.readElementText();
		} else if (reader.name() == "application-data") {
			note.applicationData = reader.readElementText();
		} else {
			qWarning() << "Unsupported <note-attributes> element:" << reader.name();
			reader.skipCurrentElement();
		}
	}
}

//	 <resource>
//	 	<data encoding="base64">
//	 		...........
//	 		...........
//	 	</data>
//	 	<mime>image/png</mime>
//	 	<width>500</width>
//	 	<height>326</height>
//	 	<recognition>
//	 		<![CDATA[<?xml version="1.0" encoding="UTF-8"?>
//	 		<!DOCTYPE recoIndex PUBLIC "SYSTEM" "http://xml.evernote.com/pub/recoIndex.dtd"><recoIndex docType="unknown" objType="image" objID="97db28a24bbb45c1b07e9a618cdb6835" engineVersion="6.6.33.5" recoType="service" lang="fr" objWidth="500" objHeight="326"/>
//	 		]]>
//	 	</recognition>
//	 	<resource-attributes>
//	 		<file-name>NoeudDeChaise.png</file-name>
//	 	</resource-attributes>
//	 </resource>

void parseResourceAttributes(QXmlStreamReader& reader, xmltomd::Resource& resource) {
	while (reader.readNextStartElement()) {
		if (reader.name() == "file-name") {
			resource.filename = reader.readElementText();
		} else if (reader.name() == "timestamp") {
			resource.timestamp = dateStringToTimestamp(reader.readElementText());
		} else if (reader.name() == "camera-make" || reader.name() == "source-url" || reader.name() == "attachment" || reader.name() == "longitude" || reader.name() == "latitude") {
			// Ignore it
			reader.skipCurrentElement();
		} else {
			qWarning() << "Unsupported <resource-attributes> element:" << reader.name();
			reader.skipCurrentElement();
		}
	}
}

void parseResourceRecognition(QXmlStreamReader& reader, xmltomd::Resource& resource) {
	QString recognitionXml = reader.readElementText();

	QXmlStreamReader r(recognitionXml.toUtf8());

	if (r.readNextStartElement()) {
		if (r.name() == "recoIndex") {
			QString objID;
			foreach (const QXmlStreamAttribute &attr, r.attributes()) {
				if (attr.name().toString() == "objID") {
					objID = attr.value().toString();
					break;
				}
			}

			resource.id = objID;

			r.skipCurrentElement();
		} else {
			qWarning() << "Unsupported <resource><recognition> element:" << r.name();
			r.skipCurrentElement();
		}
	}
}

xmltomd::Resource parseResource(QXmlStreamReader& reader) {
	xmltomd::Resource output;
	while (reader.readNextStartElement()) {
		if (reader.name() == "data") {
			QString encoding = "";
			foreach (const QXmlStreamAttribute &attr, reader.attributes()) {
				if (attr.name().toString() == "encoding") {
					encoding = attr.value().toString();
					break;
				}
			}
			if (encoding != "base64") {
				qWarning() << "Unsupported <resource><data> encoding:" << encoding;
				return xmltomd::Resource();
			}


			//qApp->exit(0);

			QByteArray ba;
//			qDebug() << reader.text();
//			qApp->exit(0);
			QString s = reader.readElementText();
			s = s.replace("\n", "");
			ba.append(s);
			output.data = QByteArray::fromBase64(ba);
//			qDebug() << output.data.toBase64();
//			exit(0);
		} else if (reader.name() == "mime") {
			output.mime = reader.readElementText();
		} else if (reader.name() == "resource-attributes") {
			parseResourceAttributes(reader, output);
		} else if (reader.name() == "width" || reader.name() == "height") {
			// Ignore it
			reader.skipCurrentElement();
		} else if (reader.name() == "recognition") {
			parseResourceRecognition(reader, output);
		} else {
			qWarning() << "Unsupported <resource> element:" << reader.name();
			reader.skipCurrentElement();
		}
	}

	if (!output.id.length()) {
		//output.id = createUuid(QString("%1%2%3%4").arg(output.filename).arg(output.timestamp).arg(QDateTime::currentMSecsSinceEpoch()).arg((int)qrand()));
	}

	return output;
}

ContentElements parseContentElements(const QString& content) {
	ContentElements output;
	QXmlStreamReader reader(content.toUtf8());

	if (reader.readNextStartElement()) {
		while (!reader.atEnd()) {
			reader.readNext();

			QStringRef n = reader.name();

			if (reader.isStartElement()) {
				if (n == "en-media") {
					EnMediaElement e;
					foreach (const QXmlStreamAttribute &attr, reader.attributes()) {
						if (attr.name().toString() == "hash") e.hash = attr.value().toString();
						if (attr.name().toString() == "alt") e.alt = attr.value().toString();
					}
					output.enMediaElements << e;
				}
			}
		}
	} else {
		qWarning() << "Cannot parse XML:" << content;
	}

	return output;
}

Note parseNote(QXmlStreamReader& reader) {
	Note note;

	while (reader.readNextStartElement()) {
		if (reader.name() == "title") {
			note.title = reader.readElementText();
		} else if (reader.name() == "content") {
			note.content = reader.readElementText();
			ContentElements contentElements = parseContentElements(note.content);
			note.enMediaElements = contentElements.enMediaElements;
		} else if (reader.name() == "created") {
			note.created = dateStringToTimestamp(reader.readElementText());
		} else if (reader.name() == "updated") {
			note.updated = dateStringToTimestamp(reader.readElementText());
		} else if (reader.name() == "tag") {
			note.tags.append(reader.readElementText());
		} else if (reader.name() == "resource") {
			note.resources.push_back(parseResource(reader));
		} else if (reader.name() == "note-attributes") {
			parseAttributes(reader, note);
		} else {
			qWarning() << "Unsupported <note> element:" << reader.name();
			reader.skipCurrentElement();
		}
	}

	note.id = createUuid(QString("%1%2%3%4%5")
	                     .arg(note.title)
	                     .arg(note.content)
	                     .arg(note.created)
	                     .arg(QDateTime::currentMSecsSinceEpoch())
	                     .arg((qint64)qrand()));

	// This is a bit of a hack. Notes sometime have resources attached to it, but those <resource> tags don't contain
	// an "objID" tag, making it impossible to reference the resource. However, in this case the content of the note
	// will contain a corresponding <en-media/> tag, which has the ID in the "hash" attribute. All this information
	// has been collected above so we now set the resource ID to the hash attribute of the en-media tags. Here's an
	// example of note that shows this problem:

	//	<?xml version="1.0" encoding="UTF-8"?>
	//	<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export2.dtd">
	//	<en-export export-date="20161221T203133Z" application="Evernote/Windows" version="6.x">
	//		<note>
	//			<title>Commande Asda</title>
	//			<content>
	//				<![CDATA[
	//				<?xml version="1.0" encoding="UTF-8"?>
	//				<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
	//				<en-note>
	//					<en-media alt="your QR code" hash="216a16a1bbe007fba4ccf60b118b4ccc" type="image/png"></en-media></en-note>]]>
	//				</content>
	//				<created>20160921T203424Z</created>
	//				<updated>20160921T203438Z</updated>
	//				<note-attributes>
	//					<reminder-order>20160902T140445Z</reminder-order>
	//					<reminder-done-time>20160924T101120Z</reminder-done-time>
	//				</note-attributes>
	//				<resource>
	//					<data encoding="base64">........</data>
	//					<mime>image/png</mime>
	//					<width>150</width>
	//					<height>150</height>
	//				</resource>
	//			</note>
	//		</en-export>

	int mediaHashIndex = 0;
	for (size_t i = 0; i < note.resources.size(); i++) {
		xmltomd::Resource& r = note.resources[i];
		if (r.id == "") {
			if (note.enMediaElements.size() <= mediaHashIndex) {
				qWarning() << "Resource without an ID and hash did not appear in note content:" << note.id;
			} else {
				r.id = note.enMediaElements[mediaHashIndex].hash;
				r.alt = note.enMediaElements[mediaHashIndex].alt;
				mediaHashIndex++;
			}
		}
	}

	return note;
}

std::vector<Note> parseXmlFile(const QString& filePath) {
	std::vector<Note> output;

	QFile file(filePath);
	if (!file.open(QIODevice::ReadOnly | QIODevice::Text)) {
		qWarning() << "Cannot open file" << filePath;
		return output;
	}

	QTextStream in(&file);
	in.setCodec("UTF-8");

	QByteArray fileData = file.readAll();

	QXmlStreamReader reader(fileData);

	if (reader.readNextStartElement()) {
		while (reader.readNextStartElement()) {
			if (reader.name() == "note") {
				Note note = parseNote(reader);
				output.push_back(note);
			} else {
				qWarning() << "Unsupported element:" << reader.name();
				reader.skipCurrentElement();
			}
		}
	}

	return output;
}

void filePutContents(const QString& filePath, const QString& content) {
	QFile file(filePath);
	if (file.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
		QTextStream stream(&file);
		stream << content;
	} else {
		qCritical() << "Cannot write to" << filePath;
	}
}

QString extensionFromMimeType(const QString& mimeType) {
	if (mimeType == "image/jpg" || mimeType == "image/jpeg") return ".jpg";
	if (mimeType == "image/png") return ".png";
	if (mimeType == "image/gif") return ".gif";
	return "";
}

int main(int argc, char *argv[]) {
	QCoreApplication a(argc, argv);

	QTextCodec::setCodecForLocale(QTextCodec::codecForName("UTF-8"));

	qsrand(QTime::currentTime().msec());

	QString dbPath = "D:/Web/www/joplin/QtClient/data/notes.sqlite";
	QString resourceDir = "D:/Web/www/joplin/QtClient/data/resources";

	QSqlDatabase db = QSqlDatabase::addDatabase("QSQLITE");
	db.setDatabaseName(dbPath);

	if  (!db.open()) {
		qWarning() << "Error: connection with database fail";
		return 1;
	} else {
		qDebug() << "Database: connection ok";
	}

	// TODO: REMOVE REMOVE REMOVE
	db.exec("DELETE FROM folders");
	db.exec("DELETE FROM notes");
	db.exec("DELETE FROM resources");
	db.exec("DELETE FROM note_resources");
	db.exec("DELETE FROM tags");
	// TODO: REMOVE REMOVE REMOVE

	QDir dir("S:/Docs/Textes/Calendrier/EvernoteBackup/Enex20161219");
	dir.setFilter(QDir::Files | QDir::Hidden | QDir::NoSymLinks);
	QFileInfoList fileList = dir.entryInfoList();
	QMap<QString, QList<Note>> tagNotes;

	for (int i = 0; i < fileList.size(); ++i) {
		QFileInfo fileInfo = fileList.at(i);

		db.exec("BEGIN TRANSACTION");

		QSqlQuery query(db);
		query.prepare("INSERT INTO folders (id, title, created_time, updated_time) VALUES (?, ?, ?, ?)");
		query.addBindValue(createUuid(QString("%1%2%3%4").arg(fileInfo.baseName()).arg(fileInfo.created().toTime_t()).arg((int)qrand()).arg(QDateTime::currentMSecsSinceEpoch())));
		query.addBindValue(fileInfo.baseName());
		query.addBindValue(fileInfo.created().toTime_t());
		query.addBindValue(fileInfo.created().toTime_t());
		query.exec();

		std::vector<Note> notes = parseXmlFile(fileInfo.absoluteFilePath());

		for (size_t noteIndex = 0; noteIndex < notes.size(); noteIndex++) {
			Note n = notes[noteIndex];
			for (size_t resourceIndex = 0; resourceIndex < n.resources.size(); resourceIndex++) {
				xmltomd::Resource resource = n.resources[resourceIndex];
				QSqlQuery query(db);
				query.prepare("INSERT INTO resources (id, title, mime, filename, created_time, updated_time) VALUES (?,?,?,?,?,?)");
				query.addBindValue(resource.id);
				query.addBindValue(resource.filename);
				query.addBindValue(resource.mime);
				query.addBindValue(resource.filename);
				query.addBindValue(resource.timestamp);
				query.addBindValue(resource.timestamp);
				query.exec();

				query = QSqlQuery(db);
				query.prepare("INSERT INTO note_resources (resource_id, note_id) VALUES (?,?)");
				query.addBindValue(resource.id);
				query.addBindValue(n.id);
				query.exec();

				QString resourceFilePath = resourceDir + "/" + resource.id;  //+ extensionFromMimeType(resource.mime);
				QFile resourceFile(resourceFilePath);
				if (resourceFile.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
					QDataStream stream(&resourceFile);
					stream << resource.data;
				} else {
					qWarning() << "Cannot write to" << resourceFilePath;
				}
			}
		}

		for (size_t noteIndex = 0; noteIndex < notes.size(); noteIndex++) {
			Note n = notes[noteIndex];

			// if (i != 8 || noteIndex != 3090) continue;

			time_t reminderOrder = dateStringToTimestamp(n.reminderOrder);

			QString markdown = xmltomd::evernoteXmlToMd(n.content, n.resources);

			QString html(n.content);
			html.replace("<?xml version=\"1.0\" encoding=\"UTF-8\"?>", "");
			html.replace("<!DOCTYPE en-note SYSTEM \"http://xml.evernote.com/pub/enml2.dtd\">", "");
			html = html.trimmed();

			html = "<style>* { margin: 0; padding:0; }</style><div style=\"width: 100%\"><div style=\"float: left; width: 45%; font-family:monospace;\">" + html + "</div><div style=\"float: left; width: 45%;\"><pre style=\"white-space: pre-wrap;\">" + markdown + "</pre></div></div>";

			QString generatedPath = "D:/Web/www/joplin/tests/generated";
			filePutContents(QString("%1/%2_%3.html").arg(generatedPath).arg(i).arg(noteIndex), html);

			QSqlQuery query(db);
			query.prepare("INSERT INTO notes (id, title, body, created_time, updated_time, longitude, latitude, altitude, source, author, source_url, is_todo, todo_due, todo_completed, source_application, application_data, `order`) VALUES (:id, :title,:body,:created_time,:updated_time,:longitude,:latitude,:altitude,:source,:author,:source_url,:is_todo,:todo_due,:todo_completed,:source_application,:application_data,:order)");
			query.bindValue(":id", n.id);
			query.bindValue(":title", n.title);
			query.bindValue(":body", markdown);
			query.bindValue(":created_time", n.created);
			query.bindValue(":updated_time", n.updated);
			query.bindValue(":longitude", n.longitude);
			query.bindValue(":latitude", n.latitude);
			query.bindValue(":altitude", n.altitude);
			query.bindValue(":source", n.source);
			query.bindValue(":author", n.author);
			query.bindValue(":source_url", n.sourceUrl);
			query.bindValue(":is_todo", reminderOrder ? 1 : 0);
			query.bindValue(":todo_due", dateStringToTimestamp(n.reminderTime));
			query.bindValue(":todo_completed", dateStringToTimestamp(n.reminderDoneTime));
			query.bindValue(":source_application", n.sourceApplication);
			query.bindValue(":application_data", n.applicationData);
			query.bindValue(":order", reminderOrder);
			query.exec();

			for (int tagIndex = 0; tagIndex < n.tags.size(); tagIndex++) {
				QString tag = n.tags[tagIndex];
				if (!tagNotes.contains(tag)) {
					tagNotes[tag] = QList<Note>();
				}
				tagNotes[tag] << n;
			}

			QSqlError error = query.lastError();
			if (error.isValid()) {
				qWarning() << "SQL error:" << error;
				db.exec("ROLLBACK");
				break;
			}
		}

		db.exec("COMMIT");
	}

	db.exec("BEGIN TRANSACTION");

	for (QMap<QString, QList<Note>>::const_iterator it = tagNotes.begin(); it != tagNotes.end(); ++it) {
		QString tagId = createUuid(QString("%1%2%3").arg(it.key()).arg((int)qrand()).arg(QDateTime::currentMSecsSinceEpoch()));

		QSqlQuery query(db);
		query.prepare("INSERT INTO tags (id, title, created_time, updated_time) VALUES (?,?,?,?)");
		query.addBindValue(tagId);
		query.addBindValue(it.key());
		query.addBindValue(QDateTime::currentDateTime().toTime_t());
		query.addBindValue(QDateTime::currentDateTime().toTime_t());
		query.exec();

		for (int i = 0; i < it.value().size(); i++) {
			Note note = it.value()[i];
			QSqlQuery query(db);
			query.prepare("INSERT INTO note_tags (note_id, tag_id) VALUES (?,?)");
			query.addBindValue(note.id);
			query.addBindValue(tagId);
			query.exec();
		}
	}

	db.exec("COMMIT");
}
