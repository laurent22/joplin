#ifndef XMLTOMD_H
#define XMLTOMD_H

#include <QXmlStreamReader>
#include <QStringList>
#include <QMap>

namespace xmltomd {

    struct Resource {
		QString id;
		QString mime;
		QString filename;
		QString alt;
		QByteArray data;
		time_t timestamp;

		Resource() : timestamp(0) {}
	};

    const QString BLOCK_OPEN = "<div>";
	const QString BLOCK_CLOSE = "</div>";
	const QString NEWLINE = "<br/>";
	const QString NEWLINE_MERGED = "<merged/>";
	const QString SPACE = "<space/>";

	struct ParsingState {
		std::vector<std::pair<QString, int>> lists;
		bool inCode;
		std::vector<Resource> resources;
		std::vector<Resource> attachments;
	};

	QString evernoteXmlToMd(const QString &content, std::vector<Resource> resources);

}

#endif // XMLTOMD_H
