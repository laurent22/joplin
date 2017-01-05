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

Dispatcher dispatcherInstance_;

Dispatcher& jop::dispatcher() {
	return dispatcherInstance_;
}
