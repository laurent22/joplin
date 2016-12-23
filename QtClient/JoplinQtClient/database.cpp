#include "database.h"

using namespace jop;

Database::Database(const QString &path) {
	version_ = -1;

	// QFile::remove(path);

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

QStringList Database::sqlStringToLines(const QString& sql) {
	QStringList statements;
	QStringList lines = sql.split("\n");
	QString statement;
	foreach (QString line, lines) {
		line = line.trimmed();
		if (line == "") continue;
		if (line.left(2) == "--") continue;
		statement += line;
		if (line[line.length() - 1] == ';') {
			statements.append(statement);
			statement = "";
		}
	}
	return statements;
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

			    QFile f(":/schema.sql");
				if  (!f.open(QFile::ReadOnly | QFile::Text)) {
					qFatal("Cannot open database schema file");
					return;
				}
				QTextStream in(&f);
				QString schemaSql = in.readAll();

				QStringList lines = sqlStringToLines(schemaSql);
				foreach (const QString& line, lines) {
					db_.exec(line);
				}

			break;

		}

		db_.exec(QString("UPDATE version SET version = %1").arg(targetVersion));
		db_.commit();

		versionIndex++;
	}
}
