#ifndef FOLDERMODEL_H
#define FOLDERMODEL_H

#include <stable.h>

#include "models/folder.h"
#include "database.h"

namespace jop {

class FolderModel : public QAbstractListModel {

	Q_OBJECT

public:

	enum FolderRoles {
		IdRole = Qt::UserRole + 1,
		TitleRole,
		RawRole
	};

	FolderModel();

	void addFolder(Folder* folder);
	int rowCount(const QModelIndex & parent = QModelIndex()) const;
	QVariant data(const QModelIndex & index, int role = Qt::DisplayRole) const;
	bool setData(const QModelIndex &index, const QVariant &value, int role = Qt::EditRole);
	Folder atIndex(int index) const;
	Folder atIndex(const QModelIndex &index) const;

protected:

	QHash<int, QByteArray> roleNames() const;

private:

	QList<Folder> folders_;
	bool virtualItemShown_;
	QString orderBy_;
	mutable QVector<Folder> cache_;
	QString lastInsertId_;

public slots:

	void addData(const QString& title);
	void deleteData(const int index);
	bool setData(int index, const QVariant &value, int role = Qt::EditRole);
	void showVirtualItem();
	bool virtualItemShown() const;
	void hideVirtualItem();
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
