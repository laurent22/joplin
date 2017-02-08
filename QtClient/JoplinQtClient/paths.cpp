#include "paths.h"

using namespace jop;

QString configDir_ = "";

QString paths::configDir() {
	if (configDir_ != "") return configDir_;

	configDir_ = QStandardPaths::writableLocation(QStandardPaths::GenericDataLocation) + "/" + QCoreApplication::applicationName();
	QDir d(configDir_);
	if (!d.exists()) {
		bool dirCreated = d.mkpath(".");
		if (!dirCreated) qFatal("Cannot create config directory: %s", configDir_.toStdString().c_str());
	}
	return configDir_;
}

QString paths::databaseFile() {
	return QString("%1/%2.sqlite").arg(configDir()).arg(QCoreApplication::applicationName());
}

QString paths::noteDraftsDir() {
	QString output = QString("%1/note_drafts").arg(paths::configDir());
	QDir d(output);
	if (!d.exists()) {
		bool dirCreated = d.mkpath(".");
		if (!dirCreated) qFatal("Cannot create note draft directory: %s", output.toStdString().c_str());
	}
	return output;
}