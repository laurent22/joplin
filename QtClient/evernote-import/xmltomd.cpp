#include <QDebug>
#include <QTextCodec>

#include "xmltomd.h"

namespace xmltomd {

QMap<QString, QString> htmlEntities;
QStringList imageMimeTypes;

QString htmlEntityDecode(const QString& htmlEntity) {
	if (!htmlEntities.size()) {
		// Note: &nbsp; is replaced by a regular space (and not a non-breaking space, which would normally be \xC2\xA0)
		htmlEntities["aelig"]                          = "Æ";
		htmlEntities["aacute"]                          = "Á";
		htmlEntities["acirc"]                          = "Â";
		htmlEntities["agrave"]                          = "À";
		htmlEntities["alpha"]                          = "Α";
		htmlEntities["aring"]                          = "Å";
		htmlEntities["atilde"]                          = "Ã";
		htmlEntities["auml"]                          = "Ä";
		htmlEntities["beta"]                          = "Β";
		htmlEntities["ccedil"]                          = "Ç";
		htmlEntities["chi"]                          = "Χ";
		htmlEntities["dagger"]                          = "‡";
		htmlEntities["delta"]                          = "Δ";
		htmlEntities["eth"]                          = "Ð";
		htmlEntities["eacute"]                          = "É";
		htmlEntities["ecirc"]                          = "Ê";
		htmlEntities["egrave"]                          = "È";
		htmlEntities["epsilon"]                          = "Ε";
		htmlEntities["eta"]                          = "Η";
		htmlEntities["euml"]                          = "Ë";
		htmlEntities["gamma"]                          = "Γ";
		htmlEntities["iacute"]                          = "Í";
		htmlEntities["icirc"]                          = "Î";
		htmlEntities["igrave"]                          = "Ì";
		htmlEntities["iota"]                          = "Ι";
		htmlEntities["iuml"]                          = "Ï";
		htmlEntities["kappa"]                          = "Κ";
		htmlEntities["lambda"]                          = "Λ";
		htmlEntities["mu"]                          = "Μ";
		htmlEntities["ntilde"]                          = "Ñ";
		htmlEntities["nu"]                          = "Ν";
		htmlEntities["oelig"]                          = "Œ";
		htmlEntities["oacute"]                          = "Ó";
		htmlEntities["ocirc"]                          = "Ô";
		htmlEntities["ograve"]                          = "Ò";
		htmlEntities["omega"]                          = "Ω";
		htmlEntities["omicron"]                          = "Ο";
		htmlEntities["oslash"]                          = "Ø";
		htmlEntities["otilde"]                          = "Õ";
		htmlEntities["ouml"]                          = "Ö";
		htmlEntities["phi"]                          = "Φ";
		htmlEntities["pi"]                          = "Π";
		htmlEntities["prime"]                          = "″";
		htmlEntities["psi"]                          = "Ψ";
		htmlEntities["rho"]                          = "Ρ";
		htmlEntities["scaron"]                          = "Š";
		htmlEntities["sigma"]                          = "Σ";
		htmlEntities["thorn"]                          = "Þ";
		htmlEntities["tau"]                          = "Τ";
		htmlEntities["theta"]                          = "Θ";
		htmlEntities["uacute"]                          = "Ú";
		htmlEntities["ucirc"]                          = "Û";
		htmlEntities["ugrave"]                          = "Ù";
		htmlEntities["upsilon"]                          = "Υ";
		htmlEntities["uuml"]                          = "Ü";
		htmlEntities["xi"]                          = "Ξ";
		htmlEntities["yacute"]                          = "Ý";
		htmlEntities["yuml"]                          = "Ÿ";
		htmlEntities["zeta"]                          = "Ζ";
		htmlEntities["aacute"]                          = "á";
		htmlEntities["acirc"]                          = "â";
		htmlEntities["acute"]                          = "´";
		htmlEntities["aelig"]                          = "æ";
		htmlEntities["agrave"]                          = "à";
		htmlEntities["alefsym"]                          = "ℵ";
		htmlEntities["alpha"]                          = "α";
		htmlEntities["amp"]                          = "&";
		htmlEntities["and"]                          = "∧";
		htmlEntities["ang"]                          = "∠";
		htmlEntities["apos"]                          = "'";
		htmlEntities["aring"]                          = "å";
		htmlEntities["asymp"]                          = "≈";
		htmlEntities["atilde"]                          = "ã";
		htmlEntities["auml"]                          = "ä";
		htmlEntities["bdquo"]                          = "„";
		htmlEntities["beta"]                          = "β";
		htmlEntities["brvbar"]                          = "¦";
		htmlEntities["bull"]                          = "•";
		htmlEntities["cap"]                          = "∩";
		htmlEntities["ccedil"]                          = "ç";
		htmlEntities["cedil"]                          = "¸";
		htmlEntities["cent"]                          = "¢";
		htmlEntities["chi"]                          = "χ";
		htmlEntities["circ"]                          = "ˆ";
		htmlEntities["clubs"]                          = "♣";
		htmlEntities["cong"]                          = "≅";
		htmlEntities["copy"]                          = "©";
		htmlEntities["crarr"]                          = "↵";
		htmlEntities["cup"]                          = "∪";
		htmlEntities["curren"]                          = "¤";
		htmlEntities["darr"]                          = "⇓";
		htmlEntities["dagger"]                          = "†";
		htmlEntities["darr"]                          = "↓";
		htmlEntities["deg"]                          = "°";
		htmlEntities["delta"]                          = "δ";
		htmlEntities["diams"]                          = "♦";
		htmlEntities["divide"]                          = "÷";
		htmlEntities["eacute"]                          = "é";
		htmlEntities["ecirc"]                          = "ê";
		htmlEntities["egrave"]                          = "è";
		htmlEntities["empty"]                          = "∅";
		htmlEntities["emsp"]                          = "\xE2\x80\x83";
		htmlEntities["ensp"]                          = "\xE2\x80\x82";
		htmlEntities["epsilon"]                          = "ε";
		htmlEntities["equiv"]                          = "≡";
		htmlEntities["eta"]                          = "η";
		htmlEntities["eth"]                          = "ð";
		htmlEntities["euml"]                          = "ë";
		htmlEntities["euro"]                          = "€";
		htmlEntities["exist"]                          = "∃";
		htmlEntities["fnof"]                          = "ƒ";
		htmlEntities["forall"]                          = "∀";
		htmlEntities["frac12"]                          = "½";
		htmlEntities["frac14"]                          = "¼";
		htmlEntities["frac34"]                          = "¾";
		htmlEntities["frasl"]                          = "⁄";
		htmlEntities["gamma"]                          = "γ";
		htmlEntities["ge"]                          = "≥";
		htmlEntities["gt"]                          = ">";
		htmlEntities["haRr"]                          = "⇔";
		htmlEntities["harr"]                          = "↔";
		htmlEntities["hearts"]                          = "♥";
		htmlEntities["hellip"]                          = "…";
		htmlEntities["iacute"]                          = "í";
		htmlEntities["icirc"]                          = "î";
		htmlEntities["iexcl"]                          = "¡";
		htmlEntities["igrave"]                          = "ì";
		htmlEntities["image"]                          = "ℑ";
		htmlEntities["infin"]                          = "∞";
		htmlEntities["int"]                          = "∫";
		htmlEntities["iota"]                          = "ι";
		htmlEntities["iquest"]                          = "¿";
		htmlEntities["isin"]                          = "∈";
		htmlEntities["iuml"]                          = "ï";
		htmlEntities["kappa"]                          = "κ";
		htmlEntities["laRr"]                          = "⇐";
		htmlEntities["lambda"]                          = "λ";
		htmlEntities["lang"]                          = "〈";
		htmlEntities["laquo"]                          = "«";
		htmlEntities["larr"]                          = "←";
		htmlEntities["lceil"]                          = "⌈";
		htmlEntities["ldquo"]                          = "“";
		htmlEntities["le"]                          = "≤";
		htmlEntities["lfloor"]                          = "⌊";
		htmlEntities["lowast"]                          = "∗";
		htmlEntities["loz"]                          = "◊";
		htmlEntities["lrm"]                          = "\xE2\x80\x8E";
		htmlEntities["lsaquo"]                          = "‹";
		htmlEntities["lsquo"]                          = "‘";
		htmlEntities["lt"]                          = "<";
		htmlEntities["macr"]                          = "¯";
		htmlEntities["mdash"]                          = "—";
		htmlEntities["micro"]                          = "µ";
		htmlEntities["middot"]                          = "·";
		htmlEntities["minus"]                          = "−";
		htmlEntities["mu"]                          = "μ";
		htmlEntities["nabla"]                          = "∇";
		htmlEntities["nbsp"]                          = " ";
		htmlEntities["ndash"]                          = "–";
		htmlEntities["ne"]                          = "≠";
		htmlEntities["ni"]                          = "∋";
		htmlEntities["not"]                          = "¬";
		htmlEntities["notin"]                          = "∉";
		htmlEntities["nsub"]                          = "⊄";
		htmlEntities["ntilde"]                          = "ñ";
		htmlEntities["nu"]                          = "ν";
		htmlEntities["oacute"]                          = "ó";
		htmlEntities["ocirc"]                          = "ô";
		htmlEntities["oelig"]                          = "œ";
		htmlEntities["ograve"]                          = "ò";
		htmlEntities["oline"]                          = "‾";
		htmlEntities["omega"]                          = "ω";
		htmlEntities["omicron"]                          = "ο";
		htmlEntities["oplus"]                          = "⊕";
		htmlEntities["or"]                          = "∨";
		htmlEntities["ordf"]                          = "ª";
		htmlEntities["ordm"]                          = "º";
		htmlEntities["oslash"]                          = "ø";
		htmlEntities["otilde"]                          = "õ";
		htmlEntities["otimes"]                          = "⊗";
		htmlEntities["ouml"]                          = "ö";
		htmlEntities["para"]                          = "¶";
		htmlEntities["part"]                          = "∂";
		htmlEntities["permil"]                          = "‰";
		htmlEntities["perp"]                          = "⊥";
		htmlEntities["phi"]                          = "φ";
		htmlEntities["pi"]                          = "π";
		htmlEntities["piv"]                          = "ϖ";
		htmlEntities["plusmn"]                          = "±";
		htmlEntities["pound"]                          = "£";
		htmlEntities["prime"]                          = "′";
		htmlEntities["prod"]                          = "∏";
		htmlEntities["prop"]                          = "∝";
		htmlEntities["psi"]                          = "ψ";
		htmlEntities["quot"]                          = "\"";
		htmlEntities["raRr"]                          = "⇒";
		htmlEntities["radic"]                          = "√";
		htmlEntities["rang"]                          = "〉";
		htmlEntities["raquo"]                          = "»";
		htmlEntities["rarr"]                          = "→";
		htmlEntities["rceil"]                          = "⌉";
		htmlEntities["rdquo"]                          = "”";
		htmlEntities["real"]                          = "ℜ";
		htmlEntities["reg"]                          = "®";
		htmlEntities["rfloor"]                          = "⌋";
		htmlEntities["rho"]                          = "ρ";
		htmlEntities["rlm"]                          = "\xE2\x80\x8F";
		htmlEntities["rsaquo"]                          = "›";
		htmlEntities["rsquo"]                          = "’";
		htmlEntities["sbquo"]                          = "‚";
		htmlEntities["scaron"]                          = "š";
		htmlEntities["sdot"]                          = "⋅";
		htmlEntities["sect"]                          = "§";
		htmlEntities["shy"]                          = "\xC2\xAD";
		htmlEntities["sigma"]                          = "σ";
		htmlEntities["sigmaf"]                          = "ς";
		htmlEntities["sim"]                          = "∼";
		htmlEntities["spades"]                          = "♠";
		htmlEntities["sub"]                          = "⊂";
		htmlEntities["sube"]                          = "⊆";
		htmlEntities["sum"]                          = "∑";
		htmlEntities["sup1"]                          = "¹";
		htmlEntities["sup2"]                          = "²";
		htmlEntities["sup3"]                          = "³";
		htmlEntities["sup"]                          = "⊃";
		htmlEntities["supe"]                          = "⊇";
		htmlEntities["szlig"]                          = "ß";
		htmlEntities["tau"]                          = "τ";
		htmlEntities["there4"]                          = "∴";
		htmlEntities["theta"]                          = "θ";
		htmlEntities["thetasym"]                          = "ϑ";
		htmlEntities["thinsp"]                          = "\xE2\x80\x89";
		htmlEntities["thorn"]                          = "þ";
		htmlEntities["tilde"]                          = "˜";
		htmlEntities["times"]                          = "×";
		htmlEntities["trade"]                          = "™";
		htmlEntities["uaRr"]                          = "⇑";
		htmlEntities["uacute"]                          = "ú";
		htmlEntities["uarr"]                          = "↑";
		htmlEntities["ucirc"]                          = "û";
		htmlEntities["ugrave"]                          = "ù";
		htmlEntities["uml"]                          = "¨";
		htmlEntities["upsih"]                          = "ϒ";
		htmlEntities["upsilon"]                          = "υ";
		htmlEntities["uuml"]                          = "ü";
		htmlEntities["weierp"]                          = "℘";
		htmlEntities["xi"]                          = "ξ";
		htmlEntities["yacute"]                          = "ý";
		htmlEntities["yen"]                          = "¥";
		htmlEntities["yuml"]                          = "ÿ";
		htmlEntities["zeta"]                          = "ζ";
		htmlEntities["zwj"]                          = "\xE2\x80\x8D";
		htmlEntities["zwnj"]                          = "\xE2\x80\x8C";
	}

	if (htmlEntities.contains(htmlEntity)) return htmlEntities[htmlEntity];

	QMapIterator<QString, QString> i(htmlEntities);
	while (i.hasNext()) {
		i.next();
		if (i.key().toLower() == htmlEntity.toLower()) return i.value();
	}

	qWarning() << "Could not resolve HTML entity:" << htmlEntity;

	return htmlEntity;
}

bool isBlockTag(const QStringRef& n) {
	return n=="div" || n=="p" || n=="dl" || n=="dd" || n=="center" || n=="table" || n=="tr" || n=="td" || n=="th" || n=="tbody";
}

bool isStrongTag(const QStringRef& n) {
	return n == "strong" || n == "b";
}

bool isEmTag(const QStringRef& n) {
	return n == "em" || n == "i" || n == "u";
}

bool isAnchor(const QStringRef& n) {
	return n == "a";
}

bool isIgnoredEndTag(const QStringRef& n) {
	return n=="en-note" || n=="en-todo" || n=="span" || n=="body" || n=="html" || n=="font" || n=="br";
}

bool isListTag(const QStringRef& n) {
	return n == "ol" || n == "ul";
}

// Elements that don't require any special treatment beside adding a newline character
bool isNewLineOnlyEndTag(const QStringRef& n) {
	return n=="div" || n=="p" || n=="li" || n=="h1" || n=="h2" || n=="h3" || n=="h4" || n=="h5" || n=="dl" || n=="dd" || n=="center" || n=="table" || n=="tr" || n=="td" || n=="th" || n=="tbody";
}

bool isCodeTag(const QStringRef& n) {
	return n == "pre" || n == "code";
}

QMap<QString, QString> attributes(QXmlStreamReader& reader) {
	QMap<QString, QString> output;
	foreach (const QXmlStreamAttribute &attr, reader.attributes()) {
		output[attr.name().toString().toLower()] = attr.value().toString().toLower();
	}
	return output;
}

bool isWhiteSpace(const QChar& c) {
	return c == '\n' || c == '\r' || c == '\v' || c == '\f' || c == '\t' || c == ' ';
}

// Like QString::simpified(), except that it preserves non-breaking spaces (which
// Evernote uses for identation, etc.)
QString simplifyString(const QString& s) {
	QString output;
	bool previousWhite = false;
	for (int i = 0; i < s.length(); i++) {
		QChar c = s[i];
		bool isWhite = isWhiteSpace(c);
		if (previousWhite && isWhite) {
			// skip
		} else {
			output += c;
		}
		previousWhite = isWhite;
	}

	while (output.length() && isWhiteSpace(output[0])) output = output.right(output.length() - 1);
	while (output.length() && isWhiteSpace(output[output.length() - 1])) output = output.left(output.length() - 1);

	return output;
}

void collapseWhiteSpaceAndAppend(QStringList& lines, ParsingState& state, QString text) {
	if (state.inCode) {
		text = "\t" + text;
		lines.append(text);
	} else {
		// Remove all \n and \r from the left and right of the text
		while (text.length() && (text[0] == '\n' || text[0] == '\r')) text = text.right(text.length() - 1);
		while (text.length() && (text[text.length() - 1] == '\n' || text[text.length() - 1] == '\r')) text = text.left(text.length() - 1);

		// Collapse all white spaces to just one. If there are spaces to the left and right of the string
		// also collapse them to just one space.
		bool spaceLeft = text.length() && text[0] == ' ';
		bool spaceRight = text.length() && text[text.size() - 1] == ' ';
		text = simplifyString(text);

		if (!spaceLeft && !spaceRight && text == "") return;

		if (spaceLeft) lines.append(SPACE);
		lines.append(text);
		if (spaceRight) lines.append(SPACE);
	}
}

bool isNewLineBlock(const QString& s) {
	return s == BLOCK_OPEN || s == BLOCK_CLOSE;
}

QString processMdArrayNewLines(QStringList md) {
	while (md.size() && md[0] == BLOCK_OPEN) {
		md.erase(md.begin());
	}

	while (md.size() && md[md.size() - 1] == BLOCK_CLOSE) {
		md.pop_back();
	}

	QStringList temp;
	QString last;
	foreach (QString v, md) {
		if (isNewLineBlock(last) && isNewLineBlock(v) && last == v) {
			// Skip it
		} else {
			temp.push_back(v);
		}
		last = v;
	}
	md = temp;



	temp.clear();
	last = "";
	foreach (QString v, md) {
		if (last == BLOCK_CLOSE && v == BLOCK_OPEN) {
			temp.pop_back();
			temp.push_back(NEWLINE_MERGED);
		} else {
			temp.push_back(v);
		}
		last = v;
	}
	md = temp;



	temp.clear();
	last = "";
	foreach (QString v, md) {
		if (last == NEWLINE && (v == NEWLINE_MERGED || v == BLOCK_CLOSE)) {
			// Skip it
		} else {
			temp.push_back(v);
		}
		last = v;
	}
	md = temp;



	// NEW!!!
	temp.clear();
	last = "";
	foreach (QString v, md) {
		if (last == NEWLINE && (v == NEWLINE_MERGED || v == BLOCK_OPEN)) {
			// Skip it
		} else {
			temp.push_back(v);
		}
		last = v;
	}
	md = temp;




	if (md.size() > 2) {
		if (md[md.size() - 2] == NEWLINE_MERGED && md[md.size() - 1] == NEWLINE) {
			md.pop_back();
		}
	}

	QString output;
	QString previous;
	bool start = true;
	foreach (QString v, md) {
		QString add;
		if (v == BLOCK_CLOSE || v == BLOCK_OPEN || v == NEWLINE || v == NEWLINE_MERGED) {
			add = "\n";
		} else if (v == SPACE) {
			if (previous == SPACE || previous == "\n" || start) {
				continue; // skip
			} else {
				add = " ";
			}
		} else {
			add = v;
		}
		start = false;
		output += add;
		previous = add;
	}

	if (!output.trimmed().length()) return QString();

	return output;
}

bool isImageMimeType(const QString& m) {
	if (!imageMimeTypes.size()) {
		imageMimeTypes << "image/cgm" << "image/fits" << "image/g3fax" << "image/gif" << "image/ief" << "image/jp2" << "image/jpeg" << "image/jpm" << "image/jpx" << "image/naplps" << "image/png" << "image/prs.btif" << "image/prs.pti" << "image/t38" << "image/tiff" << "image/tiff-fx" << "image/vnd.adobe.photoshop" << "image/vnd.cns.inf2" << "image/vnd.djvu" << "image/vnd.dwg" << "image/vnd.dxf" << "image/vnd.fastbidsheet" << "image/vnd.fpx" << "image/vnd.fst" << "image/vnd.fujixerox.edmics-mmr" << "image/vnd.fujixerox.edmics-rlc" << "image/vnd.globalgraphics.pgb" << "image/vnd.microsoft.icon" << "image/vnd.mix" << "image/vnd.ms-modi" << "image/vnd.net-fpx" << "image/vnd.sealed.png" << "image/vnd.sealedmedia.softseal.gif" << "image/vnd.sealedmedia.softseal.jpg" << "image/vnd.svf" << "image/vnd.wap.wbmp" << "image/vnd.xiff";
	}
	return imageMimeTypes.contains(m, Qt::CaseInsensitive);
}

void addResourceTag(QStringList& lines, Resource& resource, const QString& alt = "") {
	QString tagAlt = alt == "" ? resource.alt : alt;
	if (isImageMimeType(resource.mime)) {
		lines.append("![");
		lines.append(tagAlt);
		lines.append(QString("](:/%1)").arg(resource.id));
	} else {
		lines.append("[");
		lines.append(tagAlt);
		lines.append(QString("](:/%1)").arg(resource.id));
	}
}

void evernoteXmlToMdArray(QXmlStreamReader& reader, QStringList& lines, ParsingState& state) {
	// Attributes are rarely used in Evernote XML code, so they are only loaded as needed
	// by the tag using `attrs = attributes(reader);`
	QMap<QString, QString> attrs;
	std::vector<QMap<QString, QString>> attributesLIFO;

	while (!reader.atEnd()) {
		reader.readNext();

		QStringRef n = reader.name();

		if (reader.isStartElement()) {
			attributesLIFO.push_back(attributes(reader));

			if (isBlockTag(n)) {
				lines.append(BLOCK_OPEN);
				evernoteXmlToMdArray(reader, lines, state);
			} else if (isStrongTag(n)) {
				lines.append("**");
			} else if (isAnchor(n)) {
				lines.append("[");
			} else if (isEmTag(n)) {
				lines.append("*");
			} else if (n == "en-todo") {
				attrs = attributesLIFO.back();
				QString checked = attrs["checked"] == "true" ? "X" : " ";
				lines.append(QString("- [%1] ").arg(checked));
			} else if (isListTag(n)) {
				lines.append(BLOCK_OPEN);
				state.lists.push_back(std::make_pair<QString, int>(n.toString(), 1));
			} else if (n == "li") {
				lines.append(BLOCK_OPEN);
				if (!state.lists.size()) {
					qWarning() << "Found <li> tag without being inside a list";
					continue;
				}
				std::pair<QString, int>& container = state.lists[state.lists.size() - 1];
				if (container.first == "ul") {
					lines.append("- ");
				} else {
					lines.append(QString("%1. ").arg(container.second));
					container.second++;
				}
			} else if (n == "h1") {
				lines.append(BLOCK_OPEN); lines.append("# ");
			} else if (n == "h2") {
				lines.append(BLOCK_OPEN); lines.append("## ");
			} else if (n == "h3") {
				lines.append(BLOCK_OPEN); lines.append("### ");
			} else if (n == "h4") {
				lines.append(BLOCK_OPEN); lines.append("#### ");
			} else if (n == "h5") {
				lines.append(BLOCK_OPEN); lines.append("##### ");
			} else if (n == "h6") {
				lines.append(BLOCK_OPEN); lines.append("###### ");
			} else if (isCodeTag(n)) {
				lines.append(BLOCK_OPEN);
				state.inCode = true;
			} else if (n == "br") {
				lines.append(NEWLINE);
			} else if (n == "en-media") {
				attrs = attributesLIFO.back();
				QString hash = attrs["hash"];
				Resource resource;
				for (int i = 0; i < state.resources.size(); i++) {
					Resource r = state.resources[i];
					if (r.id == hash) {
						resource = r;
						state.resources.erase(state.resources.begin() + i);
						break;
					}
				}

				// select * from notes where body like "%](:/%";

				// If the resource does not appear among the note's resources, it
				// means it's an attachement. It will be appended along with the
				// other remaining resources at the bottom of the markdown text.
				if (resource.id != "") {
					addResourceTag(lines, resource, attrs["alt"]);
				}
			} else if (n == "span" || n == "font") {
				// Ignore
			} else {
				qWarning() << "Unsupported start tag:" << n;
			}
		} else if (reader.isEndElement()) {
			if (isNewLineOnlyEndTag(n)) {
				lines.append(BLOCK_CLOSE);
			} else if (isStrongTag(n)) {
				lines.append("**");
			} else if (isEmTag(n)) {
				lines.append("*");
			} else if (isCodeTag(n)) {
				state.inCode = false;
				lines.append(BLOCK_CLOSE);
			} else if (isAnchor(n)) {
				attrs = attributesLIFO.back();
				QString href = attrs.contains("href") ? attrs["href"] : "";
				lines.append(QString("](%1)").arg(href));
			} else if (isListTag(n)) {
				lines.append(BLOCK_CLOSE);
				state.lists.pop_back();
			} else if (n == "en-media") {
				// Skip
			} else if (isIgnoredEndTag(n)) {
				// Skip
			} else {
				qWarning() << "Unsupported end tag:" << n;
			}
			if (attributesLIFO.size()) attributesLIFO.pop_back();
		} else if (reader.isCharacters()) {
			collapseWhiteSpaceAndAppend(lines, state, reader.text().toString());
		} else if (reader.isEndDocument()) {
			// Ignore
		} else if (reader.isEntityReference()) {
			lines.append(htmlEntityDecode(reader.name().toString()));
		} else {
			qWarning() << "Unsupported token type:" << reader.tokenType() << reader.tokenString() << reader.name();
		}
	}
}

QString evernoteXmlToMd(const QString& content, std::vector<Resource> resources) {
	QXmlStreamReader reader(content.toUtf8());

	if (reader.readNextStartElement()) {
		QStringList mdLines;
		ParsingState parsingState;
		parsingState.inCode = false;
		parsingState.resources = resources;
		evernoteXmlToMdArray(reader, mdLines, parsingState);

		bool firstAttachment = true;
		foreach (Resource r, parsingState.resources) {
			if (firstAttachment) mdLines.push_back(NEWLINE);
			mdLines.push_back(NEWLINE);
			addResourceTag(mdLines, r, r.filename);
			firstAttachment = false;
		}

		return processMdArrayNewLines(mdLines);
	} else {
		qWarning() << "Cannot parse XML:" << content;
	}
	return "";
}

}
