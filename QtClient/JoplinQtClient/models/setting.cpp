#include "setting.h"

#include "database.h"

using namespace jop;

void Setting::setSettings(const QSettings::SettingsMap &map) {
	jop::db().transaction();
	jop::db().execQuery("DELETE FROM settings");
	QString sql = "INSERT INTO settings (`key`, `value`, `type`) VALUES (:key, :value, :type)";
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
		QVariant val = query.value(1);
		QMetaType::Type type = (QMetaType::Type)query.value(2).toInt();
		if (type == QMetaType::Int) {
			output[key] = QVariant(val.toInt());
		} else if (type == QMetaType::QString) {
			output[key] = QVariant(val.toString());
		} else {
			qCritical() << "Unsupported setting type" << key << val << type;
		}
	}
	return output;
}
