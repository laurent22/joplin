#include <stable.h>

#include "application.h"
#include "models/folder.h"
#include "database.h"
#include "models/foldermodel.h"
#include "services/folderservice.h"

using namespace jop;

int main(int argc, char *argv[]) {

#if (!defined(JOP_FRONT_END_GUI) && !defined(JOP_FRONT_END_CLI))
    qFatal("Either JOP_FRONT_END_GUI or JOP_FRONT_END_CLI must be defined!");
    return 1;
#endif

#if (defined(JOP_FRONT_END_GUI) && defined(JOP_FRONT_END_CLI))
    qFatal("JOP_FRONT_END_GUI and JOP_FRONT_END_CLI cannot both be defined!");
    return 1;
#endif

#ifdef JOP_FRONT_END_GUI
	QCoreApplication::setAttribute(Qt::AA_EnableHighDpiScaling);
	Application app(argc, argv);
#endif

#ifdef JOP_FRONT_END_CLI
    QCoreApplication app(argc, argv);
#endif

    return app.exec();
}
