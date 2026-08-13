import path from 'path';
import { AppError } from '../errors/AppError';

// ── Magic Bytes Signatures ───────────────────────────────────────────────────

const MAGIC_NUMBERS: Record<string, number[][]> = {
  // PDF: %PDF- (25 50 44 46 2d)
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  // JPEG / JPG: FF D8 FF
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  // WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
};

// ── Allowed Extensions & Max Sizes ───────────────────────────────────────────

export const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.doc',
  '.docx',
]);

export const MAX_FILE_SIZES = {
  IMAGE: 10 * 1024 * 1024,      // 10 MB
  DOCUMENT: 50 * 1024 * 1024,   // 50 MB
  DEFAULT: 25 * 1024 * 1024,    // 25 MB
};

// Dangerous extensions that must NEVER be allowed under any circumstances
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.php', '.phtml', '.php5',
  '.py', '.rb', '.pl', '.jsp', '.asp', '.aspx', '.cgi', '.js', '.ts',
  '.vbs', '.scr', '.msi', '.jar', '.war', '.svg', '.html', '.htm',
]);

/**
 * Sanitize filename to prevent directory traversal and null byte injection.
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'file_' + Date.now();

  // Strip null bytes
  let safeName = filename.replace(/\0/g, '');

  // Strip directory paths (take only basename)
  safeName = path.basename(safeName);

  // Strip path traversal attempts
  safeName = safeName.replace(/\.\./g, '');

  // Strip non-alphanumeric except safe delimiters (_, -, .)
  safeName = safeName.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Ensure safe extension
  const ext = path.extname(safeName).toLowerCase();
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    throw new AppError(`File type ${ext} is strictly prohibited`, 400);
  }

  return safeName || `upload_${Date.now()}`;
}

/**
 * Validate file buffer magic bytes against declared MIME type.
 */
export function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signatures = MAGIC_NUMBERS[mimeType];
  if (!signatures) {
    // If no signature check defined for this type (e.g. docx/zip), pass by default
    return true;
  }

  for (const sig of signatures) {
    let match = true;
    for (let i = 0; i < sig.length; i++) {
      if (buffer[i] !== sig[i]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }

  return false;
}

/**
 * Complete file upload validator.
 */
export function validateUploadFile(
  file: Express.Multer.File | { buffer?: Buffer; originalname: string; mimetype: string; size: number },
  maxSize: number = MAX_FILE_SIZES.DEFAULT
): { safeFilename: string } {
  if (!file) {
    throw new AppError('No file provided for upload', 400);
  }

  if (file.size > maxSize) {
    const maxMb = Math.round(maxSize / (1024 * 1024));
    throw new AppError(`File exceeds maximum allowed size of ${maxMb}MB`, 400);
  }

  const safeFilename = sanitizeFilename(file.originalname);
  const ext = path.extname(safeFilename).toLowerCase();

  if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
    throw new AppError(`Unsupported file extension: ${ext}. Allowed: ${Array.from(ALLOWED_UPLOAD_EXTENSIONS).join(', ')}`, 400);
  }

  if (file.buffer && file.mimetype) {
    const isValidSignature = validateMagicBytes(file.buffer, file.mimetype);
    if (!isValidSignature) {
      throw new AppError('File header does not match declared content type (corrupted or spoofed file)', 400);
    }
  }

  return { safeFilename };
}
