#include "qmlutils.h"

namespace jop {
namespace qmlUtils {

QVariant callQml(QObject* o, const QString &name, const QVariantList &args) {
	QVariant returnedValue;
	//qDebug() << "Going to call QML:" << name << args;
	if (args.size() == 0) {
		QMetaObject::invokeMethod(o, name.toStdString().c_str(), Q_RETURN_ARG(QVariant, returnedValue));
	} else if (args.size() == 1) {
		QMetaObject::invokeMethod(o, name.toStdString().c_str(), Q_RETURN_ARG(QVariant, returnedValue), Q_ARG(QVariant, args[0]));
	} else if (args.size() == 2) {
		QMetaObject::invokeMethod(o, name.toStdString().c_str(), Q_RETURN_ARG(QVariant, returnedValue), Q_ARG(QVariant, args[0]), Q_ARG(QVariant, args[1]));
	} else if (args.size() == 3) {
		QMetaObject::invokeMethod(o, name.toStdString().c_str(), Q_RETURN_ARG(QVariant, returnedValue), Q_ARG(QVariant, args[0]), Q_ARG(QVariant, args[1]), Q_ARG(QVariant, args[2]));
	} else {
		qFatal("qmlUtils::callQml: add support for more args!");
	}
	return returnedValue;
}

QObject* childFromProperty(QObject *o, const QString &propertyName) {
	QVariant p = QQmlProperty(o, propertyName).read();
	if (!p.isValid()) {
		qCritical() << "Invalid QML property" << propertyName;
		return NULL;
	}
	return qvariant_cast<QObject*>(p);
}

}
}
