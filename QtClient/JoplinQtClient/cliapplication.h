#ifndef CLIAPPLICATION_H
#define CLIAPPLICATION_H

#include <stable.h>

#include "command.h"
#include "models/note.h"
#include "webapi.h"
#include "synchronizer.h"

namespace jop {

class StdoutHandler : public QTextStream {

public:

	StdoutHandler();

};

class StderrHandler : public QTextStream {

public:

	StderrHandler();

};

inline StdoutHandler& qStdout() {
	static StdoutHandler r;
	return r;
}

inline StderrHandler& qStderr() {
	static StderrHandler r;
	return r;
}

class CliApplication : public QCoreApplication {

	Q_OBJECT

public:

	CliApplication(int &argc, char **argv);
	~CliApplication();
	void processCommand(const Command &command);
	int exec();

public slots:

	void api_requestDone(const QJsonObject& response, const QString& tag);
	void synchronizer_started();
	void synchronizer_finished();

signals:

	void synchronizationDone();

private:

	bool filePutContents(const QString& filePath, const QString& content) const;
	void startSynchronization();
	QString fileGetContents(const QString& filePath) const;
	void saveNoteIfFileChanged(Note& note, const QDateTime& originalLastModified, const QString& noteFilePath);
	QStringList parseCommandLinePath(const QString& commandLine) const;
	QString commandLineArgsToString(const QStringList& args) const;
	WebApi api_;
	Synchronizer synchronizer_;

};

}

#endif // CLIAPPLICATION_H
