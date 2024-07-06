import { IncomingMessage as Request, ServerResponse as Response } from 'node:http';
import { Options, Ranges, Result } from 'header-range-parser';

export * from './accepts.js';
export * from '@tinyhttp/url';
export declare const getRequestHeader: (req: Pick<Request, "headers">) => (header: string) => string | string[];
export declare const getRangeFromHeader: (req: Pick<Request, "headers">) => (size: number, options?: Options) => Result | Ranges;
export declare const getFreshOrStale: (req: Pick<Request, "headers" | "method">, res: Pick<Response, "getHeader" | "statusCode">) => boolean;
export declare const checkIfXMLHttpRequest: (req: Pick<Request, "headers">) => boolean;
export declare const reqIs: (req: Pick<Request, "headers">) => (...types: string[]) => string | false;
//# sourceMappingURL=index.d.ts.map