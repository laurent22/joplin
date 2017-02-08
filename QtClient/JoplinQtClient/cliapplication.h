#ifndef CLIAPPLICATION_H
#define CLIAPPLICATION_H

#include <stable.h>

#include "command.h"

namespace jop {

class StdoutHandler : public QTextStream {

public:

	StdoutHandler();

};

inline StdoutHandler& qStdout() {
	static StdoutHandler r;
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

};

}

#endif // CLIAPPLICATION_H
