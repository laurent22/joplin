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

	Synchronizer(WebApi &api, Database& database);
	void start();

private:

	QUrlQuery valuesToUrlQuery(const QHash<QString, BaseModel::Value> &values) const;
	WebApi& api_;
	Database& db_;

public slots:

	void api_requestDone(const QJsonObject& response, const QString& tag);

};

}

#endif // SYNCHRONIZER_H
