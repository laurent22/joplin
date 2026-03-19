'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import parse, { domToReact, HTMLReactParserOptions, Element, DOMNode } from 'html-react-parser';
import { NoteEntity } from '@/lib/database';
import Mark from 'mark.js';
import { Config } from '../../config';
import { ClientUtil } from '@/lib/ClientUtil';

export default function NoteDetails({ note }: { note: (NoteEntity & { body?: string }) | null }) {
  const searchParams = useSearchParams();
  const contentRef = useRef<HTMLDivElement>(null);
  // 前回の search 値を保持（同じ値ならスクロールを抑制するため）
  const prevSearchRef = useRef<string | null>(null);

  // 指定要素のレンダリングが安定するのを待つユーティリティ
  const waitForStableRender = (
    root: HTMLElement | null,
    timeout = Config.renderWaitTimeoutMs,
    stableMs = Config.stableMs
  ) => {
    return new Promise<HTMLElement | null>((resolve) => {
      if (!root) return resolve(null);
      let timer: number | null = null;
      const obs = new MutationObserver(() => {
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          obs.disconnect();
          resolve(root);
        }, stableMs);
      });

      // もし既に中身がある場合は安定判定をすぐ始める
      if (root.innerHTML.trim() !== '') {
        timer = window.setTimeout(() => {
          resolve(root);
        }, stableMs);
        obs.observe(root, { childList: true, subtree: true, characterData: true });
      } else {
        // 中身が空なら変更を監視してタイムアウトも入れる
        obs.observe(root, { childList: true, subtree: true, characterData: true });
        setTimeout(() => {
          obs.disconnect();
          resolve(root);
        }, timeout);
      }
    });
  };

  // コンテンツロード後にフラグメントジャンプを実行
  useEffect(() => {
    if (!note?.body) return;

    // URLのフラグメントを取得
    const hash = window.location.hash;
    if (!hash) return;

    // フラグメントに該当する要素を探してスクロール
    const elementId = hash.substring(1); // '#' を除去
    // 要素がまだ生成されていない可能性があるため、レンダリングの安定を待ってから再取得してスクロール
    (async () => {
      await waitForStableRender(contentRef.current);
      const targetElement = document.getElementById(elementId);
      if (targetElement) {
        // 短い遅延で DOM が確定するのを待つ
        setTimeout(() => {
          ClientUtil.scrollIntoViewWithRetry(targetElement, 3);
        }, 100);
      }
    })();
  }, [note?.body]);

  // video / audio 要素の再生範囲を onplay / ontimeupdate 属性文字列から復元して
  // ネイティブイベントリスナーとして登録する。
  // html-react-parser は属性文字列を React props として渡すだけで実行しないため、
  // DOM レンダリング後にこちらで手動でバインドする。
  useEffect(() => {
    if (!note?.body || !contentRef.current) return;

    const mediaElements = contentRef.current.querySelectorAll('video, audio');
    const cleanups: (() => void)[] = [];

    for (const media of Array.from(mediaElements)) {
      const el = media as HTMLVideoElement | HTMLAudioElement;

      const onplayAttr = el.getAttribute('data-onplay') ?? el.getAttribute('onplay') ?? '';
      const onTimeupdateAttr =
        el.getAttribute('data-ontimeupdate') ?? el.getAttribute('ontimeupdate') ?? '';

      // onplay: "this.currentTime=N"
      const onplayMatch = onplayAttr.match(/this\.currentTime\s*=\s*([\d.]+)/);
      const startTime = onplayMatch ? parseFloat(onplayMatch[1]) : -1;

      // ontimeupdate: "if(this.currentTime>=N){...}"
      const onTimeupdateMatch = onTimeupdateAttr.match(
        /if\(this\.currentTime\s*>=\s*([\d.]+)\)\{([^}]*)\}/
      );
      const endTime = onTimeupdateMatch ? parseFloat(onTimeupdateMatch[1]) : -1;
      const loop = onTimeupdateMatch ? !onTimeupdateMatch[2].includes('this.pause()') : false;

      if (startTime < 0 && endTime < 0) continue;

      const handlePlay = () => {
        if (startTime >= 0) el.currentTime = startTime;
      };

      const handleTimeUpdate = () => {
        if (endTime >= 0 && el.currentTime >= endTime) {
          if (loop) {
            el.currentTime = startTime >= 0 ? startTime : 0;
          } else {
            el.pause();
            el.currentTime = startTime >= 0 ? startTime : 0;
          }
        }
      };

      el.addEventListener('play', handlePlay);
      el.addEventListener('timeupdate', handleTimeUpdate);

      cleanups.push(() => {
        el.removeEventListener('play', handlePlay);
        el.removeEventListener('timeupdate', handleTimeUpdate);
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, [note?.body]);

  // searchパラメータが変化した時に、該当箇所をハイライトしてスクロール
  useEffect(() => {
    if (!note?.body || !contentRef.current) return;

    const searchQuery = searchParams.get('search');
    if (!searchQuery) return;

    const decodedSearch = decodeURIComponent(searchQuery);

    const markInstance = new Mark(contentRef.current);
    let cancelled = false;

    // 今回の search と前回の search が異なる場合のみスクロールするフラグ
    const shouldScroll = decodedSearch !== prevSearchRef.current;

    const scrollLongestMark = () => {
      const marks = contentRef.current?.querySelectorAll('mark');
      if (marks && marks.length > 0) {
        let longestMark = marks[0] as HTMLElement;
        let maxLength = marks[0].textContent?.length || 0;

        marks.forEach((mark) => {
          const length = mark.textContent?.length || 0;
          if (length > maxLength) {
            maxLength = length;
            longestMark = mark as HTMLElement;
          }
        });

        // 短い遅延で DOM が確定するのを待つ
        setTimeout(() => {
          ClientUtil.scrollIntoViewWithRetry(longestMark, 3);
        }, 100);
      }
    };

    (async () => {
      await waitForStableRender(contentRef.current);
      if (cancelled) return;

      console.log(`decodedSearch: ${decodedSearch}`);
      // 既存のハイライトをクリア
      markInstance.unmark();

      // 新しいハイライトを適用（まずは完全一致で試す）
      markInstance.mark(decodedSearch, {
        separateWordSearch: false,
        done: (count: number) => {
          if (cancelled) return;
          // マッチがない場合は単語分割検索で再試行
          if (count === 0) {
            markInstance.mark(decodedSearch, {
              separateWordSearch: true,
              done: () => {
                if (cancelled) return;
                // 前回と異なる検索文字列だった場合のみスクロール
                if (shouldScroll) {
                  scrollLongestMark();
                }
                // 現在の検索文字列を保存
                prevSearchRef.current = decodedSearch;
              },
            });
          } else {
            if (shouldScroll) {
              scrollLongestMark();
            }
            // 現在の検索文字列を保存
            prevSearchRef.current = decodedSearch;
          }
        },
      });
    })();

    // クリーンアップ
    return () => {
      cancelled = true;
      markInstance.unmark();
    };
  }, [note?.body, searchParams]);

  if (!note) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-2">No note selected</h2>
        <p className="text-sm text-gray-500">ダブルクリックでノートを選択してください。</p>
      </div>
    );
  }

  // HTML内の<a>タグをNext.js Linkに変換する処理
  const parseOptions: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode instanceof Element) {
        // html, body, head タグはスキップして子要素だけをレンダリング
        if (domNode.name === 'html' || domNode.name === 'body' || domNode.name === 'head') {
          return <>{domToReact(domNode.children as DOMNode[], parseOptions)}</>;
        }

        // video / audio: onplay / ontimeupdate はインライン JS 文字列なので
        // React が無視する。data-* 属性に退避して useEffect で復元する。
        if (domNode.name === 'video' || domNode.name === 'audio') {
          const attribs = { ...domNode.attribs };
          if (attribs.onplay) {
            attribs['data-onplay'] = attribs.onplay;
            delete attribs.onplay;
          }
          if (attribs.ontimeupdate) {
            attribs['data-ontimeupdate'] = attribs.ontimeupdate;
            delete attribs.ontimeupdate;
          }
          const Tag = domNode.name as 'video' | 'audio';
          return <Tag {...attribs}>{domToReact(domNode.children as DOMNode[], parseOptions)}</Tag>;
        }

        if (domNode.name === 'a') {
          const href = domNode.attribs?.href;

          // 同一サーバ内のリンク（相対パスや / で始まる）の場合は Link に置き換え
          if (href && (href.startsWith('/') || !href.match(/^https?:\/\//))) {
            return (
              <Link href={href} prefetch={false}>
                <span style={{ color: 'inherit', textDecoration: 'underline' }}>
                  {domToReact(domNode.children as DOMNode[], parseOptions)}
                </span>
              </Link>
            );
          }

          // 外部リンクはそのまま <a> タグとして処理
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { style, ...otherAttribs } = domNode.attribs || {};
          return (
            <a {...otherAttribs} target="_blank" rel="noopener noreferrer">
              {domToReact(domNode.children as DOMNode[], parseOptions)}
            </a>
          );
        }
      }
    },
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">{note.title || 'Untitled'}</h2>
      {note.body ? (
        <div className="note-content" ref={contentRef}>
          {parse(note.body, parseOptions)}
        </div>
      ) : (
        <div className="text-sm text-gray-600">-</div>
      )}
    </div>
  );
}
