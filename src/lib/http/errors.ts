export class HttpError extends Error {
  override name = "HttpError";

  constructor(
    public readonly status: number,
    public readonly body: string,
    public readonly url: string,
  ) {
    super(`HTTP ${status} from ${url}`);
    Error.captureStackTrace?.(this, HttpError);
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
  get isServerError(): boolean {
    return this.status >= 500;
  }
  get isRateLimit(): boolean {
    return this.status === 429;
  }
  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}
