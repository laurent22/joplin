'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  loading?: boolean;
}

interface ChatDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ChatDialog({ open, onClose }: ChatDialogProps) {
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);
  const [dialogWidth, setDialogWidth] = React.useState(900);
  const [dialogHeight, setDialogHeight] = React.useState(700);
  const [resizeStartX, setResizeStartX] = React.useState(0);
  const [resizeStartY, setResizeStartY] = React.useState(0);

  const chatMessagesEndRef = React.useRef<HTMLDivElement>(null);
  const autoScrollModeRef = React.useRef(true);
  const lastScrollTopRef = React.useRef(0);

  // 自動スクロール
  React.useEffect(() => {
    if (chatMessagesEndRef.current && autoScrollModeRef.current) {
      const scroller = document.getElementById('chat-scroller');
      if (scroller) {
        scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
        lastScrollTopRef.current = scroller.scrollTop;
      }
    }
  }, [chatMessages]);

  // リサイズハンドラー
  const handleResizeStart = React.useCallback((event: React.MouseEvent) => {
    setIsResizing(true);
    setResizeStartX(event.clientX);
    setResizeStartY(event.clientY);
    event.preventDefault();
  }, []);

  const handleResizeMove = React.useCallback(
    (event: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = event.clientX - resizeStartX;
      const deltaY = event.clientY - resizeStartY;

      setDialogWidth((prev) => Math.max(400, prev + deltaX));
      setDialogHeight((prev) => Math.max(300, prev + deltaY));
      setResizeStartX(event.clientX);
      setResizeStartY(event.clientY);
    },
    [isResizing, resizeStartX, resizeStartY]
  );

  const handleResizeEnd = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [handleResizeMove, handleResizeEnd]);

  // ストリーミングレスポンスを処理
  const processStreamingResponse = React.useCallback(async (response: Response, botId: string) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';

    // ローディングを解除
    setChatMessages((prev) =>
      prev.map((msg) => (msg.id === botId ? { ...msg, loading: false } : msg))
    );

    let firstResponseReceived = false;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // デコードして蓄積
        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        if (!firstResponseReceived) {
          if (accumulatedText.indexOf(`関連ドキュメントを検索中...`) === 0) {
            firstResponseReceived = true;
            // 関連ドキュメント検索中 + loadingアイコンを表示
            const cloneAccumulatedText = accumulatedText.toString();
            setChatMessages((prev) =>
              prev.map((msg) =>
                msg.id === botId ? { ...msg, text: cloneAccumulatedText, loading: true } : msg
              )
            );
            accumulatedText = '';
            continue;
          }
        }

        // メッセージを更新
        setChatMessages((prev) =>
          prev.map((msg) =>
            msg.id === botId ? { ...msg, text: accumulatedText, loading: false } : msg
          )
        );

        // 自動スクロールモードの場合、最下部へスクロール
        if (autoScrollModeRef.current) {
          requestAnimationFrame(() => {
            const scroller = document.getElementById('chat-scroller');
            if (scroller) {
              scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'auto' });
              lastScrollTopRef.current = scroller.scrollTop;
            }
          });
        }
      }
    }
  }, []);

  // チャット送信
  const handleChatSend = React.useCallback(async () => {
    if (chatInput.trim() === '' || isLoading) return;

    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    const newUserMessage: ChatMessage = { id, text: chatInput, isUser: true };
    const userInput = chatInput;

    // 現在の会話履歴を取得（新しいメッセージを追加する前）
    const currentHistories = chatMessages.map((msg) => ({
      id: msg.id,
      text: msg.text,
      isUser: msg.isUser,
      loading: msg.loading,
    }));

    setChatMessages((prev) => [...prev, newUserMessage]);
    setChatInput('');
    autoScrollModeRef.current = true;
    setIsLoading(true);

    // ローディング状態のボットメッセージを追加
    const botId = Date.now().toString() + Math.random().toString(36).slice(2);
    const loadingMessage: ChatMessage = {
      id: botId,
      text: '',
      isUser: false,
      loading: true,
    };
    setChatMessages((prev) => [...prev, loadingMessage]);

    try {
      // API呼び出し - 過去の会話履歴も送信
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          histories: currentHistories,
        }),
      });

      if (!response.ok) {
        throw new Error('APIエラーが発生しました');
      }

      // ストリーミングレスポンスを処理
      await processStreamingResponse(response, botId);
    } catch (error) {
      console.error('Chat API error:', error);
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === botId
            ? { ...msg, text: 'エラーが発生しました。もう一度お試しください。', loading: false }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [chatInput, chatMessages, processStreamingResponse, isLoading]);

  const handleChatInputKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter') {
        if (event.shiftKey) {
          // Shift + Enterで改行（デフォルトの動作を許可）
          return;
        } else {
          // Enterのみで送信
          if (!event.nativeEvent.isComposing && !isLoading) {
            event.preventDefault();
            handleChatSend();
          }
        }
      }
    },
    [handleChatSend, isLoading]
  );

  const handleClearHistory = React.useCallback(() => {
    setChatMessages([]);
  }, []);

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const currentScrollTop = target.scrollTop;
    const lastScrollTop = lastScrollTopRef.current;

    // 上に10px以上スクロールされた場合、自動スクロールを無効化
    if (lastScrollTop - currentScrollTop >= 10) {
      autoScrollModeRef.current = false;
    }

    // 最下部にいる場合は自動スクロールを有効化
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 20;
    if (isAtBottom) {
      autoScrollModeRef.current = true;
    }

    // 現在のスクロール位置を記録
    lastScrollTopRef.current = currentScrollTop;
  }, []);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        style: {
          width: dialogWidth,
          height: dialogHeight,
          maxWidth: dialogWidth,
          maxHeight: dialogHeight,
          position: 'relative',
        },
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '18px' }}>AI チャット</h2>
        <div>
          <IconButton
            size="small"
            onClick={handleClearHistory}
            title="履歴を削除"
            style={{ marginRight: 8 }}
          >
            <DeleteIcon />
          </IconButton>
          <IconButton size="small" onClick={onClose} title="閉じる">
            <CloseIcon />
          </IconButton>
        </div>
      </div>

      <DialogContent
        style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        {/* チャットコンテナ */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            padding: 16,
            background: '#fafbfc',
          }}
        >
          {/* メッセージエリア */}
          <div
            id="chat-scroller"
            onScroll={handleScroll}
            style={{
              flex: 1,
              overflowY: 'auto',
              marginBottom: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={msg.isUser ? 'chat-bubble-user' : 'chat-bubble-bot'}
                style={{
                  alignSelf: msg.isUser ? 'flex-end' : 'flex-start',
                  background: msg.isUser ? '#4f8cff' : '#f0f0f0',
                  color: msg.isUser ? 'white' : '#333',
                  borderRadius: '16px',
                  padding: '12px 20px',
                  maxWidth: '70%',
                  minWidth: '30%',
                  wordBreak: 'break-word',
                  position: 'relative',
                  margin: msg.isUser ? '0 12px 4px 0' : '0 0 4px 12px',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.loading && (
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      border: '3px solid lightblue',
                      borderTop: '3px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1.2s linear infinite',
                      marginBottom: 8,
                    }}
                  />
                )}
                {msg.isUser ? (
                  msg.text
                ) : (
                  <ReactMarkdown
                    components={{
                      a: ({ node, href, children, ...props }) => {
                        // 内部リンク（/で始まる）の場合はNext.js Linkを使用
                        if (href && href.startsWith('/')) {
                          return (
                            <Link href={href} {...props}>
                              {children}
                            </Link>
                          );
                        }
                        // 外部リンクは通常のaタグ
                        return (
                          <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                            {children}
                          </a>
                        );
                      },
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                )}
              </div>
            ))}
            <div ref={chatMessagesEndRef} />
          </div>

          {/* 入力エリア */}
          <div
            style={{
              display: 'flex',
              gap: 8,
            }}
          >
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatInputKeyDown}
              placeholder="メッセージを入力... (Shift+Enterで改行)"
              disabled={isLoading}
              style={{
                flex: 1,
                padding: 8,
                borderRadius: 8,
                border: '1px solid #ccc',
                resize: 'none',
                minHeight: 60,
                maxHeight: 120,
                fontFamily: 'inherit',
                fontSize: 14,
                opacity: isLoading ? 0.6 : 1,
                cursor: isLoading ? 'not-allowed' : 'text',
              }}
            />
            <button
              onClick={handleChatSend}
              disabled={isLoading}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: isLoading ? '#ccc' : '#4f8cff',
                color: 'white',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                minWidth: 80,
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? '送信中...' : '送信'}
            </button>
          </div>
        </div>

        {/* リサイズハンドル */}
        <div
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 20,
            height: 20,
            background:
              'linear-gradient(-45deg, transparent 0%, transparent 30%, #ccc 30%, #ccc 40%, transparent 40%, transparent 50%, #ccc 50%, #ccc 60%, transparent 60%, transparent 70%, #ccc 70%, #ccc 80%, transparent 80%)',
            cursor: 'nw-resize',
            zIndex: 10,
          }}
          title="ダイアログサイズを変更"
        />
      </DialogContent>

      {/* アニメーション */}
      <style jsx global>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .chat-bubble-user::after {
          content: '';
          position: absolute;
          right: -8px;
          bottom: 8px;
          width: 0;
          height: 0;
          border-top: 12px solid transparent;
          border-left: 16px solid #4f8cff;
          border-bottom: 12px solid transparent;
        }

        .chat-bubble-bot::after {
          content: '';
          position: absolute;
          left: -8px;
          bottom: 8px;
          width: 0;
          height: 0;
          border-top: 12px solid transparent;
          border-right: 16px solid #f0f0f0;
          border-bottom: 12px solid transparent;
        }
      `}</style>
    </Dialog>
  );
}
