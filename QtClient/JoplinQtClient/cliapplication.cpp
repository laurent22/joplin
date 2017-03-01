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
StderrHandler::StderrHandler() : QTextStream(stderr) {}

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

	connect(&api_, SIGNAL(requestDone(const QJsonObject&, const QString&)), this, SLOT(api_requestDone(const QJsonObject&, const QString&)));
	connect(&synchronizer_, SIGNAL(started()), this, SLOT(synchronizer_started()));
	connect(&synchronizer_, SIGNAL(finished()), this, SLOT(synchronizer_finished()));
}

CliApplication::~CliApplication() {
	jop::db().close();
}

void CliApplication::api_requestDone(const QJsonObject& response, const QString& tag) {
	// TODO: handle errors
	// Handle expired sessions

	if (tag == "getSession") {
		if (response.contains("error")) {
			qStderr() << "Could not login: " << response.value("error").toString() << endl;
			emit synchronizationDone();
		} else {
			QString sessionId = response.value("id").toString();
			Settings settings;
			settings.setValue("session.id", sessionId);
			startSynchronization();
		}
	}
}

// Call this only once the API base URL has been defined and the session has been set.
void CliApplication::startSynchronization() {
	Settings settings;
	synchronizer_.api().setBaseUrl(api_.baseUrl());
	synchronizer_.setSessionId(settings.value("session.id").toString());
	synchronizer_.unfreeze();
	synchronizer_.start();
}

void CliApplication::synchronizer_started() {
	qDebug() << "Synchronization started...";
}

void CliApplication::synchronizer_finished() {
	qDebug() << "Synchronization finished...";
	emit synchronizationDone();
}

bool CliApplication::filePutContents(const QString& filePath, const QString& content) const {
	QFile file(filePath);
	if (!file.open(QIODevice::WriteOnly | QIODevice::Text)) return false;

	QTextStream out(&file);
	out << content;
	out.flush();
	return true;
}

QString CliApplication::fileGetContents(const QString& filePath) const {
	QFile file(filePath);
	if (!file.open(QIODevice::ReadOnly | QIODevice::Text)) return QString("");

	QTextStream in(&file);
	return in.readAll();
}

void CliApplication::saveNoteIfFileChanged(Note& note, const QDateTime& originalLastModified, const QString& noteFilePath) {
	if (originalLastModified == QFileInfo(noteFilePath).lastModified()) return;

	QString content = fileGetContents(noteFilePath);
	if (content.isEmpty()) return;

	note.patchFriendlyString(content);
	note.save();
}

// int CliApplication::execCommandConfig(QCommandLineParser& parser) {
// 	parser.addPositionalArgument("key", "Key of the config property.");
// 	parser.addPositionalArgument("value", "Value of the config property.");

// 	QCommandLineOption unsetOption(QStringList() << "unset", "Unset the given <key>.", "key");
// 	parser.addOption(unsetOption);

// 	QStringList args = parser.positionalArguments();
// 	Settings settings;

// 	QString propKey = args.size() >= 1 ? args[0] : "";
// 	QString propValue = args.size() >= 2 ? args[1] : "";
// 	if (propKey.isEmpty()) {
// 		QStringList propKeys = settings.allKeys();
// 		for (int i = 0; i < propKeys.size(); i++) {
// 			qStdout() << settings.keyValueToFriendlyString(propKeys[i]) << endl;
// 		}
// 		return 0;
// 	}

// 	if (propValue.isEmpty()) {
// 		qStdout() << settings.keyValueToFriendlyString(propKey) << endl;
// 		return 0;
// 	}

// 	settings.setValue(propKey, propValue);

// 	return 0;
// }

QStringList CliApplication::parseCommandLinePath(const QString& commandLine) const {
	QStringList output;
	int state = 0; // 0 = "outside quotes", 1 = "inside quotes"
	QString current("");
	for (int i = 0; i < commandLine.length(); i++) {
		QChar c = commandLine[i];
		
		// End quote
		if (c == '"' && state == 1) {
			output << current;
			current = "";
			state = 0;
			continue;
		}

		// Start quote
		if (c == '"' && state == 0) {
			state = 1;
			current = current.trimmed();
			if (current != "") output << current;
			current = "";
			state = 1;
			continue;
		}

		// A space when not inside a quoted string
		if (c == ' ' && state == 0) {
			current = current.trimmed();
			if (current != "") output << current;
			current = "";
			continue;
		}

		current += c;
	}

	if (state == 0) current = current.trimmed();
	if (current != "") output << current;

	return output;
}

