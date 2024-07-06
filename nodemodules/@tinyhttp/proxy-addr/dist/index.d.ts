import { IncomingMessage } from 'node:http';
import { IPv6, IPv4 } from 'ipaddr.js';

type Req = Pick<IncomingMessage, 'headers' | 'socket'>;
type Trust = ((addr: string, i: number) => boolean) | number[] | string[] | string;
/**
 * Get all addresses in the request, optionally stopping
 * at the first untrusted.
 *
 * @param request
 * @param trust
 */
declare function alladdrs(req: Req, trust: Trust): string[];
/**
 * Compile argument into trust function.
 *
 * @param  val
 */
declare function compile(val: string | string[] | number[]): (addr: string) => boolean;
/**
 * Parse IP notation string into range subnet.
 *
 * @param {String} note
 * @private
 */
export declare function parseIPNotation(note: string): [IPv4 | IPv6, string | number];
/**
 * Determine address of proxied request.
 *
 * @param request
 * @param trust
 * @public
 */
export declare function proxyaddr(req: Req, trust: Trust): string;
export { alladdrs as all };
export { compile };
//# sourceMappingURL=index.d.ts.map