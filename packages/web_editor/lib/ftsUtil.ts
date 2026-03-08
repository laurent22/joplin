/**
 * FTS4 オフセット関連のユーティリティ関数
 *
 * FTS4 の offsets() 関数はバイトオフセットを返すため、
 * マルチバイト文字（日本語等）を含むテキストでは
 * JS の文字インデックスへの変換が必要です。
 */

/** markdown_notes_fts の列番号 */
export const MARKDOWN_FTS_BODY_COL = 2; // 0=id(notindexed), 1=title, 2=body

/**
 * UTF-8 バイトオフセット → JS 文字列インデックスのマッピングを構築
 * Node.js / ブラウザいずれでも動作する純粋関数
 */
export const buildByteToCharMap = (text: string): number[] => {
  const encoder = new TextEncoder();
  const map: number[] = [];
  let bytePos = 0;
  let charPos = 0;
  while (charPos < text.length) {
    const codePoint = text.codePointAt(charPos)!;
    const charByteLen = encoder.encode(String.fromCodePoint(codePoint)).length;
    for (let b = 0; b < charByteLen; b++) {
      map[bytePos + b] = charPos;
    }
    bytePos += charByteLen;
    charPos += codePoint > 0xffff ? 2 : 1;
  }
  map[bytePos] = text.length;
  return map;
};

export interface FtsBodyOffset {
  byteOffset: number;
  byteLen: number;
}

/**
 * FTS4 offsets 文字列から指定列(col)のオフセット一覧を抽出する
 * offsets フォーマット: "col term byteOffset byteLen col term byteOffset byteLen ..."
 */
export const parseFtsBodyOffsets = (offsetsStr: string, col: number): FtsBodyOffset[] => {
  const nums = offsetsStr.trim().split(' ').map(Number);
  const result: FtsBodyOffset[] = [];
  for (let i = 0; i + 3 < nums.length; i += 4) {
    if (nums[i] === col) {
      result.push({ byteOffset: nums[i + 2], byteLen: nums[i + 3] });
    }
  }
  return result;
};

/**
 * FTS4 offsets を使って body テキストからスニペット（前後 context 文字）を抽出する
 *
 * @param body ノート本文
 * @param offsetsStr FTS4 offsets() の返す文字列
 * @param context マッチ箇所の前後に含める文字数（デフォルト 100）
 * @returns 最初のマッチ箇所を中心とした部分文字列。bodyカラムにマッチがない場合は先頭を返す
 */
export const extractMarkdownFtsSnippet = (
  body: string,
  offsetsStr: string,
  context: number = 100
): string => {
  const bodyOffsets = parseFtsBodyOffsets(offsetsStr, MARKDOWN_FTS_BODY_COL);
  if (bodyOffsets.length === 0) {
    return body.slice(0, context * 2);
  }

  const byteToChar = buildByteToCharMap(body);
  const { byteOffset, byteLen } = bodyOffsets[0];
  const charStart = byteToChar[byteOffset] ?? 0;
  const charEnd = byteToChar[byteOffset + byteLen] ?? charStart + 1;

  const start = Math.max(0, charStart - context);
  const end = Math.min(body.length, charEnd + context);
  return body.slice(start, end);
};
