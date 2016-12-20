#ifndef XMLTOMD_H
#define XMLTOMD_H

#include <QXmlStreamReader>
#include <QStringList>
#include <QMap>

namespace xmltomd {

    const QString BLOCK_OPEN = "<div>";
	const QString BLOCK_CLOSE = "</div>";
	const QString NEWLINE = "<br/>";
	const QString NEWLINE_MERGED = "<merged/>";

	struct ParsingState {
		std::vector<std::pair<QString, int>> lists;
		bool inCode;
	};

	QString evernoteXmlToMd(const QString &content);

}

#endif // XMLTOMD_H
