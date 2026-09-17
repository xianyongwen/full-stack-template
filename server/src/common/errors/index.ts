/**
 * 业务错误体系
 *
 * Service / Repository 里 `throw` 这些错误，
 * 由 app.ts 的 `setErrorHandler` 统一翻译成 HTTP 响应。
 * Controller 不需要自己 try/catch 转响应。
 */

/** 所有业务错误的基类，携带 code 用于前端识别 */
export class BusinessError extends Error {
  /** 业务错误码，默认 400 HTTP */
  readonly httpStatus: number = 400;
  readonly code: string;

  constructor(message: string, code = "BUSINESS_ERROR", httpStatus = 400) {
    super(message);
    this.name = "BusinessError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/** 资源不存在 */
export class NotFoundError extends BusinessError {
  constructor(message = "资源不存在") {
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

/** 无权限（已登录但无权操作） */
export class ForbiddenError extends BusinessError {
  constructor(message = "无权限") {
    super(message, "FORBIDDEN", 403);
    this.name = "ForbiddenError";
  }
}

/** 未登录 / token 失效 */
export class UnauthorizedError extends BusinessError {
  constructor(message = "未登录或登录已失效") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

/** 参数校验类业务错误 */
export class ValidationError extends BusinessError {
  constructor(message = "参数错误") {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

/** 冲突：唯一约束、状态冲突等 */
export class ConflictError extends BusinessError {
  constructor(message = "操作冲突") {
    super(message, "CONFLICT", 409);
    this.name = "ConflictError";
  }
}

/** 判断是否业务错误（给 errorHandler 用） */
export function isBusinessError(e: unknown): e is BusinessError {
  return e instanceof BusinessError;
}
