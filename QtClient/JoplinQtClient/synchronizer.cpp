#include "synchronizer.h"
#include "models/folder.h"
#include "models/note.h"
#include "settings.h"

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
	Settings settings;
	QString lastRevId = settings.value("lastRevId", "0").toString();

	state_ = DownloadingChanges;
	QUrlQuery query;
	query.addQueryItem("last_id", lastRevId);
	api_.get("synchronizer", query, QUrlQuery(), "download:getSynchronizer");
}

void Synchronizer::api_requestDone(const QJsonObject& response, const QString& tag) {
	QStringList parts = tag.split(':');
	QString category = parts[0];
	QString action = parts[1];
	QString arg1 = "";
	QString arg2 = "";

	if (parts.size() == 3) arg1 = parts[2];
	if (parts.size() == 4) arg2 = parts[3];

	qDebug() << "WebApi: done" << category << action << arg1 << arg2;

	// TODO: check for error

	if (category == "upload") {
		uploadsRemaining_--;

		qDebug() << "Synced folder" << arg1;

		if (action == "putFolder") {
			Change::disposeByItemId(arg1);
		}

		if (action == "patchFolder") {
			Change::disposeByItemId(arg1);
		}

		if (action == "deleteFolder") {
			Change::disposeByItemId(arg1);
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
			downloadsRemaining_ = 0;
			QJsonArray items = response["items"].toArray();
			foreach (QJsonValue item, items) {
				QJsonObject obj = item.toObject();
				QString itemId = obj["item_id"].toString();
				QString itemType = obj["item_type"].toString();
				QString operationType = obj["type"].toString();
				QString revId = obj["id"].toString();

				QString path = itemType + "s";

				if (operationType == "create") {
					api_.get(path + "/" + itemId, QUrlQuery(), QUrlQuery(), "download:createFolder:" + itemId + ":" + revId);
				}

				downloadsRemaining_++;
			}

			if (!downloadsRemaining_) {
				qDebug() << "All download operations complete";
				state_ = Idle;
			}
		} else {
			downloadsRemaining_--;

			Settings settings;

			if (action == "createFolder") {
				Folder folder;
				folder.loadJsonObject(response);
				folder.save(false);

				settings.setValue("lastRevId", arg2);
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
