#include <stable.h>

#if defined(JOP_FRONT_END_CLI)
#include "cliapplication.h"
#elif defined(JOP_FRONT_END_GUI)
#include "application.h"
#endif

#include "models/folder.h"
#include "database.h"
#include "models/foldermodel.h"
#include "services/folderservice.h"

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
	qDebug() << "Front end: GUI";
	QCoreApplication::setAttribute(Qt::AA_EnableHighDpiScaling);
	jop::Application* app = new jop::Application(argc, argv);
#endif

#ifdef JOP_FRONT_END_CLI
	qDebug() << "Front end: CLI";
	jop::CliApplication* app = new jop::CliApplication(argc, argv);
#endif

    int errorCode = app->exec();

    delete app;
    app = NULL;
    
    return errorCode;
}