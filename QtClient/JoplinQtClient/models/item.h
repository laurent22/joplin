#ifndef ITEM_H
#define ITEM_H

#include <stable.h>

namespace jop {

class Item {

public:

	Item();

	QString id() const;
	QString title() const;
	int createdTime() const;
	int updatedTime() const;
	bool isPartial() const;
	static QStringList dbFields();

	void setId(const QString &v);
	void setTitle(const QString& v);
	void setCreatedTime(int v);
	void setIsPartial(bool v);

	void fromSqlQuery(const QSqlQuery& query);

private:

	QString id_;
	QString title_;
	time_t createdTime_;
	time_t updatedTime_;
	bool synced_;

	bool isPartial_;	

};

}

#endif // ITEM_H
