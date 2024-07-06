import { Server } from 'node:http';
import { Handler, Middleware, NextFunction, UseMethodParams, Router } from '@tinyhttp/router';
import { TemplateEngineOptions } from './index.js';
import { ErrorHandler } from './onError.js';
import { Request } from './request.js';
import { Response } from './response.js';
import { AppConstructor, AppRenderOptions, AppSettings, TemplateEngine } from './types.js';

/**
 * `App` class - the starting point of tinyhttp app.
 *
 * With the `App` you can:
 * * use routing methods and `.use(...)`
 * * set no match (404) and error (500) handlers
 * * configure template engines
 * * store data in locals
 * * listen the http server on a specified port
 *
 * In case you use TypeScript, you can pass custom types to this class because it is also a generic class.
 *
 * Example:
 *
 * ```ts
 * interface CoolReq extends Request {
 *  genericsAreDope: boolean
 * }
 *
 * const app = App<any, CoolReq, Response>()
 * ```
 */
export declare class App<Req extends Request = Request, Res extends Response = Response> extends Router<App, Req, Res> {
    #private;
    middleware: Middleware<Req, Res>[];
    locals: Record<string, unknown>;
    noMatchHandler: Handler;
    onError: ErrorHandler;
    settings: AppSettings;
    engines: Record<string, TemplateEngine>;
    applyExtensions: (req: Request, res: Response, next: NextFunction) => void;
    attach: (req: Req, res: Res) => void;
    cache: Record<string, unknown>;
    constructor(options?: AppConstructor<Req, Res>);
    /**
     * Set app setting
     * @param setting setting name
     * @param value setting value
     */
    set<K extends keyof AppSettings>(setting: K, value: AppSettings[K]): this;
    /**
     * Enable app setting
     * @param setting Setting name
     */
    enable<K extends keyof AppSettings>(setting: K): this;
    /**
     * Check if setting is enabled
     * @param setting Setting name
     * @returns
     */
    enabled<K extends keyof AppSettings>(setting: K): boolean;
    /**
     * Disable app setting
     * @param setting Setting name
     */
    disable<K extends keyof AppSettings>(setting: K): this;
    /**
     * Return the app's absolute pathname
     * based on the parent(s) that have
     * mounted it.
     *
     * For example if the application was
     * mounted as `"/admin"`, which itself
     * was mounted as `"/blog"` then the
     * return value would be `"/blog/admin"`.
     *
     */
    path(): string;
    /**
     * Register a template engine with extension
     */
    engine<RenderOptions extends TemplateEngineOptions = TemplateEngineOptions>(ext: string, fn: TemplateEngine<RenderOptions>): this;
    /**
     * Render a template
     * @param file What to render
     * @param data data that is passed to a template
     * @param options Template engine options
     * @param cb Callback that consumes error and html
     */
    render<RenderOptions extends TemplateEngineOptions = TemplateEngineOptions>(name: string, data?: Record<string, unknown>, options?: AppRenderOptions<RenderOptions>, cb?: (err: unknown, html?: unknown) => void): void;
    use(...args: UseMethodParams<Req, Res, App>): this;
    route(path: string): App;
    /**
     * Extends Req / Res objects, pushes 404 and 500 handlers, dispatches middleware
     * @param req Req object
     * @param res Res object
     */
    handler<RenderOptions extends TemplateEngineOptions = TemplateEngineOptions>(req: Req, res: Res, next?: NextFunction): void;
    /**
     * Creates HTTP server and dispatches middleware
     * @param port server listening port
     * @param Server callback after server starts listening
     * @param host server listening host
     */
    listen(port?: number, cb?: () => void, host?: string): Server;
}
//# sourceMappingURL=app.d.ts.map