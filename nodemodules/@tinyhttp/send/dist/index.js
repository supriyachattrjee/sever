import { Stats, statSync, createReadStream } from "node:fs";
import { parse, format } from "@tinyhttp/content-type";
import { eTag } from "@tinyhttp/etag";
import { STATUS_CODES } from "node:http";
import { isAbsolute, join, extname } from "node:path";
import mime from "mime";
const json = (res) => (body, ...args) => {
  res.setHeader("Content-Type", "application/json");
  if ((typeof body === "number" || typeof body === "boolean" || typeof body === "object") && body != null)
    res.end(JSON.stringify(body, null, 2), ...args);
  else if (typeof body === "string") res.end(body, ...args);
  else {
    res.removeHeader("Content-Length");
    res.removeHeader("Transfer-Encoding");
    res.end(null, ...args);
  }
  return res;
};
const createETag = (body, encoding) => {
  if (body instanceof Stats) {
    return eTag(body, { weak: true });
  }
  return eTag(!Buffer.isBuffer(body) ? Buffer.from(body, encoding) : body, { weak: true });
};
function setCharset(type, charset) {
  const parsed = parse(type);
  parsed.parameters.charset = charset;
  return format(parsed);
}
const send = (req, res) => (body) => {
  let bodyToSend = body;
  if (Buffer.isBuffer(body)) {
    bodyToSend = body;
  } else if (typeof body === "object" && body !== null) {
    bodyToSend = JSON.stringify(body, null, 2);
  } else if (typeof body === "string") {
    const type = res.getHeader("Content-Type");
    if (type && typeof type === "string") {
      res.setHeader("Content-Type", setCharset(type, "utf-8"));
    } else res.setHeader("Content-Type", setCharset("text/html", "utf-8"));
  }
  const encoding = "utf8";
  let etag;
  if (body && !res.getHeader("etag") && (etag = createETag(bodyToSend, encoding))) {
    res.setHeader("etag", etag);
  }
  if (req.fresh) res.statusCode = 304;
  if (res.statusCode === 204 || res.statusCode === 304) {
    res.removeHeader("Content-Type");
    res.removeHeader("Content-Length");
    res.removeHeader("Transfer-Encoding");
    bodyToSend = "";
  }
  if (req.method === "HEAD") {
    res.end("");
    return res;
  }
  if (typeof body === "object") {
    if (body == null) {
      res.end("");
      return res;
    }
    if (Buffer.isBuffer(body)) {
      if (!res.getHeader("Content-Type")) res.setHeader("content-type", "application/octet-stream");
      res.end(bodyToSend);
    } else json(res)(bodyToSend, encoding);
  } else {
    if (typeof bodyToSend !== "string") bodyToSend = bodyToSend.toString();
    res.end(bodyToSend, encoding);
  }
  return res;
};
const sendStatus = (req, res) => (statusCode) => {
  const body = STATUS_CODES[statusCode] || String(statusCode);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "text/plain");
  return send(req, res)(body);
};
const status = (res) => (status2) => {
  res.statusCode = status2;
  return res;
};
const enableCaching = (res, caching) => {
  let cc = caching.maxAge != null && `public,max-age=${caching.maxAge}`;
  if (cc && caching.immutable) cc += ",immutable";
  else if (cc && caching.maxAge === 0) cc += ",must-revalidate";
  if (cc) res.setHeader("Cache-Control", cc);
};
const sendFile = (req, res) => (path, opts = {}, cb) => {
  const { root, headers = {}, encoding = "utf-8", caching, ...options } = opts;
  if (!isAbsolute(path) && !root) throw new TypeError("path must be absolute");
  if (caching) enableCaching(res, caching);
  const filePath = root ? join(root, path) : path;
  const stats = statSync(filePath);
  headers["Content-Encoding"] = encoding;
  headers["Last-Modified"] = stats.mtime.toUTCString();
  headers.ETag = createETag(stats, encoding);
  if (!res.getHeader("Content-Type")) headers["Content-Type"] = `${mime.getType(extname(path))}; charset=utf-8`;
  let status2 = res.statusCode || 200;
  if (req.headers.range) {
    status2 = 206;
    const [x, y] = req.headers.range.replace("bytes=", "").split("-");
    const end = options.end = Number.parseInt(y, 10) || stats.size - 1;
    const start = options.start = Number.parseInt(x, 10) || 0;
    if (start >= stats.size || end >= stats.size) {
      res.writeHead(416, {
        "Content-Range": `bytes */${stats.size}`
      }).end();
      return res;
    }
    headers["Content-Range"] = `bytes ${start}-${end}/${stats.size}`;
    headers["Content-Length"] = end - start + 1;
    headers["Accept-Ranges"] = "bytes";
  } else {
    headers["Content-Length"] = stats.size;
  }
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.writeHead(status2, headers);
  const stream = createReadStream(filePath, options);
  if (cb) stream.on("error", (err) => cb(err)).on("end", () => cb());
  stream.pipe(res);
  return res;
};
export {
  enableCaching,
  json,
  send,
  sendFile,
  sendStatus,
  status
};
//# sourceMappingURL=index.js.map
