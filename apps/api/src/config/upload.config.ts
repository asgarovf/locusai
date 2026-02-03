/**
 * File Upload Configuration
 *
 * Defines allowed file types, maximum sizes, and MIME type mappings
 * for secure file upload validation with magic bytes detection.
 */

export interface AllowedFileType {
  /** MIME type string (e.g., 'image/jpeg') */
  readonly mimeType: string;
  /** Allowed file extensions for this MIME type */
  readonly extensions: readonly string[];
}

export interface UploadConfig {
  /** Maximum file size in bytes */
  readonly maxFileSize: number;
  /** List of allowed file types with their MIME types and extensions */
  readonly allowedTypes: readonly AllowedFileType[];
}

/**
 * Default maximum file size: 5MB
 */
export const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Predefined file type configurations
 */
export const FILE_TYPES = {
  // Images
  JPEG: { mimeType: "image/jpeg", extensions: [".jpg", ".jpeg"] },
  PNG: { mimeType: "image/png", extensions: [".png"] },
  GIF: { mimeType: "image/gif", extensions: [".gif"] },
  WEBP: { mimeType: "image/webp", extensions: [".webp"] },
  SVG: { mimeType: "image/svg+xml", extensions: [".svg"] },

  // Documents
  PDF: { mimeType: "application/pdf", extensions: [".pdf"] },

  // Archives
  ZIP: { mimeType: "application/zip", extensions: [".zip"] },

  // Text
  PLAIN_TEXT: { mimeType: "text/plain", extensions: [".txt"] },
  CSV: { mimeType: "text/csv", extensions: [".csv"] },
  JSON: { mimeType: "application/json", extensions: [".json"] },
} as const;

/**
 * Common preset configurations for different upload use cases
 */
export const UPLOAD_PRESETS = {
  /** Images only (jpeg, png, gif, webp) */
  IMAGES: {
    maxFileSize: DEFAULT_MAX_FILE_SIZE,
    allowedTypes: [FILE_TYPES.JPEG, FILE_TYPES.PNG, FILE_TYPES.GIF, FILE_TYPES.WEBP],
  },

  /** Profile avatars (jpeg, png, webp) - smaller size limit */
  AVATAR: {
    maxFileSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: [FILE_TYPES.JPEG, FILE_TYPES.PNG, FILE_TYPES.WEBP],
  },

  /** Documents (pdf, images) */
  DOCUMENTS: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [FILE_TYPES.PDF, FILE_TYPES.JPEG, FILE_TYPES.PNG],
  },

  /** Data files (csv, json, txt) */
  DATA: {
    maxFileSize: DEFAULT_MAX_FILE_SIZE,
    allowedTypes: [FILE_TYPES.CSV, FILE_TYPES.JSON, FILE_TYPES.PLAIN_TEXT],
  },

  /** All common file types */
  ALL: {
    maxFileSize: DEFAULT_MAX_FILE_SIZE,
    allowedTypes: [
      FILE_TYPES.JPEG,
      FILE_TYPES.PNG,
      FILE_TYPES.GIF,
      FILE_TYPES.WEBP,
      FILE_TYPES.PDF,
      FILE_TYPES.ZIP,
    ],
  },
} satisfies Record<string, UploadConfig>;

/**
 * File upload error codes for consistent error handling
 */
export const FILE_UPLOAD_ERROR_CODES = {
  FILE_REQUIRED: "FILE_REQUIRED",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  FILE_TYPE_NOT_ALLOWED: "FILE_TYPE_NOT_ALLOWED",
  FILE_EXTENSION_MISMATCH: "FILE_EXTENSION_MISMATCH",
} as const;

export type FileUploadErrorCode =
  (typeof FILE_UPLOAD_ERROR_CODES)[keyof typeof FILE_UPLOAD_ERROR_CODES];

/**
 * Helper function to get allowed MIME types from config
 */
export function getAllowedMimeTypes(config: UploadConfig): string[] {
  return config.allowedTypes.map((t) => t.mimeType);
}

/**
 * Helper function to get all allowed extensions from config
 */
export function getAllowedExtensions(config: UploadConfig): string[] {
  return config.allowedTypes.flatMap((t) => t.extensions);
}

/**
 * Helper function to find the expected MIME type for a given extension
 */
export function getMimeTypeForExtension(
  config: UploadConfig,
  extension: string
): string | undefined {
  const normalizedExt = extension.toLowerCase().startsWith(".")
    ? extension.toLowerCase()
    : `.${extension.toLowerCase()}`;

  const fileType = config.allowedTypes.find((t) =>
    t.extensions.includes(normalizedExt)
  );

  return fileType?.mimeType;
}

/**
 * Helper function to check if an extension is valid for a given MIME type
 */
export function isExtensionValidForMimeType(
  config: UploadConfig,
  mimeType: string,
  extension: string
): boolean {
  const normalizedExt = extension.toLowerCase().startsWith(".")
    ? extension.toLowerCase()
    : `.${extension.toLowerCase()}`;

  const fileType = config.allowedTypes.find((t) => t.mimeType === mimeType);

  return fileType?.extensions.includes(normalizedExt) ?? false;
}
