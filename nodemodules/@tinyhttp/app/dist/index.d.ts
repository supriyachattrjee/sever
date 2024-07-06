import { Middleware, NextFunction, AsyncHandler as RAsyncHandler, Handler as RHandler, SyncHandler as RSyncHandler } from '@tinyhttp/router';
import { Request } from './request.js';
import { Response } from './response.js';
export { App } from './app.js';
export * from './request.js';
export * from './response.js';
export { extendMiddleware } from './extend.js';
export { onErrorHandler, type ErrorHandler } from './onError.js';
export { View } from './view.js';
export type { AppSettings, TemplateEngineOptions, TemplateEngine, AppConstructor } from './types.js';
export type Handler = RHandler<Request, Response>;
export type AsyncHandler = RAsyncHandler<Request, Response>;
export type SyncHandler = RSyncHandler<Request, Response>;
export type { NextFunction, Middleware, Request, Response };
//# sourceMappingURL=index.d.ts.map