#ifndef DATABASE_H
#define DATABASE_H

#include <stable.h>
#include "simpletypes.h"

namespace jop {

class Database {

public:

	enum QueryType { Select, Insert, Update, Delete };

	Database(const QString& path);
	Database();
	QSqlQuery query(const QString& sql) const;
	QSqlDatabase& database();
	QSqlQuery buildSqlQuery(Database::QueryType type, const QString& tableName, const QStringList& fields, const VariantVector& values, const QString& whereCondition = "");
	bool errorCheck(const QSqlQuery& query);

	//Change newChange() const;

private:

	QSqlDatabase db_;
	void upgrade();
	int version() const;
	mutable int version_;
	QStringList sqlStringToLines(const QString& sql);

};

}

#endif // DATABASE_H
