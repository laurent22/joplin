#include "dispatcher.h"

using namespace jop;

Dispatcher::Dispatcher() {}

void Dispatcher::emitFolderCreated(const QString &folderId) {
	emit folderCreated(folderId);
}

void Dispatcher::emitFolderUpdated(const QString &folderId) {
	emit folderUpdated(folderId);
}

void Dispatcher::emitFolderDeleted(const QString &folderId) {
	emit folderDeleted(folderId);
}

void Dispatcher::emitAllFoldersDeleted() {
	emit allFoldersDeleted();
}

void Dispatcher::emitNoteCreated(const QString &noteId) {
	emit noteCreated(noteId);
}

void Dispatcher::emitNoteUpdated(const QString &noteId) {
	emit noteUpdated(noteId);
}

void Dispatcher::emitNoteDeleted(const QString &noteId) {
	emit noteDeleted(noteId);
}

void Dispatcher::emitLoginClicked(const QString &apiBaseUrl, const QString &email, const QString &password) {
	emit loginClicked(apiBaseUrl, email, password);
}

void Dispatcher::emitLogoutClicked() {
	emit logoutClicked();
}

void Dispatcher::emitLoginStarted() {
	emit loginStarted();
}

void Dispatcher::emitLoginFailed() {
	emit loginFailed();
}

void Dispatcher::emitLoginSuccess() {
	emit loginSuccess();
}

Dispatcher dispatcherInstance_;

Dispatcher& jop::dispatcher() {
	return dispatcherInstance_;
}
