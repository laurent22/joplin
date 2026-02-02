export async function register() {
  // アプリケーション起動時に一度だけデータベースを初期化
  // Node.js 実行環境でのみ、Node 固有のモジュールを動的にインポートする
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const mod = await import('./lib/database');
      // getDatabase は同期関数なので await は不要だが呼び出しはここで行う
      mod.getDatabase();
      console.log('Application initialized: Database connection established');
    } catch (error) {
      console.error('Failed to initialize application:', error);
      throw error;
    }
  }
}
