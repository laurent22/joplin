#ifndef DATABASE_H
#define DATABASE_H

#include <stable.h>
#include "enum.h"
#include "simpletypes.h"

namespace jop {

class Database {

public:

	enum QueryType { Select, Insert, Update, Delete };

	Database();
	void initialize(const QString& path);
	QSqlDatabase& database();
	QSqlQuery buildSqlQuery(Database::QueryType type, const QString& tableName, const QStringList& fields, const VariantVector& values, const QString& whereCondition = "");
	QSqlQuery buildSqlQuery(Database::QueryType type, const QString& tableName, const QMap<QString, QVariant>& values, const QString& whereCondition = "");
	bool errorCheck(const QSqlQuery& query);
	bool transaction();
	bool commit();
	bool execQuery(QSqlQuery &query);
	QSqlQuery prepare(const QString& sql);

private:

	QSqlDatabase db_;
	void upgrade();
	int version() const;
	mutable int version_;
	QStringList sqlStringToLines(const QString& sql);
	int transactionCount_;

};


Database& db();

}

#endif // DATABASE_H
