import { IncomingMessage } from 'node:http';
import { ParsedUrlQuery } from 'node:querystring';
import { Options, Ranges } from 'header-range-parser';
import { Middleware } from '@tinyhttp/router';
import { App } from './app.js';
import { Socket } from 'node:net';
import { TLSSocket } from 'node:tls';
import { URLParams } from '@tinyhttp/req';

export { getURLParams } from '@tinyhttp/req';
export declare const getProtocol: (req: Request) => Protocol;
export declare const getHostname: (req: Request) => string | undefined;
export declare const getIP: (req: Pick<Request, "headers" | "connection" | "socket">) => string | undefined;
export declare const getIPs: (req: Pick<Request, "headers" | "connection" | "socket">) => string[] | undefined;
export declare const getSubdomains: (req: Request, subdomainOffset?: number) => string[];
export type Connection = IncomingMessage['socket'] & {
    encrypted: boolean;
};
export type Protocol = 'http' | 'https' | string;
export type { URLParams };
type AcceptsReturns = string | boolean | string[];
export interface Request extends IncomingMessage {
    originalUrl: string;
    path: string;
    url: string;
    query: ParsedUrlQuery;
    params: URLParams;
    connection: Connection;
    socket: TLSSocket | Socket;
    route?: Middleware;
    protocol: Protocol;
    secure: boolean;
    xhr: boolean;
    hostname?: string;
    ip?: string;
    ips?: string[];
    subdomains?: string[];
    get: (header: string) => string | string[] | undefined;
    range: (size: number, options?: Options) => -1 | -2 | -3 | Ranges | undefined;
    accepts: (...types: string[]) => AcceptsReturns;
    acceptsEncodings: (...encodings: string[]) => AcceptsReturns;
    acceptsCharsets: (...charsets: string[]) => AcceptsReturns;
    acceptsLanguages: (...languages: string[]) => AcceptsReturns;
    is: (...types: string[]) => boolean;
    cookies?: any;
    signedCookies?: any;
    secret?: string | string[];
    fresh?: boolean;
    stale?: boolean;
    body?: any;
    app?: App;
}
//# sourceMappingURL=request.d.ts.map