import { sendFile } from "@tinyhttp/send";
export * from "@tinyhttp/send";
import * as cookie from "@tinyhttp/cookie";
import { sign } from "@tinyhttp/cookie-signature";
import { encodeUrl } from "@tinyhttp/encode-url";
import { getRequestHeader, getAccepts } from "@tinyhttp/req";
import { vary } from "@tinyhttp/vary";
import mime from "mime";
import { STATUS_CODES } from "node:http";
import { escapeHTML } from "es-escape-html";
import { basename, resolve, extname } from "node:path";
import { contentDisposition } from "@tinyhttp/content-disposition";
const charsetRegExp = /;\s*charset\s*=/;
const setHeader = (res) => (field, val) => {
  if (typeof field === "string") {
    let value = Array.isArray(val) ? val.map(String) : String(val);
    if (field.toLowerCase() === "content-type") {
      if (Array.isArray(value)) {
        throw new TypeError("Content-Type cannot be set to an Array");
      }
      if (!charsetRegExp.test(value)) {
        const charset = "UTF-8";
        value += `; charset=${charset.toLowerCase()}`;
      }
    }
    res.setHeader(field, value);
  } else {
    for (const key in field) {
      setHeader(res)(key, field[key]);
    }
  }
  return res;
};
const setLocationHeader = (req, res) => (url) => {
  let loc = url;
  if (url === "back") loc = getRequestHeader(req)("Referrer") || "/";
  res.setHeader("Location", encodeUrl(loc));
  return res;
};
const getResponseHeader = (res) => (field) => {
  return res.getHeader(field);
};
const setLinksHeader = (res) => (links) => {
  let link = res.getHeader("Link") || "";
  if (link) link += ", ";
  res.setHeader(
    "Link",
    link + Object.keys(links).map((rel) => `<${links[rel]}>; rel="${rel}"`).join(", ")
  );
  return res;
};
const setVaryHeader = (res) => (field) => {
  vary(res, field);
  return res;
};
const setContentType = (res) => (type) => {
  const ct = type.indexOf("/") === -1 ? mime.getType(type) : type;
  setHeader(res)("Content-Type", ct);
  return res;
};
const append = (res) => (field, value) => {
  const prevVal = getResponseHeader(res)(field);
  let newVal = value;
  if (prevVal && typeof newVal !== "number" && typeof prevVal !== "number") {
    newVal = Array.isArray(prevVal) ? prevVal.concat(newVal) : Array.isArray(newVal) ? [prevVal].concat(newVal) : [prevVal, newVal];
  }
  setHeader(res)(field, newVal);
  return res;
};
const setCookie = (req, res) => (name, value, options = {}) => {
  const secret = req.secret;
  const signed = options.signed || false;
  if (signed && !secret) throw new Error('cookieParser("secret") required for signed cookies');
  let val = typeof value === "object" ? `j:${JSON.stringify(value)}` : String(value);
  if (signed) val = `s:${sign(val, secret)}`;
  if (options.maxAge) {
    options.expires = new Date(Date.now() + options.maxAge);
    options.maxAge /= 1e3;
  }
  if (options.path == null) options.path = "/";
  append(res)("Set-Cookie", `${cookie.serialize(name, String(val), options)}`);
  return res;
};
const clearCookie = (req, res) => (name, options) => {
  return setCookie(req, res)(name, "", Object.assign({}, { expires: /* @__PURE__ */ new Date(1), path: "/" }, options));
};
const normalizeType = (type) => ~type.indexOf("/") ? acceptParams(type) : { value: mime.getType(type), params: {} };
function acceptParams(str, index) {
  const parts = str.split(/ *; */);
  const ret = { value: parts[0], quality: 1, params: {}, originalIndex: index };
  for (const part of parts) {
    const pms = part.split(/ *= */);
    if ("q" === pms[0]) ret.quality = Number.parseFloat(pms[1]);
    else ret.params[pms[0]] = pms[1];
  }
  return ret;
}
function normalizeTypes(types) {
  const ret = [];
  for (const type of types) {
    ret.push(normalizeType(type));
  }
  return ret;
}
const formatResponse = (req, res, next) => (obj) => {
  const fn = obj.default;
  if (fn) obj.default = void 0;
  const keys = Object.keys(obj);
  const key = keys.length > 0 ? getAccepts(req)(...keys) : false;
  setVaryHeader(res)("Accept");
  if (key) {
    res.setHeader("Content-Type", normalizeType(key).value);
    obj[key](req, res, next);
  } else if (fn) {
    fn();
  } else {
    const err = new Error("Not Acceptable");
    err.status = err.statusCode = 406;
    err.types = normalizeTypes(keys).map((o) => o.value);
    next(err);
  }
  return res;
};
const redirect = (req, res, next) => (url, status) => {
  let address = url;
  status = status || 302;
  let body = "";
  address = setLocationHeader(req, res)(address).getHeader("Location");
  formatResponse(
    req,
    res,
    next
  )({
    text: () => {
      body = `${STATUS_CODES[status]}. Redirecting to ${address}`;
    },
    html: () => {
      const u = escapeHTML(address);
      body = `<p>${STATUS_CODES[status]}. Redirecting to <a href="${u}">${u}</a></p>`;
    },
    default: () => {
      body = "";
    }
  });
  res.setHeader("Content-Length", Buffer.byteLength(body));
  res.statusCode = status;
  if (req.method === "HEAD") res.end();
  else res.end(body);
  return res;
};
const download = (req, res) => (path, filename, options, cb) => {
  let done = cb;
  let name = filename;
  let opts = options || null;
  if (typeof filename === "function") {
    done = filename;
    name = null;
  } else if (typeof options === "function") {
    done = options;
    opts = null;
  }
  const headers = {
    "Content-Disposition": contentDisposition(name || basename(path))
  };
  if (opts == null ? void 0 : opts.headers) {
    for (const key of Object.keys(opts.headers)) {
      if (key.toLowerCase() !== "content-disposition") headers[key] = opts.headers[key];
    }
  }
  opts = { ...opts, headers };
  return sendFile(req, res)(opts.root ? path : resolve(path), opts, done || (() => void 0));
};
const attachment = (res) => (filename) => {
  if (filename) {
    setContentType(res)(extname(filename));
    filename = basename(filename);
  }
  setHeader(res)("Content-Disposition", contentDisposition(filename));
  return res;
};
export {
  append,
  attachment,
  clearCookie,
  download,
  formatResponse,
  getResponseHeader,
  redirect,
  setContentType,
  setCookie,
  setHeader,
  setLinksHeader,
  setLocationHeader,
  setVaryHeader
};
//# sourceMappingURL=index.js.map
