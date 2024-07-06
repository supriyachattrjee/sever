import { IncomingMessage as I, ServerResponse as S } from 'node:http';

type Req = Pick<I, 'method'>;
type Res = Pick<S, 'setHeader' | 'removeHeader' | 'end' | 'getHeader' | 'statusCode'>;
/**
 * Sets the response HTTP status code to statusCode and send its string representation as the response body.
 *
 * If an unsupported status code is specified, the HTTP status is still set to statusCode and the string version of the code is sent as the response body.
 *
 * @param req Request
 * @param res Response
 */
export declare const sendStatus: <Request extends Req = Req, Response extends Res = Res>(req: Request, res: Response) => (statusCode: number) => Response;
export {};
//# sourceMappingURL=sendStatus.d.ts.map