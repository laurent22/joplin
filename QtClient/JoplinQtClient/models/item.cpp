#include "models/item.h"
#include "constants.h"

namespace jop {

Item::Item() {}

QString Item::toFriendlyString() const {
	QStringList shownKeys;
	shownKeys << "author" << "longitude" << "latitude" << "is_todo" << "todo_due" << "todo_completed";

	QStringList output;
	output << value("title").toString();
	output << "";
	output << value("body").toString();
	output << "================================================================================";
	QHash<QString, Value> values = this->values();
	for (int i = 0; i < shownKeys.size(); i++) {
		QString key = shownKeys[i];
		if (!values.contains(key)) continue;
		output << QString("%1: %2").arg(key).arg(values[key].toString());
	}
	return output.join(NEW_LINE);
}

void Item::patchFriendlyString(const QString& patch) {
	QHash<QString, QString> values;
	QStringList lines = patch.split(jop::NEW_LINE);

	QString title("");
	if (lines.size() >= 1) {
		title = lines[0];
	}

	bool foundDelimiter = false;
	QString body("");
	for (int i = 1; i < lines.size(); i++) {
		QString line = lines[i];

		if (line.indexOf("================================================================================") == 0) {
			foundDelimiter = true;
			continue;
		}

		if (!foundDelimiter && line.trimmed() == "" && i == 1) continue; // Skip the first \n

		if (!foundDelimiter) {
			if (!body.isEmpty()) body += "\n";
			body += line;
		} else {
			int colonIndex = line.indexOf(':');
			QString propName = line.left(colonIndex).trimmed();
			QString propValue = line.right(line.length() - colonIndex - 1).trimmed();

			qDebug() << propName << propValue;
		}
	}

	setValue("title", title);
	setValue("body", body);

	for (QHash<QString, QString>::const_iterator it = values.begin(); it != values.end(); ++it) {
		setValue(it.key(), it.value());
	}
}

}