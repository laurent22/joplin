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
	QVariant data(const QModelIndex & index, int role = Qt::DisplayRole) const;
	bool setData(const QModelIndex &index, const QVariant &value, int role = Qt::EditRole);
	Folder* atIndex(int index) const;
	Folder* atIndex(const QModelIndex &index) const;

protected:

	BaseModel newBaseModel() const;
	int baseModelCount() const;
//	virtual BaseModel cacheGet(int index) const;
//	virtual void cacheSet(int index, const BaseModel& baseModel);
//	virtual bool cacheIsset(int index) const;
//	virtual void cacheClear();

private:

	QList<Folder> folders_;
	QString orderBy_;
	//mutable QVector<Folder> cache_;
	mutable std::vector<std::unique_ptr<Folder>> cache_;

	QString lastInsertId_;

public slots:

	void addData(const QString& title);
	void deleteData(const int index);
	bool setData(int index, const QVariant &value, int role = Qt::EditRole);	
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
