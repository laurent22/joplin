#include "database.h"

using namespace jop;

Database::Database(const QString &path) {
	version_ = -1;

	QFile::remove(path);

	db_ = QSqlDatabase::addDatabase("QSQLITE");
	db_.setDatabaseName(path);

	if  (!db_.open()) {
		qDebug() << "Error: connection with database fail";
	} else {
		qDebug() << "Database: connection ok";
	}

	upgrade();
}

Database::Database() {}

QSqlQuery Database::query(const QString &sql) const	{
	QSqlQuery output(db_);
	output.prepare(sql);
	return output;
}

//QSqlQuery Database::exec(const QString &sql, const QMap<QString, QVariant> &parameters) {
//	QSqlQuery query;
//	query.prepare(sql);

//	QMapIterator<QString, QVariant> it(parameters);
//	while (it.hasNext()) {
//		it.next();
//		qDebug() << i.key() << ": " << i.value();
//	}
//}

int Database::version() const {
	if (version_ >= 0) return version_;

	QSqlQuery query = db_.exec("SELECT * FROM version");
	bool result = query.next();
	if (!result) return 0;

	QSqlRecord r = query.record();
	int i_version = r.indexOf("version");

	version_ = query.value(i_version).toInt();
	return version_;
}

void Database::upgrade() {
	// INSTRUCTIONS TO UPGRADE THE DATABASE:
	//
	// 1. Add the new version number to the existingDatabaseVersions array
	// 2. Add the upgrade logic to the "switch (targetVersion)" statement below

	QList<int> existingVersions;
	existingVersions << 1;

	int versionIndex = existingVersions.indexOf(version());
	if (versionIndex == existingVersions.length() - 1) return;

	while (versionIndex < existingVersions.length() - 1) {
		int targetVersion = existingVersions[versionIndex + 1];

		qDebug() << "Upgrading database to version " << targetVersion;

		db_.transaction();

		switch (targetVersion) {

		    case 1:

			    db_.exec("CREATE TABLE version (version INT)");
				db_.exec("INSERT INTO version (version) VALUES (1)");

				db_.exec("CREATE TABLE folders (id TEXT PRIMARY KEY, title TEXT, created_time INT)");

				for (int i = 1; i < 100; i++) {
					QUuid uuid = QUuid::createUuid();
					QString title = QString::number(i);
					db_.exec(QString("INSERT INTO folders (id, title, created_time) VALUES (\"%1\", \"%2\", 1481235571)").arg(uuid.toString(), title.repeated(10)));
				}

				//db_.exec("INSERT INTO folders (id, title, created_time) VALUES (\"ed735d55415bee976b771989be8f7005\", \"bbbb\", 1481235571)");
				//db_.exec("INSERT INTO folders (id, title, created_time) VALUES (\"5d41402abc4b2a76b9719d911017c592\", \"cccc\", 1481235571)");

			break;

		}

		db_.exec(QString("UPDATE version SET version = %1").arg(targetVersion));
		db_.commit();

		versionIndex++;
	}
}
