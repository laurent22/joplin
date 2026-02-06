export class ClientUtil {
  /**
   * scrollIntoViewIfNeededを指定回数リトライする関数
   * @param targetElement スクロール対象の要素
   * @param maxAttempts 試行回数（デフォルト: 3）
   */
  public static scrollIntoViewWithRetry(
    targetElement: HTMLElement,
    maxAttempts: number = 3,
  ): void {
    if (!targetElement || maxAttempts <= 0) return;

    // 最初の1回はすぐに実行
    (targetElement as any).scrollIntoViewIfNeeded?.({
      behavior: "smooth",
      block: "center",
    });

    // 残りの試行回数は100ミリ秒ごとに実行
    for (let i = 1; i < maxAttempts; i++) {
      setTimeout(() => {
        (targetElement as any).scrollIntoViewIfNeeded?.({
          behavior: "smooth",
          block: "center",
        });
      }, i * 100);
    }
  }
}
