import { getDatabase } from './lib/database';

export async function register() {
  // アプリケーション起動時に一度だけデータベースを初期化
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      await getDatabase();
      console.log('Application initialized: Database connection established');
    } catch (error) {
      console.error('Failed to initialize application:', error);
      throw error;
    }
  }
}
