#include "settings.h"
#include "models/setting.h"

using namespace jop;

Settings::Settings() : QSettings() {

}

bool readSqlite(QIODevice &device, QSettings::SettingsMap &map) {
	//qDebug() << "XXXXXXXXXXXX";
   // map = Setting::settings();
	qDebug() << "Calling readSqlite";
	return true;
}

bool writeSqlite(QIODevice &device, const QSettings::SettingsMap &map) {
	//Setting::setSettings(map);
	qDebug() << "Calling writeSqlite";
	return true;
}

void Settings::initialize() {
//	const QSettings::Format SqliteFormat = QSettings::registerFormat("sqlite", &readSqlite, &writeSqlite);
//	QSettings::setDefaultFormat(SqliteFormat);

//	QSettings settings;
//	//qDebug() << settings.value("test");
//	settings.setValue("test", 123456);

//	QSettings s(SqliteFormat, QSettings::UserScope, "MySoft",
//	            "Star Runner");
//	qDebug() << "IN" << s.value("test") << "test";
}
