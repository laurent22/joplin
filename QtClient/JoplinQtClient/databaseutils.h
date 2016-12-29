#ifndef DATABASEUTILS_H
#define DATABASEUTILS_H

#include <stable.h>
#include "simpletypes.h"

namespace jop {
namespace dbUtils {

QSqlQuery buildSqlQuery(QSqlDatabase* db, const QString& type, const QString& tableName, const QStringList& fields, const VariantVector& values, const QString& whereCondition = "");

}
}

#endif // DATABASEUTILS_H
