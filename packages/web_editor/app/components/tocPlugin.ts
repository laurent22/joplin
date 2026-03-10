/**
 * TinyMCE 向けカスタム目次 (ToC) プラグイン
 *
 * TinyMCE v6 以降は公式の `toc` プラグインが廃止されているため、
 * 同等の挿入・更新・自動更新機能をカスタム実装する。
 *
 * 目次 div には `data-joplin-toc="1"` 属性を付与して識別する。
 */

const LEVEL_INDENT: Record<string, string> = {
  '1': '0',
  '2': '20px',
  '3': '40px',
  '4': '60px',
  '5': '80px',
  '6': '100px',
};

/** 見出し配列から ToC の <li> HTML 文字列を生成する */
function buildTocItems(headings: HTMLHeadingElement[]): string {
  return headings
    .map((h) => {
      const level = h.tagName[1];
      const indent = LEVEL_INDENT[level] ?? '0';
      return `<li style="margin:2px 0;padding-left:${indent}"><a href="#${h.id}">${h.innerText}</a></li>`;
    })
    .join('');
}

/**
 * 目次を editor に挿入する。
 * `data-joplin-toc="1"` 属性を付与することで updateToc / setupTocAutoUpdate が
 * この div を識別して自動更新できる。
 */
export function insertToc(editor: any): void {
  const headings = editor.dom.select('h1,h2,h3,h4,h5,h6') as HTMLHeadingElement[];
  if (headings.length === 0) {
    editor.notificationManager.open({
      text: '見出し (h1〜h6) が見つかりません。',
      type: 'info',
      timeout: 3000,
    });
    return;
  }
  const baseId = `toc_${Date.now()}`;
  headings.forEach((h, i) => {
    if (!h.id) h.id = `${baseId}_h${i}`;
  });
  const tocHtml =
    `<div id="${baseId}" data-joplin-toc="1" style="border:1px solid #ccc;border-radius:4px;padding:12px 16px;background:#f9f9f9;margin-bottom:1em;">` +
    `<p style="font-weight:bold;margin:0 0 8px 0;">目次</p>` +
    `<ul style="list-style:none;margin:0;padding:0;">${buildTocItems(headings)}</ul>` +
    `</div>`;
  editor.insertContent(tocHtml);
  editor.nodeChanged();
  editor.focus();
}

/**
 * ドキュメント内の既存の目次 (`data-joplin-toc="1"` を持つ div) を
 * 現在の見出し一覧で再構築する。目次が存在しない場合は何もしない。
 */
export function updateToc(editor: any): void {
  const doc = editor.getDoc() as Document;
  const tocDivs = doc.querySelectorAll('div[data-joplin-toc="1"]');
  if (tocDivs.length === 0) return;

  const headings = editor.dom.select('h1,h2,h3,h4,h5,h6') as HTMLHeadingElement[];

  tocDivs.forEach((tocDiv: Element) => {
    // 目次自体の中に含まれる見出しは除外する
    const nonTocHeadings = headings.filter((h) => !tocDiv.contains(h));
    // 見出しに id がなければ付与
    nonTocHeadings.forEach((h, i) => {
      if (!h.id) h.id = `toc_h${i}_${Date.now()}`;
    });
    const ul = tocDiv.querySelector('ul');
    if (ul) ul.innerHTML = buildTocItems(nonTocHeadings);
  });
}

/**
 * editor の変更イベントを購読し、1000ms のデバウンスで updateToc を呼び出す。
 * TinyMCE の `setup` コールバック内で呼び出す。
 * 返値の cleanup 関数を呼ぶとイベントリスナーとタイマーが解除される。
 */
export function setupTocAutoUpdate(editor: any): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function onTocUpdateHandler() {
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      updateToc(editor);
    }, 1000);
  }

  function onExecCommand(event: any) {
    const c: string = event.command;
    if (!c) return;
    if (
      c.indexOf('Insert') === 0 ||
      c.indexOf('Header') === 0 ||
      c.indexOf('FormatBlock') === 0 ||
      c.indexOf('mceToggle') === 0 ||
      c.indexOf('mceInsert') === 0 ||
      c.indexOf('mceTable') === 0
    ) {
      onTocUpdateHandler();
    }
  }

  editor.on('keyup', onTocUpdateHandler);
  editor.on('keypress', onTocUpdateHandler);
  editor.on('compositionend', onTocUpdateHandler);
  editor.on('paste', onTocUpdateHandler);
  editor.on('Undo', onTocUpdateHandler);
  editor.on('Redo', onTocUpdateHandler);
  editor.on('joplinChange', onTocUpdateHandler);
  editor.on('ExecCommand', onExecCommand);

  return () => {
    if (timeoutId !== null) clearTimeout(timeoutId);
    editor.off('keyup', onTocUpdateHandler);
    editor.off('keypress', onTocUpdateHandler);
    editor.off('compositionend', onTocUpdateHandler);
    editor.off('paste', onTocUpdateHandler);
    editor.off('Undo', onTocUpdateHandler);
    editor.off('Redo', onTocUpdateHandler);
    editor.off('joplinChange', onTocUpdateHandler);
    editor.off('ExecCommand', onExecCommand);
  };
}
