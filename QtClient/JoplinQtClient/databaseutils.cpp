#include <stable.h>

#include "databaseutils.h"

using namespace jop;

QSqlQuery dbUtils::buildSqlQuery(QSqlDatabase* db, const QString& type, const QString& tableName, const QStringList& fields, const VariantVector& values, const QString& whereCondition) {
	QString sql;

	if (type.toLower() == "insert") {
		QString fieldString = "";
		QString valueString = "";
		for (int i = 0; i < fields.length(); i++) {
			QString f = fields[i];
			if (fieldString != "") fieldString += ", ";
			if (valueString != "") valueString += ", ";
			fieldString += f;
			valueString += ":" + f;
		}

		sql = QString("INSERT INTO %1 (%2) VALUES (%3)").arg(tableName).arg(fieldString).arg(valueString);
	} else if (type.toLower() == "update") {
		QString fieldString = "";
		for (int i = 0; i < fields.length(); i++) {
			QString f = fields[i];
			if (fieldString != "") fieldString += ", ";
			fieldString += f + " = :" + f;
		}

		sql = QString("UPDATE %1 SET %2").arg(tableName).arg(fieldString);
		if (whereCondition != "") sql += " WHERE " + whereCondition;
	}

	QSqlQuery query(*db);
	query.prepare(sql);
	for (int i = 0; i < values.size(); i++) {
		QVariant v = values[i];
		QString fieldName = ":" + fields[i];
		if (v.type() == QVariant::String) {
			query.bindValue(fieldName, v.toString());
		} else if (v.type() == QVariant::Int) {
			query.bindValue(fieldName, v.toInt());
		} else if (v.isNull()) {
			query.bindValue(fieldName, (int)NULL);
		} else if (v.type() == QVariant::Double) {
			query.bindValue(fieldName, v.toDouble());
		} else if (v.type() == (QVariant::Type)QMetaType::Float) {
			query.bindValue(fieldName, v.toFloat());
		} else if (v.type() == QVariant::LongLong) {
			query.bindValue(fieldName, v.toLongLong());
		} else if (v.type() == QVariant::UInt) {
			query.bindValue(fieldName, v.toUInt());
		} else if (v.type() == QVariant::Char) {
			query.bindValue(fieldName, v.toChar());
		} else {
			qWarning() << Q_FUNC_INFO << "Unsupported variant type:" << v.type();
		}
	}

	qDebug() <<"SQL:"<<sql;

	QMapIterator<QString, QVariant> i(query.boundValues());
	while (i.hasNext()) {
		i.next();
		qDebug() << i.key() << ":" << i.value().toString();
	}

	return query;
}
