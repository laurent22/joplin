#include "synchronizer.h"
#include "models/folder.h"
#include "models/note.h"

using namespace jop;

Synchronizer::Synchronizer(const QString &apiUrl, Database &database) : api_(apiUrl), db_(database) {
	qDebug() << api_.baseUrl();
	state_ = Idle;
	uploadsRemaining_ = 0;
	downloadsRemaining_ = 0;
	connect(&api_, SIGNAL(requestDone(QJsonObject,QString)), this, SLOT(api_requestDone(QJsonObject,QString)));
}

void Synchronizer::start() {
	if (state_ != Idle) {
		qWarning() << "Cannot start synchronizer because synchronization already in progress. State: " << state_;
		return;
	}

	qDebug() << "Starting synchronizer...";

	state_ = UploadingChanges;

	QVector<Change> changes = Change::all();
	changes = Change::mergedChanges(changes);

	uploadsRemaining_ = changes.size();

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
				api_.put("folders/" + folder.id().toString(), QUrlQuery(), data, "upload:putFolder:" + folder.id().toString());

			} else if (type == Change::Update) {

				Folder folder;
				folder.load(itemId);
				QStringList mergedFields = change.mergedFields();
				QUrlQuery data;
				foreach (QString field, mergedFields) {
					data.addQueryItem(field, folder.value(field).toString());
				}
				api_.patch("folders/" + folder.id().toString(), QUrlQuery(), data, "upload:patchFolder:" + folder.id().toString());

			} else if (type == Change::Delete) {

				api_.del("folders/" + itemId, QUrlQuery(), QUrlQuery(), "upload:deleteFolder:" + itemId);

			}
		}
	}

	if (!uploadsRemaining_) {
		downloadChanges();
	}
}

void Synchronizer::setSessionId(const QString &v) {
	api_.setSessionId(v);
}

QUrlQuery Synchronizer::valuesToUrlQuery(const QHash<QString, Change::Value>& values) const {
	QUrlQuery query;
	for (QHash<QString, Change::Value>::const_iterator it = values.begin(); it != values.end(); ++it) {
		query.addQueryItem(it.key(), it.value().toString());
	}
	return query;
}

void Synchronizer::downloadChanges() {
	state_ = DownloadingChanges;
	//QUrlQuery data = valuesToUrlQuery(folder.values());
	api_.get("synchronizer", QUrlQuery(), QUrlQuery(), "download:getSynchronizer");
}

void Synchronizer::api_requestDone(const QJsonObject& response, const QString& tag) {
	QStringList parts = tag.split(':');
	QString category = parts[0];
	QString action = parts[1];
	QString id = "";

	if (parts.size() == 3) {
		id = parts[2];
	}

	qDebug() << "WebApi: done" << category << action << id;

	// TODO: check for error

	if (category == "upload") {
		uploadsRemaining_--;

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

		if (uploadsRemaining_ < 0) {
			qWarning() << "Mismatch on operations done:" << uploadsRemaining_;
		}

		if (uploadsRemaining_ <= 0) {
			uploadsRemaining_ = 0;
			downloadChanges();
		}
	} else if (category == "download") {
		if (action == "getSynchronizer") {
			QJsonArray items = response["items"].toArray();
			foreach (QJsonValue item, items) {
				QJsonObject obj = item.toObject();
				QString itemId = obj["item_id"].toString();
				QString itemType = obj["item_type"].toString();
				QString operationType = obj["type"].toString();

				QString path = itemType + "s"; // That should remain true

				if (operationType == "create") {
					api_.get(path + "/" + itemId, QUrlQuery(), QUrlQuery(), "download:getFolder:" + itemId);
				}

				downloadsRemaining_++;
			}
		} else {
			downloadsRemaining_--;

			if (action == "getFolder") {
				Folder folder;
				folder.loadJsonObject(response);
				folder.save();

				// TODO: save last rev ID
			}

			if (downloadsRemaining_ < 0) {
				qCritical() << "Mismatch on download operations done" << downloadsRemaining_;
			}

			if (downloadsRemaining_ <= 0) {
				qDebug() << "All download operations complete";
				downloadsRemaining_ = 0;
				state_ = Idle;
			}
		}
	} else {
		qCritical() << "Invalid category" << category;
	}
}
