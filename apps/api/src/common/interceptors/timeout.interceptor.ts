import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, throwError, TimeoutError } from "rxjs";
import { catchError, timeout } from "rxjs/operators";
import { TypedConfigService } from "../../config/config.service";

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly configService: TypedConfigService) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const timeoutMs = this.configService.get("REQUEST_TIMEOUT");

    return next.handle().pipe(
      timeout(timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(
            () =>
              new HttpException(
                "Request timeout - the server took too long to respond",
                HttpStatus.REQUEST_TIMEOUT
              )
          );
        }
        return throwError(() => err);
      })
    );
  }
}
