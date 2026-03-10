export const LOCKED_NOTES_MAGIC = 'JLN';
export const LOCKED_NOTES_VERSION = 1 as const;

/**
 * Algorithm ID for v1:
 * PBKDF2 (SHA-512) + AES-256-GCM, random salt + random IV per chunk.
 */
export const LOCKED_NOTES_ALGORITHM_ID_V1 = 1 as const;

export const DEFAULT_PBKDF2_ITERATIONS = 220_000;
export const DEFAULT_SALT_BYTES = 16; // per chunk
export const DEFAULT_AUTH_TAG_LENGTH_BYTES = 16; // AES-GCM tag length
export const DEFAULT_KEY_LENGTH_BYTES = 32; // AES-256
export const DEFAULT_FILE_CHUNK_SIZE = 512 * 1024; // 512 KiB

export const LOCKED_NOTES_STRING_PREFIX = 'JLN1:';

export const DEFAULT_DIGEST_ALGORITHM = 'SHA-512';
export const DEFAULT_CIPHER_ALGORITHM = 'AES-256-GCM';
