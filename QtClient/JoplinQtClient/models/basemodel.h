#ifndef BASEMODEL_H
#define BASEMODEL_H

#include <stable.h>

#include "enum.h"

namespace jop {

class BaseModel {

public:

	struct Field {
		QString name;
		QMetaType::Type type;
	};

	class Value {

	public:

		Value();
		Value(const QString& v);
		Value(int v);
		Value(const QVariant& v);
		int toInt() const;
		QString toString() const;
		QVariant toQVariant() const;
		QMetaType::Type type() const;
		bool isValid() const;
		bool isEqual(const Value& v) const;

	private:

		QMetaType::Type type_;
		QString stringValue_;
		int intValue_;

	};

	BaseModel();
	QStringList changedFields() const;
	static int count(jop::Table table);
	bool save();
	bool dispose();

	virtual Table table() const;
	virtual QString primaryKey() const;
	virtual bool primaryKeyIsUuid() const;
	virtual bool trackChanges() const;

	bool isNew() const;

	static QVector<BaseModel::Field> tableFields(Table table);
	static bool hasField(jop::Table table, const QString& name);
	static QStringList tableFieldNames(Table table);
	static bool isValidFieldName(Table table, const QString& name);

	void loadSqlQuery(const QSqlQuery& query);
	QHash<QString, Value> values() const;
	Value value(const QString& name) const;
	bool valueIsSet(const QString& name) const;
	void setValue(const QString& name, const Value& value);
	void setValue(const QString& name, const QVariant& value);
	void setValue(const QString& name, const QString& value);
	void setValue(const QString& name, int value);
	Value id() const;

	static QString tableName(Table t);

protected:

	QHash<QString, bool> changedFields_;
	Table table_;
	QHash<QString, Value> values_;

	static QVariant cacheGet(const QString& key);
	static void cacheSet(const QString& key, const QVariant& value);
	static void cacheDelete(const QString& key);

	static QMap<int, QVector<BaseModel::Field>> tableFields_;
	static QHash<QString, QVariant> cache_;

};

}

#endif // BASEMODEL_H
