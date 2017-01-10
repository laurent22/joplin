#include "application.h"

#include "models/folder.h"
#include "database.h"
#include "models/foldermodel.h"
#include "models/change.h"
#include "services/folderservice.h"
#include "settings.h"
#include "uuid.h"
#include "dispatcher.h"
#include "paths.h"
#include "constants.h"

using namespace jop;

Application::Application(int &argc, char **argv) :
    QGuiApplication(argc, argv),
    db_(jop::db()),
    synchronizer_(db_),
    folderModel_(db_)

    {

	// This is linked to where the QSettings will be saved. In other words,
	// if these values are changed, the settings will be reset and saved
	// somewhere else.
	QCoreApplication::setOrganizationName(jop::ORG_NAME);
	QCoreApplication::setOrganizationDomain(jop::ORG_DOMAIN);
	QCoreApplication::setApplicationName(jop::APP_NAME);

	qDebug() << "Config dir:" << paths::configDir();
	qDebug() << "Database file:" << paths::databaseFile();

	jop::db().initialize(paths::databaseFile());

	Settings::initialize();

	Settings settings;

	view_.setResizeMode(QQuickView::SizeRootObjectToView);
	QQmlContext *ctxt = view_.rootContext();
	ctxt->setContextProperty("folderListModel", &folderModel_);
	ctxt->setContextProperty("noteListModel", &noteModel_);
	ctxt->setContextProperty("noteModel", &selectedQmlNote_);
	ctxt->setContextProperty("dispatcher", &dispatcher());

	view_.setSource(QUrl("qrc:/app.qml"));

	QObject* rootObject = (QObject*)view_.rootObject();

	connect(rootObject, SIGNAL(currentFolderChanged()), this, SLOT(view_currentFolderChanged()));
	connect(rootObject, SIGNAL(currentNoteChanged()), this, SLOT(view_currentNoteChanged()));
	connect(rootObject, SIGNAL(addFolderButtonClicked()), this, SLOT(view_addFolderButtonClicked()));
	connect(rootObject, SIGNAL(syncButtonClicked()), this, SLOT(view_syncButtonClicked()));

	connect(&dispatcher(), SIGNAL(folderCreated(QString)), this, SLOT(dispatcher_folderCreated(QString)));
	connect(&dispatcher(), SIGNAL(folderUpdated(QString)), this, SLOT(dispatcher_folderUpdated(QString)));
	connect(&dispatcher(), SIGNAL(folderDeleted(QString)), this, SLOT(dispatcher_folderDeleted(QString)));
	connect(&dispatcher(), SIGNAL(loginClicked(QString,QString,QString)), this, SLOT(dispatcher_loginClicked(QString,QString,QString)));

	view_.show();

	synchronizerTimer_.setInterval(1000 * 120);
	synchronizerTimer_.start();

	connect(&synchronizerTimer_, SIGNAL(timeout()), this, SLOT(synchronizerTimer_timeout()));

	connect(&api_, SIGNAL(requestDone(const QJsonObject&, const QString&)), this, SLOT(api_requestDone(const QJsonObject&, const QString&)));

	if (!settings.contains("user.email") || !settings.contains("session.id") || !settings.contains("api.baseUrl")) {
		view_.showPage("login");
	} else {
		view_.showPage("main");
	}

	// Don't store password, store session ID
//	QString clientId = "B6E12222B6E12222";
//	if (!settings.contains("user.email")) {
//		settings.setValue("user.email", "laurent@cozic.net");
//		settings.setValue("user.password", "12345678");
//	}

//	QUrlQuery postData;
//	postData.addQueryItem("email", settings.value("user.email").toString());
//	postData.addQueryItem("password", settings.value("user.password").toString());
//	postData.addQueryItem("client_id", clientId);
	//	api_.post("sessions", QUrlQuery(), postData, "getSession");
}

void Application::login(const QString &email, const QString &password) {
	QUrlQuery postData;
	postData.addQueryItem("email", email);
	postData.addQueryItem("password", password);
	postData.addQueryItem("client_id", clientId());
	api_.post("sessions", QUrlQuery(), postData, "getSession");
}

QString Application::clientId() const {
	return "2222222222222222";
}

void Application::api_requestDone(const QJsonObject& response, const QString& tag) {
	// TODO: handle errors
	// Handle expired sessions

	if (tag == "getSession") {
		if (response.contains("error")) {
			qCritical() << "Could not get session:" << response.value("error").toString();
			dispatcher().emitLoginFailed();
		} else {
			QString sessionId = response.value("id").toString();
			qDebug() << "Got session" << sessionId;
			Settings settings;
			settings.setValue("session.id", sessionId);
			afterSessionInitialization();
			dispatcher().emitLoginSuccess();
		}
		view_.showPage("main");
		return;
	}
}

void Application::dispatcher_folderCreated(const QString &folderId) {
	qDebug() << "Folder created" << folderId;
	//synchronizerTimer_.start(1000 * 3);
}

void Application::dispatcher_folderUpdated(const QString &folderId) {
	qDebug() << "Folder udpated" << folderId;
	//synchronizerTimer_.start(1000 * 3);
}

void Application::dispatcher_folderDeleted(const QString &folderId) {
	qDebug() << "Folder deleted" << folderId;
	//synchronizerTimer_.start(1000 * 3);
}

void Application::dispatcher_loginClicked(const QString &apiBaseUrl, const QString &email, const QString &password) {
	qDebug() << apiBaseUrl << email << password;
	dispatcher().emitLoginStarted();

	Settings settings;
	settings.setValue("user.email", email);
	settings.setValue("api.baseUrl", apiBaseUrl);

	api_.setBaseUrl(apiBaseUrl);

	login(email, password);
}

void Application::synchronizerTimer_timeout() {
	//synchronizerTimer_.start(1000 * 10);
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
	QString sessionId = settings.value("session.id").toString();
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

void Application::view_syncButtonClicked() {
	synchronizer_.start();
}
