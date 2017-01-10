#include "window.h"

using namespace jop;

Window::Window() : QQuickView() {}

void Window::showPage(const QString &pageName) {
	QVariant pageNameV(pageName);
	QVariant returnedValue;
	QMetaObject::invokeMethod((QObject*)rootObject(), "showPage", Q_RETURN_ARG(QVariant, returnedValue), Q_ARG(QVariant, pageNameV));
}
