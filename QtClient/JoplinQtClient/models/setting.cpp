#include "setting.h"

#include "database.h"

using namespace jop;

void Setting::setSettings(const QSettings::SettingsMap &map) {
	jop::db().transaction();
	QString sql = "INSERT OR REPLACE INTO settings (`key`, `value`, `type`) VALUES (:key, :value, :type)";
	QSqlQuery query = jop::db().prepare(sql);
	for (QSettings::SettingsMap::const_iterator it = map.begin(); it != map.end(); ++it) {
		query.bindValue(":key", it.key());
		query.bindValue(":value", it.value());
		query.bindValue(":type", (int)it.value().type());
		jop::db().execQuery(query);
	}
	jop::db().commit();
}

QSettings::SettingsMap Setting::settings() {
	QSettings::SettingsMap output;
	QSqlQuery query("SELECT key, value, type FROM settings");
	jop::db().execQuery(query);
	while (query.next()) {
		QString key = query.value(0).toString();
		QMetaType::Type type = (QMetaType::Type)query.value(2).toInt();
		qDebug() << key << type;
	}
	return output;
}
