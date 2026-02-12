import { SetMetadata } from "@nestjs/common";

export const SKIP_SANITIZE_KEY = "skipSanitize";
export const SkipSanitize = () => SetMetadata(SKIP_SANITIZE_KEY, true);
