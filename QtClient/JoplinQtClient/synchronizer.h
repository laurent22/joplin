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

	enum SynchronizationState { Idle, UploadingChanges, DownloadingChanges, Aborting, Frozen };

	Synchronizer();
	void start();
	void setSessionId(const QString& v);
	void abort();
	void freeze();
	void unfreeze();
	WebApi& api();

private:

	QUrlQuery valuesToUrlQuery(const QHash<QString, BaseModel::Value> &values) const;
	WebApi api_;
	SynchronizationState state_;
	int uploadsRemaining_;
	void checkNextState();
	void switchState(SynchronizationState state);

public slots:

	void api_requestDone(const QJsonObject& response, const QString& tag);

signals:

	void started();
	void finished();

};

}

#endif // SYNCHRONIZER_H
