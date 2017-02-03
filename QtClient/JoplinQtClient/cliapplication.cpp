#include <stable.h>

#include "cliapplication.h"
#include "constants.h"
#include "database.h"
#include "paths.h"
#include "uuid.h"
#include "settings.h"
#include "models/folder.h"









#include <signal.h>



namespace jop {

StdoutHandler::StdoutHandler() : QTextStream(stdout) {}

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

// void CliApplication::processCommand(const Command& command) {
// 	qDebug() << "Command" << command.name();
// 	qDebug() << "Flags" << command.flags();
// 	qDebug() << "Args" << command.args();

// //	if (command == "mkdir") {

// //		//Folder folder;
// //		//folder.setValue("title", args[

// //	}
// }

int CliApplication::exec() {
	qDebug() << "===========================================";


	

	// QProcess* process = new QProcess();
	// qint64* processId = new qint64();
	// process->startDetached("/usr/bin/vim", QStringList(), QString(), processId);
	// while (kill(*processId, 0) == 0) {}
	// delete processId;


	QString command = "help";
	QStringList args = arguments();

	if (args.size() >= 2) {
		command = args[1];
		args.erase(args.begin() + 1);
	}

	QCommandLineParser parser;
	parser.addHelpOption();
	parser.addVersionOption();

	// mkdir "new_folder"
	// ls
	// ls new_folder
	// touch new_folder/new_note

	if (command == "mkdir") {
		parser.addPositionalArgument("path", "Folder path.");
	} else if (command == "ls") {
		parser.addPositionalArgument("path", "Folder path.");
	} else if (command == "touch") {
		parser.addPositionalArgument("path", "Note path.");
	} else {
		qDebug().noquote() << parser.helpText();
		return 1;
	}

	parser.process(args);

	args = parser.positionalArguments();

	if (command == "mkdir") {
		QString title = args.size() ? args[0] : QString();
		Folder folder;
		folder.setValue("title", title);
		folder.save();
	}

	if (command == "ls") {
		QString path = args.size() ? args[0] : QString();
		if (path == "") {
			std::vector<std::unique_ptr<Folder>> folders = Folder::all();
			for (size_t i = 0; i < folders.size(); i++) {
				qDebug().noquote() << folders[i].get()->value("title").toString();
			}
		} else {
			Folder folder;
			bool found = folder.loadByField("", "title", path);
			if (found) {
				qStdout() << "Found" << path << endl;
			} else {
				qWarning() << "Not found:" << path;
			}
		}
	}

	if (command == "touch") {
		QString path = args.size() ? args[0] : QString();
		if (path == "") {
			// std::vector<std::unique_ptr<Folder>> folders = Folder::all();
			// for (size_t i = 0; i < folders.size(); i++) {
			// 	qDebug().noquote() << folders[i].get()->value("title").toString();
			// }
		} else {
			std::vector<std::unique_ptr<Folder>> folders = Folder::pathToFolders(path, true);
			for (size_t i = 0; i < folders.size(); i++) {
				qDebug() << folders[i]->value("title").toString();
			}
		}
	}

	qDebug() << "===========================================";

	return 0;
}

}
