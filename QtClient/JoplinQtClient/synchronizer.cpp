#include "synchronizer.h"
#include "models/folder.h"
#include "models/note.h"
#include "settings.h"

using namespace jop;

Synchronizer::Synchronizer() {
	state_ = Idle;
	uploadsRemaining_ = 0;
	connect(&api_, SIGNAL(requestDone(QJsonObject,QString)), this, SLOT(api_requestDone(QJsonObject,QString)));
}

void Synchronizer::start() {
	if (state_ == Frozen) {
		qWarning() << "Cannot start synchronizer while frozen";
		return;
	}

	if (state_ != Idle) {
		qWarning() << "Cannot start synchronizer because synchronization already in progress. State: " << state_;
		return;
	}

	emit started();

	qInfo() << "Starting synchronizer...";

	switchState(UploadingChanges);
}

void Synchronizer::setSessionId(const QString &v) {
	api_.setSessionId(v);
}

void Synchronizer::abort() {
	switchState(Aborting);
}

void Synchronizer::freeze() {
	switchState(Frozen);
}

void Synchronizer::unfreeze() {
	switchState(Idle);
}

WebApi &Synchronizer::api() {
	return api_;
}

QUrlQuery Synchronizer::valuesToUrlQuery(const QHash<QString, Change::Value>& values) const {
	QUrlQuery query;
	for (QHash<QString, Change::Value>::const_iterator it = values.begin(); it != values.end(); ++it) {
		if (it.key() == "id") continue;
		query.addQueryItem(it.key(), it.value().toString());
	}
	return query;
}

void Synchronizer::checkNextState() {
	qDebug() << "Synchronizer::checkNextState from state" << state_;

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
			emit finished();
			break;

		case Idle:

			break;

		case Aborting:

			switchState(Idle);
			emit finished();
			break;

		case Frozen:

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

	qInfo() << "Switching synchronizer state to" << state;

	if (state == Idle) {

		// =============================================================================================
		// IDLE STATE
		// =============================================================================================

	} else if (state == UploadingChanges) {

		// =============================================================================================
		// UPLOADING STATE
		// =============================================================================================

		std::vector<Change*> changes = Change::all();
		Change::mergedChanges(changes);

		uploadsRemaining_ = changes.size();

		for (size_t i = 0; i < changes.size(); i++) {
			Change* change = changes[i];

			jop::Table itemType = (jop::Table)change->value("item_type").toInt();
			QString itemId = change->value("item_id").toString();
			Change::Type type = (Change::Type)change->value("type").toInt();

			qDebug() << "Change" << change->idString() << itemId << itemType;

			if (itemType == jop::FoldersTable) {

				if (type == Change::Create) {

					Folder folder;
					folder.load(itemId);
					QUrlQuery data = valuesToUrlQuery(folder.values());
					api_.put("folders/" + folder.idString(), QUrlQuery(), data, "upload:putFolder:" + folder.idString());

				} else if (type == Change::Update) {

					Folder folder;
					folder.load(itemId);
					QStringList mergedFields = change->mergedFields();
					QUrlQuery data;
					foreach (QString field, mergedFields) {
						data.addQueryItem(field, folder.value(field).toString());
					}
					api_.patch("folders/" + folder.idString(), QUrlQuery(), data, "upload:patchFolder:" + folder.idString());

				} else if (type == Change::Delete) {

					api_.del("folders/" + itemId, QUrlQuery(), QUrlQuery(), "upload:deleteFolder:" + itemId);

				}
			} else {

				qFatal("Unsupported item type: %d", itemType);

			}
		}

		for (size_t i = 0; i < changes.size(); i++) {
			delete changes[i];
		}
		changes.clear();

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

	} else if (state == Aborting) {

		// =============================================================================================
		// ABORTING STATE
		// =============================================================================================

		uploadsRemaining_ = 0;
		api_.abortAll();
		checkNextState();

	} else if (state == Frozen) {

		// =============================================================================================
		// FROZEN STATE
		// =============================================================================================

	}

}

void Synchronizer::api_requestDone(const QJsonObject& response, const QString& tag) {
	if (state_ == Frozen) {
		qWarning() << "Receiving response while synchronizer is frozen";
		return;
	}

	QStringList parts = tag.split(':');
	QString category = parts[0];
	QString action = parts[1];
	QString arg1 = "";
	QString arg2 = "";

	if (parts.size() == 3) arg1 = parts[2];
	if (parts.size() == 4) arg2 = parts[3];

	qInfo() << "WebApi: done" << category << action << arg1 << arg2;

	QString error = "";

	if (response.contains("error")) {
		error = response.value("error").toString();
		qCritical().noquote() << "Sync error:" << error;
		// Each action might handle errors differently so let it proceed below
	}

	// =============================================================================================
	// HANDLE UPLOAD RESPONSE
	// =============================================================================================

	if (state_ == UploadingChanges) {
		uploadsRemaining_--;

		if (error == "") {
			qInfo() << "Synced folder" << arg1;

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
		}

		checkNextState();

	// =============================================================================================
	// HANDLE DOWNLOAD RESPONSE
	// =============================================================================================

	} else if (state_ == DownloadingChanges) {
		if (error != "") {
			checkNextState();
		} else {
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

						if (operationType == "delete") {
							Folder folder;
							folder.load(itemId);
							folder.dispose();
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
		}
	} else {
		qCritical() << "Invalid category" << category;
	}
}
