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
	~Database();
	void initialize(const QString& path);
	void close();
	bool isClosed() const;
	QSqlDatabase* database() const;
	QSqlQuery buildSqlQuery(Database::QueryType type, const QString& tableName, const QStringList& fields, const VariantVector& values, const QString& whereCondition = "");
	QSqlQuery buildSqlQuery(Database::QueryType type, const QString& tableName, const QMap<QString, QVariant>& values, const QString& whereCondition = "");
	bool errorCheck(const QSqlQuery& query);
	bool transaction();
	bool commit();
	bool execQuery(QSqlQuery &query);
	bool execQuery(const QString &query);
	QSqlQuery prepare(const QString& sql);

private:

	QSqlDatabase* db_;
	void upgrade();
	int version() const;
	mutable int version_;
	QStringList sqlStringToLines(const QString& sql);
	void printError(const QSqlQuery& query) const;
	int transactionCount_;
	bool logQueries_;
	bool isClosed_;

};


Database& db();

}

#endif // DATABASE_H
