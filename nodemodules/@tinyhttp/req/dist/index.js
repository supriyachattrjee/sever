import { parseRange } from "header-range-parser";
import { typeIs } from "@tinyhttp/type-is";
import { Accepts } from "@tinyhttp/accepts";
export * from "@tinyhttp/url";
const CACHE_CONTROL_NO_CACHE_REGEXP = /(?:^|,)\s*?no-cache\s*?(?:,|$)/;
const compareETags = (etag, str) => str === etag || str === `W/${etag}` || `W/${str}` === etag;
function isStale(etag, noneMatch) {
  let start = 0;
  let end = 0;
  for (let i = 0, len = noneMatch.length; i < len; i++) {
    switch (noneMatch.charCodeAt(i)) {
      case 32:
        if (start === end) start = end = i + 1;
        break;
      case 44:
        if (compareETags(etag, noneMatch.substring(start, end))) return false;
        start = end = i + 1;
        break;
      default:
        end = i + 1;
        break;
    }
  }
  if (compareETags(etag, noneMatch.substring(start, end))) return false;
  return true;
}
function fresh(reqHeaders, resHeaders) {
  const modifiedSince = reqHeaders["if-modified-since"];
  const noneMatch = reqHeaders["if-none-match"];
  if (!modifiedSince && !noneMatch) return false;
  const cacheControl = reqHeaders["cache-control"];
  if (cacheControl && CACHE_CONTROL_NO_CACHE_REGEXP.test(cacheControl)) return false;
  if (noneMatch !== "*") {
    const etag = resHeaders.etag;
    if (!etag || isStale(etag, noneMatch)) return false;
  }
  if (modifiedSince) {
    const lastModified = resHeaders["last-modified"];
    if (!lastModified || !(Date.parse(lastModified) <= Date.parse(modifiedSince))) return false;
  }
  return true;
}
const getAccepts = (req) => (...types) => new Accepts(req).types(types);
const getAcceptsEncodings = (req) => (...encodings) => new Accepts(req).encodings(encodings);
const getAcceptsCharsets = (req) => (...charsets) => new Accepts(req).charsets(charsets);
const getAcceptsLanguages = (req) => (...languages) => new Accepts(req).languages(languages);
const getRequestHeader = (req) => (header) => {
  const lc = header.toLowerCase();
  switch (lc) {
    case "referer":
    case "referrer":
      return req.headers.referrer || req.headers.referer;
    default:
      return req.headers[lc];
  }
};
const getRangeFromHeader = (req) => (size, options) => {
  const range = getRequestHeader(req)("Range");
  if (!range) return;
  return parseRange(size, range, options);
};
const getFreshOrStale = (req, res) => {
  const method = req.method;
  const status = res.statusCode;
  if (method !== "GET" && method !== "HEAD") return false;
  if (status >= 200 && status < 300 || status === 304) {
    return fresh(req.headers, {
      etag: res.getHeader("ETag"),
      "last-modified": res.getHeader("Last-Modified")
    });
  }
  return false;
};
const checkIfXMLHttpRequest = (req) => req.headers["x-requested-with"] === "XMLHttpRequest";
const reqIs = (req) => (...types) => typeIs(req.headers["content-type"], ...types);
export {
  checkIfXMLHttpRequest,
  getAccepts,
  getAcceptsCharsets,
  getAcceptsEncodings,
  getAcceptsLanguages,
  getFreshOrStale,
  getRangeFromHeader,
  getRequestHeader,
  reqIs
};
//# sourceMappingURL=index.js.map
