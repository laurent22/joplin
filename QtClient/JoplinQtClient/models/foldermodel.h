#ifndef FOLDERMODEL_H
#define FOLDERMODEL_H

#include <stable.h>

#include "models/folder.h"
#include "models/abstractlistmodel.h"
#include "database.h"

namespace jop {

class FolderModel : public AbstractListModel {

	Q_OBJECT

public:

	FolderModel();

	void addFolder(Folder* folder);
	BaseModel* atIndex(int index) const;

protected:

	int baseModelCount() const;
	BaseModel* cacheGet(int index) const;
	void cacheSet(int index, BaseModel *baseModel) const;
	bool cacheIsset(int index) const;
	void cacheClear() const;
	int cacheSize() const;

private:

	QList<Folder> folders_;
	QString orderBy_;
	mutable std::vector<std::unique_ptr<Folder>> cache_;

	QString lastInsertId_;

public slots:

	void addData(const QString& title);
	void deleteData(const int index);
	bool setTitle(int index, const QVariant &value, int role = Qt::EditRole);
	QString indexToId(int index) const;
	int idToIndex(const QString& id) const;
	QString lastInsertId() const;

	void dispatcher_folderCreated(const QString& folderId);
	void dispatcher_folderUpdated(const QString& folderId);
	void dispatcher_folderDeleted(const QString& folderId);
	void dispatcher_allFoldersDeleted();

};

}

#endif // FOLDERMODEL_H
