#include "paths.h"

using namespace jop;

QString configDir_ = "";

QString paths::configDir() {
	if (configDir_ != "") return configDir_;

	configDir_ = QStandardPaths::writableLocation(QStandardPaths::GenericDataLocation) + "/" + QCoreApplication::applicationName();
	QDir d(configDir_);
	if (!d.exists()) {
		bool dirCreated = d.mkpath(".");
		if (!dirCreated) qFatal(QString("Cannot create config directory: " + configDir_).toLatin1());
	}
	return configDir_;
}

QString paths::databaseFile() {
	return QString("%1/%2.sqlite").arg(configDir()).arg(QCoreApplication::applicationName());
}
