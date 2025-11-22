import Setting from "../../models/Setting";

/**
 * Constants for sync configuration
 */
const SYNC_CONFIG = {
  /** Sync target value for disabled sync (None) */
  DISABLED_TARGET: 0,
  /** Default sync target for Joplin Cloud */
  JOPLIN_CLOUD_TARGET: 7,
  /** Sync setting keys */
  KEYS: {
    TARGET: "sync.target",
    SHOW_PROMPT: "sync.showPrompt",
  } as const,
} as const;

/**
 * Service responsible for disabling synchronization functionality.
 *
 * This service provides methods to completely disable sync by:
 * - Setting sync target to 0 (None)
 * - Hiding Joplin Cloud prompts
 * - Persisting changes to storage
 *
 * @example
 * ```typescript
 * // Disable synchronization
 * await DisableSync.disableSync();
 *
 * // Check if sync is disabled
 * if (DisableSync.isSyncDisabled()) {
 *   console.log('Sync is disabled');
 * }
 * ```
 */
export default class DisableSync {
  /**
   * Disables synchronization by setting sync target to disabled state
   * and hiding Joplin Cloud prompts.
   *
   * This method performs the following actions:
   * 1. Sets sync.target to 0 (None/Disabled)
   * 2. Sets sync.showPrompt to false (hides Cloud prompts)
   * 3. Persists changes to storage
   *
   * @throws {Error} If saving settings fails
   * @returns Promise that resolves when sync is successfully disabled
   */
  public static async disableSync(): Promise<void> {
    try {
      // Disable sync target (set to None)
      Setting.setValue(SYNC_CONFIG.KEYS.TARGET, SYNC_CONFIG.DISABLED_TARGET);

      // Hide Joplin Cloud suggestion prompts
      Setting.setValue(SYNC_CONFIG.KEYS.SHOW_PROMPT, false);

      // Persist configuration changes to storage
      await Setting.saveAll();
    } catch (error) {
      throw new Error(`Failed to disable sync: ${error.message}`);
    }
  } /**
   * Checks if synchronization is currently disabled.
   *
   * @returns true if sync target is set to disabled (0), false otherwise
   */
  public static isSyncDisabled(): boolean {
    const currentTarget = Setting.value(SYNC_CONFIG.KEYS.TARGET);
    return currentTarget === SYNC_CONFIG.DISABLED_TARGET;
  }

  /**
   * Checks if Joplin Cloud prompts are disabled.
   *
   * @returns true if sync prompts are disabled, false otherwise
   */
  public static isPromptDisabled(): boolean {
    const showPrompt = Setting.value(SYNC_CONFIG.KEYS.SHOW_PROMPT);
    return showPrompt === false;
  }

  /**
   * Gets the current sync target value.
   *
   * @returns The current sync target number or undefined if not set
   */
  public static getCurrentSyncTarget(): number | undefined {
    return Setting.value(SYNC_CONFIG.KEYS.TARGET);
  }

  /**
   * Gets a summary of current sync configuration.
   *
   * @returns Object containing sync status information
   */
  public static getSyncStatus(): {
    isDisabled: boolean;
    isPromptDisabled: boolean;
    currentTarget: number | undefined;
    targetName: string;
  } {
    const currentTarget = this.getCurrentSyncTarget();
    const targetName =
      currentTarget === SYNC_CONFIG.DISABLED_TARGET
        ? "None (Disabled)"
        : currentTarget === SYNC_CONFIG.JOPLIN_CLOUD_TARGET
        ? "Joplin Cloud"
        : `Unknown (${currentTarget})`;

    return {
      isDisabled: this.isSyncDisabled(),
      isPromptDisabled: this.isPromptDisabled(),
      currentTarget,
      targetName,
    };
  }
}
