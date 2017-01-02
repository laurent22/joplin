#include "synchronizer.h"
#include "models/folder.h"
#include "models/note.h"

using namespace jop;

Synchronizer::Synchronizer(WebApi& api, Database &database) : api_(api), db_(database) {
	qDebug() << api_.baseUrl();
	connect(&api_, SIGNAL(requestDone(QJsonObject,QString)), this, SLOT(api_requestDone(QJsonObject,QString)));
}

void Synchronizer::start() {
	qDebug() << "Starting synchronizer...";

	QSqlQuery query;

//	std::vector<Folder> folders;
//	query = db_.query("SELECT " + Folder::dbFields().join(',') + " FROM folders WHERE synced = 0");
//	query.exec();

//	while (query.next()) {
//		Folder folder;
//		folder.fromSqlQuery(query);
//		folders.push_back(folder);
//	}

//	QList<Note> notes;
//	query = db_.query("SELECT " + Note::dbFields().join(',') + " FROM notes WHERE synced = 0");
//	query.exec();

//	while (query.next()) {
//		Note note;
//		note.fromSqlQuery(query);
//		notes << note;
//	}

//	for (size_t i = 0; i < folders.size(); i++) {
//		Folder folder = folders[i];
//		QUrlQuery data;
//		data.addQueryItem("id", folder.id());
//		data.addQueryItem("title", folder.title());
//		data.addQueryItem("created_time", QString::number(folder.createdTime()));
//		data.addQueryItem("updated_time", QString::number(folder.updatedTime()));
//		api_.put("folders/" + folder.id(), QUrlQuery(), data, "putFolder:" + folder.id());
//	}

//	return;

//	for (int i = 0; i < notes.size(); i++) {
//		Note note = notes[i];
//		QUrlQuery data;
//		data.addQueryItem("id", note.id());
//		data.addQueryItem("title", note.title());
//		data.addQueryItem("body", note.body());
//		data.addQueryItem("created_time", QString::number(note.createdTime()));
//		data.addQueryItem("updated_time", QString::number(note.updatedTime()));
//		api_.put("notes/" + note.id(), QUrlQuery(), data, "putNote:" + note.id());
//	}
}

void Synchronizer::api_requestDone(const QJsonObject& response, const QString& tag) {
	QSqlQuery query;
	QStringList parts = tag.split(':');
	QString action = tag;
	QString id = "";

	if (parts.size() == 2) {
		action = parts[0];
		id = parts[1];
	}

	if (action == "putFolder") {
		qDebug() << "Synced folder" << id;
		query = db_.query("UPDATE folders SET synced = 1 WHERE id = ?");
		query.addBindValue(id);
		query.exec();
	}

	if (action == "putNote") {
		// qDebug() << "Done note" << id;
//		query = db_.query("UPDATE notes SET synced = 1 WHERE id = ?");
//		query.addBindValue(id);
//		query.exec();
	}
}
