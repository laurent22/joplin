#ifndef CLIAPPLICATION_H
#define CLIAPPLICATION_H

#include <stable.h>

namespace jop {

class CliApplication : public QCoreApplication {

public:

	CliApplication(int &argc, char **argv);
	int exec();

};

}

#endif // CLIAPPLICATION_H
