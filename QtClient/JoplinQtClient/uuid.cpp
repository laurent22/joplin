#include <stable.h>
#include "uuid.h"

namespace jop {
namespace uuid {

QString createUuid(QString s) {
	if (s == "") s = QString("%1%2").arg(qrand()).arg(QDateTime::currentMSecsSinceEpoch());
	QString hash = QString(QCryptographicHash::hash(s.toUtf8(), QCryptographicHash::Sha256).toHex());
	return hash.left(32);
}

}
}