QString CliApplication::commandLineArgsToString(const QStringList& args) const {
	QString output;
	for (int i = 0; i < args.size(); i++) {
		if (output != "") output += " ";
		QString arg = args[i];
		if (arg.contains(' ')) {
			output += QString("\"%1\"").arg(arg);
		} else {
			output += arg;
		}
	}
	return output;
}

int CliApplication::exec() {
	qDebug() << "===========================================";

	Settings settings;

	QString command = "help";
	QStringList args = arguments();

	if (args.size() >= 2) {
		command = args[1];
		args.erase(args.begin() + 1);
	}

	QCommandLineParser parser;
	QCommandLineOption helpOption(QStringList() << "h" << "help", "Display usage information.");
	parser.addOption(helpOption);
	parser.addVersionOption();

	// mkdir "new_folder"
	// rm "new_folder"
	// ls
	// ls new_folder
	// touch new_folder/new_note
	// edit new_folder/new_note
	// config editor "subl -w %1"
	// sync

	// TODO: implement mv "new_folder"

	if (command == "mkdir") {
		parser.addPositionalArgument("path", "Folder path.");
	} else if (command == "rm") {
		parser.addPositionalArgument("path", "Folder path.");
	} else if (command == "ls") {
		parser.addPositionalArgument("path", "Folder path.");
	} else if (command == "touch") {
		parser.addPositionalArgument("path", "Note path.");
	} else if (command == "edit") {
		parser.addPositionalArgument("path", "Note path.");
	} else if (command == "config") {
		parser.addPositionalArgument("key", "Key of the config property.");
		parser.addPositionalArgument("value", "Value of the config property.");
		parser.addOption(QCommandLineOption(QStringList() << "unset", "Unset the given <key>.", "key"));
	} else if (command == "sync") {

	} else if (command == "help") {

	} else {
		qStderr() << parser.helpText() << endl;
		return 1;
	}

	parser.process(args);

	if (parser.isSet(helpOption) || command == "help") {
		qStdout() << parser.helpText();
		return 0;
	}

	args = parser.positionalArguments();

	int errorCode = 0;

	if (command == "mkdir") {
		QString path = args.size() ? args[0] : QString();

		if (path.isEmpty()) {
			qStderr() << "Please provide a path or name for the folder.";
			return 1;
		}

		std::vector<std::unique_ptr<Folder>> folders = Folder::pathToFolders(path, false, errorCode);
		if (errorCode) {
			qStderr() << "Invalid path: " << path << endl;
			return 1;
		}

		Folder folder;
		folder.setValue("parent_id", folders.size() ? folders[folders.size() - 1]->idString() : "");
		folder.setValue("title", Folder::pathBaseName(path));
		folder.save();
	}

	if (command == "rm") {
		QString path = args.size() ? args[0] : QString();

		if (path.isEmpty()) {
			qStderr() << "Please provide a path or name for the folder.";
			return 1;
		}

		std::vector<std::unique_ptr<Folder>> folders = Folder::pathToFolders(path, true, errorCode);
		if (errorCode || !folders.size()) {
			qStderr() << "Invalid path: " << path << endl;
			return 1;
		}

		folders[folders.size() - 1]->dispose();
	}

	if (command == "ls") {
		QString path = args.size() ? args[0] : QString();
		std::vector<std::unique_ptr<Folder>> folders = Folder::pathToFolders(path, true, errorCode);

		if (errorCode) {
			qStderr() << "Invalid path: " << path << endl;
			return 1;
		}

		std::vector<std::unique_ptr<BaseModel>> children;
		if (folders.size()) {
			children = folders[folders.size() - 1]->children();
		} else {
			std::unique_ptr<Folder> root = Folder::root();
			children = root->children();
		}

		qStdout() << QString("Total: %1 items").arg(children.size()) << endl;
		for (size_t i = 0; i < children.size(); i++) {
			qStdout() << children[i]->displayTitle() << endl;
		}
	}

	if (command == "touch") {
		QString path = args.size() ? args[0] : QString();

		if (path.isEmpty()) {
			qStderr() << "Please provide a path or name for the note.";
			return 1;
		}

		std::vector<std::unique_ptr<Folder>> folders = Folder::pathToFolders(path, false, errorCode);

		if (errorCode) {
			qStderr() << "Invalid path: " << path << endl;
		} else {
			QString noteTitle = Folder::pathBaseName(path);

			Note note;
			note.setValue("parent_id", folders.size() ? folders[folders.size() - 1]->idString() : "");
			note.setValue("title", noteTitle);
			note.save();
		}
	}

	if (command == "edit") {
		QString path = args.size() ? args[0] : QString();

		if (path.isEmpty()) {
			qStderr() << "Please provide a path or name for the note.";
			return 1;
		}

		std::vector<std::unique_ptr<Folder>> folders = Folder::pathToFolders(path, false, errorCode);

		if (errorCode) {
			qStderr() << "Invalid path: " << path << endl;
		} else {
			// TODO: handle case where two notes with the same title exist

			QString editorCommandString = settings.value("editor").toString().trimmed();
			if (editorCommandString.isEmpty()) {
				qStderr() << "No editor is defined. Please define one using the \"config editor\" command." << endl;
				return 1;
			}

			QStringList editorCommand = parseCommandLinePath(editorCommandString);

			QString parentId = folders.size() ? folders[folders.size() - 1]->idString() : QString("");
			QString noteTitle = Folder::pathBaseName(path);
			Note note;
			if (!note.loadByField(parentId, QString("title"), noteTitle)) {
				note.setValue("parent_id", folders.size() ? folders[folders.size() - 1]->idString() : "");
				note.setValue("title", noteTitle);
				note.save();
				note.reload(); // To ensure that all fields are populated with the default values
			}

			QString noteFilePath = QString("%1/%2.txt").arg(paths::noteDraftsDir()).arg(note.idString());

			if (!filePutContents(noteFilePath, note.toFriendlyString())) {
				qStderr() << QString("Cannot open %1 for writing").arg(noteFilePath) << endl;
				return 1;
			}

			QFileInfo fileInfo(noteFilePath);
			QDateTime originalLastModified = fileInfo.lastModified();

			qStdout() << QString("Editing note \"%1\" (Either close the editor or press Ctrl+C when done)").arg(path) << endl;
			qDebug() << "File:" << noteFilePath;
			QProcess* process = new QProcess();
			qint64 processId = 0;

			QString editorCommandPath = editorCommand.takeFirst();
			editorCommand << noteFilePath;
			if (!process->startDetached(editorCommandPath, editorCommand, QString(), &processId)) {
				qStderr() << QString("Could not start command: %1").arg(editorCommandPath + " " + commandLineArgsToString(editorCommand)) << endl;
				return 1;
			}

			while (kill(processId, 0) == 0) { // While the process still exist
				QThread::sleep(2);
				saveNoteIfFileChanged(note, originalLastModified, noteFilePath);
			}

			saveNoteIfFileChanged(note, originalLastModified, noteFilePath);

			delete process; process = NULL;

			QFile::remove(noteFilePath);
		}
	}

	if (command == "config") {
		if (parser.isSet("unset")) {
			QString key = parser.value("unset").trimmed();
			settings.remove(key);
			return 0;
		}

		QString propKey = args.size() >= 1 ? args[0] : "";
		QString propValue = args.size() >= 2 ? args[1] : "";
		if (propKey.isEmpty()) {
			QStringList propKeys = settings.allKeys();
			for (int i = 0; i < propKeys.size(); i++) {
				qStdout() << settings.keyValueToFriendlyString(propKeys[i]) << endl;
			}
			return 0;
		}

		if (propValue.isEmpty()) {
			qStdout() << settings.keyValueToFriendlyString(propKey) << endl;
			return 0;
		}

		settings.setValue(propKey, propValue);
	}

	if (command == "sync") {
		QString sessionId = settings.value("session.id").toString();
		qDebug() << "Session ID:" << sessionId;

		// TODO: ask user
		api_.setBaseUrl("http://127.0.0.1:8000");

		QEventLoop loop;
		connect(this, SIGNAL(synchronizationDone()), &loop, SLOT(quit()));

		if (sessionId == "") {
			QTextStream qtin(stdin); 
			qStdout() << "Enter email:" << endl;
			QString email = qtin.readLine();
			qStdout() << "Enter password:" << endl;
			QString password = qtin.readLine();

			qDebug() << email << password;

			Settings settings;
			QUrlQuery postData;
			postData.addQueryItem("email", email);
			postData.addQueryItem("password", password);
			postData.addQueryItem("client_id", settings.value("clientId").toString());
			api_.post("sessions", QUrlQuery(), postData, "getSession");
		} else {
			startSynchronization();
		}

		loop.exec();

		qDebug() << "Synchronization done";
	}

	qDebug() << "=========================================== END";

	return 0;
}

}
