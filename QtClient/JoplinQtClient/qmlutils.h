#ifndef QMLUTILS_H
#define QMLUTILS_H

#include <stable.h>

namespace jop {
namespace qmlUtils {

QVariant callQml(QObject* o, const QString &name, const QVariantList &args = QVariantList());
QObject* childFromProperty(QObject* o, const QString& propertyName);

}
}

#endif // QMLUTILS_H
