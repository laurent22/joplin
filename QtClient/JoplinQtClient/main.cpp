#include <stable.h>

#include "models/folder.h"
#include "database.h"
#include "models/foldermodel.h"
#include "services/folderservice.h"

using namespace jop;

int main(int argc, char *argv[]) {
	QCoreApplication::setAttribute(Qt::AA_EnableHighDpiScaling);
	QGuiApplication app(argc, argv);

	Database db("D:/Web/www/joplin/database.sqlite");

//	FolderService s(db);
//	qDebug() << s.count();

//	Folder f = s.byId("35dbdd6e633566c4160e699a86601ab8");
//	qDebug() << f.id() << f.title() << f.createdTime();

//	QSqlQuery q = db.query("SELECT * FROM folders WHERE id = :id");
//	q.bindValue(":id", "35dbdd6e633566c4160e699a86601ab8");
//	q.exec();
//	q.next();

	//qDebug() << q.isValid();

//	Folder f;
//	f.fromSqlQuery(q);

//	qDebug() << f.title() << f.id() << f.createdTime();


	//QSqlQuery q = query("SELECT * FROM folders WHERE id = :id");
	//q.bindValue(":id", "a");
	//q.exec();


	FolderService folderService(db);
	FolderModel model(folderService);

	//Folder* f = new Folder(); f->setTitle("oneXXX"); model.addFolder(f);
	//f = new Folder(); f->setTitle("two"); model.addFolder(f);
	//f = new Folder(); f->setTitle("three"); model.addFolder(f);

//	QQuickView view;
//	view.setResizeMode(QQuickView::SizeRootObjectToView);
//	QQmlContext *ctxt = view.rootContext();
//	ctxt->setContextProperty("myModel", &model);



//	QSqlDatabase m_db = QSqlDatabase::addDatabase("QSQLITE");
//	m_db.setDatabaseName("D:/Web/www/joplin/QtClient/JoplinQtClient/test.sqlite3");

//	if (!m_db.open())
//	{
//		qDebug() << "Error: connection with database fail";
//	}
//	else
//	{
//		qDebug() << "Database: connection ok";
//	}

	//QQmlApplicationEngine engine;
	//engine.load(QUrl(QLatin1String("qrc:/main.qml")));

	QQuickView view;
	view.setResizeMode(QQuickView::SizeRootObjectToView);
	QQmlContext *ctxt = view.rootContext();
	ctxt->setContextProperty("folderTreeViewModel", &model);

	view.setSource(QUrl("qrc:/main.qml"));


	view.show();


	return app.exec();
}
