#include <stab.h>

#include "cliapplication.h"
#include "constants.h"
#include "database.h"
#include "paths.h"
#include "uuid.h"
#include "settings.h"

namespace jop {

CliApplication::CliApplication(int &argc, char **argv) : QCoreApplication(argc, argv) {
	// This is linked to where the QSettings will be saved. In other words,
	// if these values are changed, the settings will be reset and saved
	// somewhere else.
	QCoreApplication::setOrganizationName(jop::ORG_NAME);
	QCoreApplication::setOrganizationDomain(jop::ORG_DOMAIN);
	QCoreApplication::setApplicationName(jop::APP_NAME);

	qInfo() << "Config dir:" << paths::configDir();
	qInfo() << "Database file:" << paths::databaseFile();
	qInfo() << "SSL:" << QSslSocket::sslLibraryBuildVersionString() << QSslSocket::sslLibraryVersionNumber();

	jop::db().initialize(paths::databaseFile());

	Settings::initialize();

	Settings settings;

	if (!settings.contains("clientId")) {
		// Client ID should be unique per instance of a program
		settings.setValue("clientId", uuid::createUuid());
	}
}

int CliApplication::exec() {
	qDebug() << "exec";
	return 0;
}

}
