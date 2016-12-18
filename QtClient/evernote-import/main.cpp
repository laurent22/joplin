#include <QCoreApplication>
#include <QDebug>
#include <QFile>
#include <QXmlStreamReader>
#include <QDateTime>
#include <QSqlDatabase>
#include <QSqlQuery>
#include <QSqlRecord>

struct Resource {
	QString id;
	QString mime;
	QString filename;
	QByteArray data;
	time_t timestamp;

	Resource() : timestamp(0) {}
};

struct Note {
	int id;
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
	std::vector<Resource> resources;

	Note() : created(0), updated(0) {}
};

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

void parseResourceAttributes(QXmlStreamReader& reader, Resource& resource) {
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

void parseResourceRecognition(QXmlStreamReader& reader, Resource& resource) {
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

Resource parseResource(QXmlStreamReader& reader) {
	Resource output;
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
				return Resource();
			}

			output.data = QByteArray::fromBase64(reader.readElementText().toUtf8());
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

	//qDebug() << output.id << output.mime << output.filename << output.timestamp;

	return output;
}

Note parseNote(QXmlStreamReader& reader) {
	Note note;

	while (reader.readNextStartElement()) {
		if (reader.name() == "title") {
			note.title = reader.readElementText();
		} else if (reader.name() == "content") {
			note.content = reader.readElementText();
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

	//qDebug() << title << created << updated;

	//qDebug() << note.longitude << note.latitude << note.source << note.author << note.sourceUrl;

	//qDebug() << note.sourceApplication << note.reminderOrder << note.reminderDoneTime;

	return note;
}

std::vector<Note> parseXmlFile(const QString& filePath) {
	std::vector<Note> output;

	QFile file(filePath);
	if (!file.open(QIODevice::ReadOnly | QIODevice::Text)) {
		qWarning() << "Cannot open file" << filePath;
		return output;
	}

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


int main(int argc, char *argv[]) {
	QCoreApplication a(argc, argv);

//	QString dbPath = "D:/Web/www/joplin/QtClient/evernote-import/notes.sqlite";

//	QSqlDatabase db = QSqlDatabase::addDatabase("QSQLITE");
//	db.setDatabaseName(path);

//	if  (!db_.open()) {
//		qDebug() << "Error: connection with database fail";
//	} else {
//		qDebug() << "Database: connection ok";
//	}


	//std::vector<Note> notes = parseXmlFile("/home/laurent/Downloads/Notes/Laurent.enex");
	std::vector<Note> notes = parseXmlFile("/home/laurent/Downloads/Notes/a_faire.enex");
}
