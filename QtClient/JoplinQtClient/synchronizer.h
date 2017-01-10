#ifndef SYNCHRONIZER_H
#define SYNCHRONIZER_H

#include <stable.h>
#include "webapi.h"
#include "database.h"
#include "models/change.h"

namespace jop {

class Synchronizer : public QObject {

	Q_OBJECT

public:

	enum SynchronizationState { Idle, UploadingChanges, DownloadingChanges };

	Synchronizer(Database& database);
	void start();
	void setSessionId(const QString& v);

private:

	QUrlQuery valuesToUrlQuery(const QHash<QString, BaseModel::Value> &values) const;
	WebApi api_;
	Database& db_;
	SynchronizationState state_;
	int uploadsRemaining_;
	void checkNextState();
	void switchState(SynchronizationState state);

public slots:

	void api_requestDone(const QJsonObject& response, const QString& tag);

};

}

#endif // SYNCHRONIZER_H
