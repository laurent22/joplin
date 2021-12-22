/*
 * List of Unicode code that are flagged as separator.
 *
 * Contains Unicode code of:
 * - Zs = Separator, space
 * - Zl = Separator, line
 * - Zp = Separator, paragraph
 *
 * This list has been computed from http://unicode.org/Public/UNIDATA/UnicodeData.txt
 * curl -s http://unicode.org/Public/UNIDATA/UnicodeData.txt | grep -E ';Zs;|;Zl;|;Zp;' | cut -d \; -f 1 | xargs -I{} printf '%d, ' 0x{}
 *
 */
exports.Z = [32, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288];
