#include "synchronizer.h"
#include "models/folder.h"
#include "models/note.h"
#include "settings.h"

using namespace jop;

Synchronizer::Synchronizer(const QString &apiUrl, Database &database) : api_(apiUrl), db_(database) {
	qDebug() << api_.baseUrl();
	state_ = Idle;
	uploadsRemaining_ = 0;
	//downloadsRemaining_ = 0;
	connect(&api_, SIGNAL(requestDone(QJsonObject,QString)), this, SLOT(api_requestDone(QJsonObject,QString)));
}

void Synchronizer::start() {
	if (state_ != Idle) {
		qWarning() << "Cannot start synchronizer because synchronization already in progress. State: " << state_;
		return;
	}

	qDebug() << "Starting synchronizer...";

	switchState(UploadingChanges);
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

void Synchronizer::checkNextState() {
	switch (state_) {

	    case UploadingChanges:

		    if (uploadsRemaining_ < 0) qCritical() << "Mismatch on upload operations done" << uploadsRemaining_;

			if (uploadsRemaining_ <= 0) {
				uploadsRemaining_ = 0;
				switchState(DownloadingChanges);
			}

		    break;

	    case DownloadingChanges:

		    switchState(Idle);

//		    if (downloadsRemaining_ < 0) qCritical() << "Mismatch on download operations done" << downloadsRemaining_;

//			if (downloadsRemaining_ <= 0) {
//				downloadsRemaining_ = 0;
//				switchState(Idle);
//			}
		    break;

	    case Idle:

		    break;

	    default:

		    qCritical() << "Synchronizer has invalid state" << state_;
		    break;

	}
}

void Synchronizer::switchState(Synchronizer::SynchronizationState state) {
	if (state_ == state) {
		qCritical() << "Trying to switch synchronizer to its current state" << state;
		return;
	}

	state_ = state;

	qDebug() << "Switching synchronizer state to" << state;

	if (state == Idle) {

		// =============================================================================================
		// IDLE STATE
		// =============================================================================================

	} else if (state == UploadingChanges) {

		// =============================================================================================
		// UPLOADING STATE
		// =============================================================================================

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

		checkNextState();

	} else if (state_ == DownloadingChanges) {

		// =============================================================================================
		// DOWNLOADING STATE
		// =============================================================================================

		Settings settings;
		QString lastRevId = settings.value("lastRevId", "0").toString();

		QUrlQuery query;
		query.addQueryItem("last_id", lastRevId);
		api_.get("synchronizer", query, QUrlQuery(), "download:getSynchronizer");

	}

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

	// =============================================================================================
	// HANDLE UPLOAD RESPONSE
	// =============================================================================================

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

		checkNextState();

	// =============================================================================================
	// HANDLE DOWNLOAD RESPONSE
	// =============================================================================================

	} else if (category == "download") {
		if (action == "getSynchronizer") {
			QJsonArray items = response["items"].toArray();
			QString maxRevId = "";
			foreach (QJsonValue it, items) {
				QJsonObject obj = it.toObject();
				QString itemId = obj["item_id"].toString();
				QString itemType = obj["item_type"].toString();
				QString operationType = obj["type"].toString();
				QString revId = obj["id"].toString();
				QJsonObject item = obj["item"].toObject();

				if (itemType == "folder") {
					if (operationType == "create") {
						Folder folder;
						folder.loadJsonObject(item);
						folder.save(false);
					}

					if (operationType == "update") {
						Folder folder;
						folder.load(itemId);
						folder.patchJsonObject(item);
						folder.save(false);
					}
				}

				if (revId > maxRevId) maxRevId = revId;
			}

			if (maxRevId != "") {
				Settings settings;
				settings.setValue("lastRevId", maxRevId);
			}

			checkNextState();

		}
	} else {
		qCritical() << "Invalid category" << category;
	}
}
