import { $FixMe } from "@locusai/shared";
import { ConsoleLogger, Injectable } from "@nestjs/common";

@Injectable()
export class AppLogger extends ConsoleLogger {
  log(message: $FixMe, context?: string) {
    if (context) {
      super.log(message, context);
    } else {
      super.log(message);
    }
  }

  error(message: $FixMe, stack?: string, context?: string) {
    if (context) {
      super.error(message, stack, context);
    } else if (stack) {
      super.error(message, stack);
    } else {
      super.error(message);
    }
  }

  warn(message: $FixMe, context?: string) {
    if (context) {
      super.warn(message, context);
    } else {
      super.warn(message);
    }
  }

  debug(message: $FixMe, context?: string) {
    if (context) {
      super.debug(message, context);
    } else {
      super.debug(message);
    }
  }

  verbose(message: $FixMe, context?: string) {
    if (context) {
      super.verbose(message, context);
    } else {
      super.verbose(message);
    }
  }
}
