#include "window.h"

using namespace jop;

Window::Window() : QQuickView() {}

void Window::showPage(const QString &pageName) {
	qWarning() << "Window::showPage() disabled";
	return;

	QVariant pageNameV(pageName);
	QVariant returnedValue;
	QMetaObject::invokeMethod((QObject*)rootObject(), "showPage", Q_RETURN_ARG(QVariant, returnedValue), Q_ARG(QVariant, pageNameV));
}

QVariant Window::callQml(const QString &name, const QVariantList &args) {
	QVariant returnedValue;
	qDebug() << "Going to call QML:" << name;
	QObject* o = (QObject*)rootObject();
	if (args.size() == 0) {
		QMetaObject::invokeMethod(o, name.toStdString().c_str(), Q_RETURN_ARG(QVariant, returnedValue));
	} else if (args.size() == 1) {
		QMetaObject::invokeMethod(o, name.toStdString().c_str(), Q_RETURN_ARG(QVariant, returnedValue), Q_ARG(QVariant, args[0]));
	} else if (args.size() == 2) {
		QMetaObject::invokeMethod(o, name.toStdString().c_str(), Q_RETURN_ARG(QVariant, returnedValue), Q_ARG(QVariant, args[0]), Q_ARG(QVariant, args[1]));
	} else if (args.size() == 3) {
		QMetaObject::invokeMethod(o, name.toStdString().c_str(), Q_RETURN_ARG(QVariant, returnedValue), Q_ARG(QVariant, args[0]), Q_ARG(QVariant, args[1]), Q_ARG(QVariant, args[2]));
	} else {
		qFatal("Window::emitSignal: add support for more args!");
	}
	return returnedValue;
}

void Window::emitSignal(const QString &name, const QVariantList &args) {
	QString nameCopy(name);
	nameCopy = nameCopy.left(1).toUpper() + nameCopy.right(nameCopy.length() - 1);
	nameCopy = "emit" + nameCopy;
	callQml(nameCopy, args);
//	qDebug() << "Going to call QML:" << nameCopy;
//	QObject* o = (QObject*)rootObject();
//	if (args.size() == 0) {
//		QMetaObject::invokeMethod(o, nameCopy.toStdString().c_str(), Q_RETURN_ARG(QVariant, returnedValue));
//	} else if (args.size() == 1) {
//		QMetaObject::invokeMethod(o, nameCopy.toStdString().c_str(), Q_RETURN_ARG(QVariant, returnedValue), Q_ARG(QVariant, args[0]));
//	} else if (args.size() == 2) {
//		QMetaObject::invokeMethod(o, nameCopy.toStdString().c_str(), Q_RETURN_ARG(QVariant, returnedValue), Q_ARG(QVariant, args[0]), Q_ARG(QVariant, args[1]));
//	} else if (args.size() == 3) {
//		QMetaObject::invokeMethod(o, nameCopy.toStdString().c_str(), Q_RETURN_ARG(QVariant, returnedValue), Q_ARG(QVariant, args[0]), Q_ARG(QVariant, args[1]), Q_ARG(QVariant, args[2]));
//	} else {
//		qFatal("Window::emitSignal: add support for more args!");
//	}
}
