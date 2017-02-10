#ifndef CLIAPPLICATION_H
#define CLIAPPLICATION_H

#include <stable.h>

#include "command.h"
#include "models/note.h"

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

public:

	CliApplication(int &argc, char **argv);
	~CliApplication();
	void processCommand(const Command &command);
	int exec();

private:

	bool filePutContents(const QString& filePath, const QString& content) const;
	QString fileGetContents(const QString& filePath) const;
	void saveNoteIfFileChanged(Note& note, const QDateTime& originalLastModified, const QString& noteFilePath);
	QStringList parseCommandLinePath(const QString& commandLine) const;
	QString commandLineArgsToString(const QStringList& args) const;

};

}

#endif // CLIAPPLICATION_H
