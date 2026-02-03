import { extname } from "node:path";
import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  PipeTransform,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import {
  FILE_UPLOAD_ERROR_CODES,
  getAllowedExtensions,
  getAllowedMimeTypes,
  isExtensionValidForMimeType,
  UPLOAD_PRESETS,
  UploadConfig,
} from "../../config/upload.config";

/**
 * File validation pipe that validates uploaded files using magic bytes detection.
 *
 * This pipe performs the following validations:
 * 1. Checks if a file was uploaded (FILE_REQUIRED)
 * 2. Validates file size against maximum limit (FILE_TOO_LARGE)
 * 3. Detects actual file type using magic bytes (INVALID_FILE_TYPE)
 * 4. Verifies detected MIME type is in allowlist (FILE_TYPE_NOT_ALLOWED)
 * 5. Ensures file extension matches detected content type (FILE_EXTENSION_MISMATCH)
 *
 * @example
 * ```typescript
 * @Post('upload')
 * @UseInterceptors(FileInterceptor('file'))
 * async upload(
 *   @UploadedFile(new FileValidationPipe(UPLOAD_PRESETS.IMAGES))
 *   file: Express.Multer.File
 * ) {
 *   // File is validated
 * }
 * ```
 */
@Injectable()
export class FileValidationPipe implements PipeTransform<Express.Multer.File> {
  private readonly config: UploadConfig;

  constructor(config: UploadConfig = UPLOAD_PRESETS.ALL) {
    this.config = config;
  }

  async transform(file: Express.Multer.File): Promise<Express.Multer.File> {
    // Check if file exists
    if (!file) {
      throw new BadRequestException({
        code: FILE_UPLOAD_ERROR_CODES.FILE_REQUIRED,
        message: "No file uploaded. Please select a file to upload.",
      });
    }

    // Validate file size
    this.validateFileSize(file);

    // Detect and validate file type using magic bytes
    await this.validateFileType(file);

    return file;
  }

  private validateFileSize(file: Express.Multer.File): void {
    if (file.size > this.config.maxFileSize) {
      const maxSizeMB = (this.config.maxFileSize / (1024 * 1024)).toFixed(1);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);

      throw new PayloadTooLargeException({
        code: FILE_UPLOAD_ERROR_CODES.FILE_TOO_LARGE,
        message: `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB).`,
        details: {
          maxSize: this.config.maxFileSize,
          fileSize: file.size,
          maxSizeMB,
          fileSizeMB,
        },
      });
    }
  }

  private async validateFileType(file: Express.Multer.File): Promise<void> {
    // Import file-type dynamically (ESM module)
    const { fileTypeFromBuffer } = await import("file-type");

    // Detect file type from buffer using magic bytes
    const detectedType = await fileTypeFromBuffer(file.buffer);

    // Handle files that cannot be detected (e.g., text files)
    if (!detectedType) {
      // For text-based files (txt, csv, json), magic bytes detection may not work
      // Fall back to extension-based validation for these types
      const textMimeTypes = ["text/plain", "text/csv", "application/json"];
      const allowedTextTypes = this.config.allowedTypes.filter((t) =>
        textMimeTypes.includes(t.mimeType)
      );

      if (allowedTextTypes.length > 0) {
        const fileExtension = extname(file.originalname).toLowerCase();
        const matchingType = allowedTextTypes.find((t) =>
          t.extensions.includes(fileExtension)
        );

        if (matchingType) {
          // Validate that the content is actually text (basic check)
          if (this.isValidTextContent(file.buffer)) {
            return; // Accept the file
          }
        }
      }

      // Cannot detect file type
      const allowedExtensions = getAllowedExtensions(this.config);
      throw new UnsupportedMediaTypeException({
        code: FILE_UPLOAD_ERROR_CODES.INVALID_FILE_TYPE,
        message:
          "Unable to determine file type. The file may be corrupted or empty.",
        details: {
          allowedExtensions,
          allowedMimeTypes: getAllowedMimeTypes(this.config),
        },
      });
    }

    // Check if detected MIME type is allowed
    const allowedMimeTypes = getAllowedMimeTypes(this.config);
    if (!allowedMimeTypes.includes(detectedType.mime)) {
      throw new UnsupportedMediaTypeException({
        code: FILE_UPLOAD_ERROR_CODES.FILE_TYPE_NOT_ALLOWED,
        message: `File type '${detectedType.mime}' is not allowed. Allowed types: ${allowedMimeTypes.join(", ")}.`,
        details: {
          detectedType: detectedType.mime,
          allowedMimeTypes,
        },
      });
    }

    // Verify file extension matches detected content type
    const fileExtension = extname(file.originalname).toLowerCase();
    if (
      fileExtension &&
      !isExtensionValidForMimeType(
        this.config,
        detectedType.mime,
        fileExtension
      )
    ) {
      const allowedExtensions = this.config.allowedTypes
        .find((t) => t.mimeType === detectedType.mime)
        ?.extensions.join(", ");

      throw new UnsupportedMediaTypeException({
        code: FILE_UPLOAD_ERROR_CODES.FILE_EXTENSION_MISMATCH,
        message: `File extension '${fileExtension}' does not match detected content type '${detectedType.mime}'. Expected extensions: ${allowedExtensions}.`,
        details: {
          extension: fileExtension,
          detectedType: detectedType.mime,
          expectedExtensions: allowedExtensions,
        },
      });
    }
  }

  /**
   * Basic validation to check if buffer contains valid text content.
   * This is a fallback for text files where magic bytes detection doesn't work.
   */
  private isValidTextContent(buffer: Buffer): boolean {
    // Check for null bytes (binary content indicator)
    const sampleSize = Math.min(buffer.length, 8192);
    for (let i = 0; i < sampleSize; i++) {
      // Allow common text bytes (printable ASCII, newlines, tabs)
      const byte = buffer[i];
      if (byte === 0) {
        return false; // Null byte indicates binary content
      }
    }
    return true;
  }
}

/**
 * Factory function to create a FileValidationPipe with custom configuration
 */
export function createFileValidationPipe(
  config: Partial<UploadConfig> & Pick<UploadConfig, "allowedTypes">
): FileValidationPipe {
  return new FileValidationPipe({
    maxFileSize: config.maxFileSize ?? UPLOAD_PRESETS.ALL.maxFileSize,
    allowedTypes: config.allowedTypes,
  });
}
