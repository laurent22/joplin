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

	QVector<Change> changes = Change::all();
	changes = Change::mergedChanges(changes);
	foreach (Change change, changes) {
		jop::Table itemType = (jop::Table)change.value("item_type").toInt();
		QString itemId = change.value("item_id").toString();
		Change::Type type = (Change::Type)change.value("type").toInt();

		qDebug() << itemId << itemType << type;

		if (itemType == jop::FoldersTable) {

			if (type == Change::Create) {

				Folder folder;
				folder.load(itemId);
				QUrlQuery data = valuesToUrlQuery(folder.values());
				api_.put("folders/" + folder.id().toString(), QUrlQuery(), data, "putFolder:" + folder.id().toString());

			} else if (type == Change::Update) {

				Folder folder;
				folder.load(itemId);
				QStringList mergedFields = change.mergedFields();
				QUrlQuery data;
				foreach (QString field, mergedFields) {
					data.addQueryItem(field, folder.value(field).toString());
				}
				api_.patch("folders/" + folder.id().toString(), QUrlQuery(), data, "patchFolder:" + folder.id().toString());

			} else if (type == Change::Delete) {

				api_.del("folders/" + itemId, QUrlQuery(), QUrlQuery(), "deleteFolder:" + itemId);

			}
		}
	}
}

QUrlQuery Synchronizer::valuesToUrlQuery(const QHash<QString, Change::Value>& values) const {
	QUrlQuery query;
	for (QHash<QString, Change::Value>::const_iterator it = values.begin(); it != values.end(); ++it) {
		query.addQueryItem(it.key(), it.value().toString());
	}
	return query;
}

void Synchronizer::api_requestDone(const QJsonObject& response, const QString& tag) {
	qDebug() << "WebApi: done" << tag;

	QStringList parts = tag.split(':');
	QString action = tag;
	QString id = "";

	if (parts.size() == 2) {
		action = parts[0];
		id = parts[1];
	}

	// TODO: check for error

	qDebug() << "Synced folder" << id;

	if (action == "putFolder") {
		Change::disposeByItemId(id);
	}

	if (action == "patchFolder") {
		Change::disposeByItemId(id);
	}

	if (action == "deleteFolder") {
		Change::disposeByItemId(id);
	}
}
