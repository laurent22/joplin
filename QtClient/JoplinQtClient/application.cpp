#include "application.h"

#include "models/folder.h"
#include "database.h"
#include "models/foldermodel.h"
#include "models/change.h"
#include "services/folderservice.h"
#include "settings.h"
#include "uuid.h"
#include "dispatcher.h"

using namespace jop;

Application::Application(int &argc, char **argv) :
    QGuiApplication(argc, argv),
    db_(jop::db()),
    api_("http://joplin.local"),
    synchronizer_(api_.baseUrl(), db_),
    folderModel_(db_)

    {

	QString dbPath = "D:/Web/www/joplin/QtClient/data/notes.sqlite";
	jop::db().initialize(dbPath);

	// This is linked to where the QSettings will be saved. In other words,
	// if these values are changed, the settings will be reset and saved
	// somewhere else.
	QCoreApplication::setOrganizationName("Cozic");
	QCoreApplication::setOrganizationDomain("cozic.net");
	QCoreApplication::setApplicationName("Joplin");

	Settings::initialize();

	Settings settings;

	view_.setResizeMode(QQuickView::SizeRootObjectToView);
	QQmlContext *ctxt = view_.rootContext();
	ctxt->setContextProperty("folderListModel", &folderModel_);
	ctxt->setContextProperty("noteListModel", &noteModel_);
	ctxt->setContextProperty("noteModel", &selectedQmlNote_);

	view_.setSource(QUrl("qrc:/main.qml"));

	QObject* rootObject = (QObject*)view_.rootObject();

	connect(rootObject, SIGNAL(currentFolderChanged()), this, SLOT(view_currentFolderChanged()));
	connect(rootObject, SIGNAL(currentNoteChanged()), this, SLOT(view_currentNoteChanged()));
	connect(rootObject, SIGNAL(addFolderButtonClicked()), this, SLOT(view_addFolderButtonClicked()));

	connect(&dispatcher(), SIGNAL(folderCreated(QString)), this, SLOT(dispatcher_folderCreated(QString)));
	connect(&dispatcher(), SIGNAL(folderUpdated(QString)), this, SLOT(dispatcher_folderUpdated(QString)));
	connect(&dispatcher(), SIGNAL(folderDeleted(QString)), this, SLOT(dispatcher_folderDeleted(QString)));

	view_.show();

	synchronizerTimer_.setInterval(1000 * 60);
	synchronizerTimer_.start();

	connect(&synchronizerTimer_, SIGNAL(timeout()), this, SLOT(synchronizerTimer_timeout()));

	connect(&api_, SIGNAL(requestDone(const QJsonObject&, const QString&)), this, SLOT(api_requestDone(const QJsonObject&, const QString&)));


	// Don't store password, store session ID
	QString clientId = "B6E12222B6E12222";
	if (!settings.contains("user.email")) {
		settings.setValue("user.email", "laurent@cozic.net");
		settings.setValue("user.password", "12345678");
	}

	QUrlQuery postData;
	postData.addQueryItem("email", settings.value("user.email").toString());
	postData.addQueryItem("password", settings.value("user.password").toString());
	postData.addQueryItem("client_id", clientId);
	api_.post("sessions", QUrlQuery(), postData, "getSession");
}

void Application::api_requestDone(const QJsonObject& response, const QString& tag) {
	// TODO: handle errors
	// Handle expired sessions

	if (tag == "getSession") {
		QString sessionId = response.value("id").toString();
		Settings settings;
		settings.setValue("sessionId", sessionId);
		afterSessionInitialization();
		return;
	}
}

void Application::dispatcher_folderCreated(const QString &folderId) {
	qDebug() << "Folder created" << folderId;
	synchronizerTimer_.start(1000 * 3);
}

void Application::dispatcher_folderUpdated(const QString &folderId) {
	qDebug() << "Folder udpated" << folderId;
	synchronizerTimer_.start(1000 * 3);
}

void Application::dispatcher_folderDeleted(const QString &folderId) {
	qDebug() << "Folder deleted" << folderId;
	synchronizerTimer_.start(1000 * 3);
}

void Application::synchronizerTimer_timeout() {
	synchronizerTimer_.start(1000 * 60);
	synchronizer_.start();
}

QString Application::selectedFolderId() const {
	QObject* rootObject = (QObject*)view_.rootObject();

	int index = rootObject->property("currentFolderIndex").toInt();
	QModelIndex modelIndex = folderModel_.index(index);
	return folderModel_.data(modelIndex, FolderModel::IdRole).toString();
}

QString Application::selectedNoteId() const {
	QObject* rootObject = (QObject*)view_.rootObject();

	int index = rootObject->property("currentNoteIndex").toInt();
	QModelIndex modelIndex = noteModel_.index(index);
	return noteModel_.data(modelIndex, NoteModel::IdRole).toString();
}

void Application::afterSessionInitialization() {
	// TODO: rather than saving the session id, save the username/password and
	// request a new session everytime on startup.

	Settings settings;
	QString sessionId = settings.value("sessionId").toString();
	qDebug() << "Session:" << sessionId;
	api_.setSessionId(sessionId);
	synchronizer_.setSessionId(sessionId);
	synchronizer_.start();
}

void Application::view_currentFolderChanged() {
//	QString folderId = selectedFolderId();
//	noteCollection_ = NoteCollection(db_, folderId, "title ASC");
//	noteModel_.setCollection(noteCollection_);
}

void Application::view_currentNoteChanged() {
//	QString noteId = selectedNoteId();
//	Note note = noteCollection_.byId(noteId);
//	selectedQmlNote_.setNote(note);
}

void Application::view_addNoteButtonClicked() {

}

void Application::view_addFolderButtonClicked() {
//	QStringList fields;
//	fields << "id";
//	VariantVector values;
//	values << uuid::createUuid();
//	QSqlQuery q = db_.buildSqlQuery(Database::Insert, "folders", fields, values);
//	q.exec();

//	emit jop::dispatcher().folderCreated("test");

	//qDebug() << "Added" << q.lastInsertId().toString();
}
