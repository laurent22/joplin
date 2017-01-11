#include "filters.h"

using namespace jop;

QString filters::apiBaseUrl(const QString &baseUrl) {
	QString output(baseUrl.trimmed());
	if (!output.startsWith("http://") && !output.startsWith("https://")) {
		output = "http://" + output;
	}
	while (output.endsWith("/")) {
		output = output.left(output.length() - 1);
	}
	return output;
}

QString filters::email(const QString &email) {
	QString output(email.trimmed());
	return output;
}
