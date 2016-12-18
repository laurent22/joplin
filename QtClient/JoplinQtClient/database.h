#ifndef DATABASE_H
#define DATABASE_H

#include <stable.h>

namespace jop {

class Database {

public:

	Database(const QString& path);
	Database();
	QSqlQuery query(const QString& sql) const;
	//QSqlQuery exec(const QString& sql, const QMap<QString, QVariant> &parameters);

private:

	QSqlDatabase db_;
	void upgrade();
	int version() const;
	mutable int version_;
	QStringList sqlStringToLines(const QString& sql);

};

}

#endif // DATABASE_H
