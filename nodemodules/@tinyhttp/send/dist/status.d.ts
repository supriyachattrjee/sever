import { ServerResponse } from 'node:http';

type Res = Pick<ServerResponse, 'statusCode'>;
/**
 * Sets the HTTP status for the response. It is a chainable alias of Node’s `response.statusCode`.
 *
 * @param res Response
 */
export declare const status: <Response extends Res = Res>(res: Response) => (status: number) => Response;
export {};
//# sourceMappingURL=status.d.ts.map