import { STATUS_CODES, createServer } from "node:http";
import { getRequestHeader, getQueryParams, getRangeFromHeader, getAccepts, getAcceptsCharsets, getAcceptsEncodings, getAcceptsLanguages, checkIfXMLHttpRequest, getFreshOrStale, getPathname, getURLParams } from "@tinyhttp/req";
import { getURLParams as getURLParams2 } from "@tinyhttp/req";
import { Router, pushMiddleware } from "@tinyhttp/router";
import { parse } from "regexparam";
import { getResponseHeader, setHeader, send, json, status, sendStatus, sendFile, setContentType, setLocationHeader, setLinksHeader, setVaryHeader, setCookie, clearCookie, formatResponse, redirect, attachment, download, append } from "@tinyhttp/res";
import { proxyaddr, all, compile } from "@tinyhttp/proxy-addr";
import { isIP } from "node:net";
import { statSync } from "node:fs";
import { extname, resolve, dirname, basename, join } from "node:path";
const trustRemoteAddress = ({ socket }) => {
  const val = socket.remoteAddress;
  if (typeof val === "string") return compile(val.split(",").map((x) => x.trim()));
  return compile(val || []);
};
const getProtocol = (req) => {
  const proto = `http${req.secure ? "s" : ""}`;
  if (!trustRemoteAddress(req)) return proto;
  const header = req.headers["X-Forwarded-Proto"] || proto;
  const index = header.indexOf(",");
  return index !== -1 ? header.substring(0, index).trim() : header.trim();
};
const getHostname = (req) => {
  let host = req.get("X-Forwarded-Host");
  if (!host || !trustRemoteAddress(req)) host = req.get("Host");
  if (!host) return;
  const index = host.indexOf(":", host[0] === "[" ? host.indexOf("]") + 1 : 0);
  return index !== -1 ? host.substring(0, index) : host;
};
const getIP = (req) => proxyaddr(req, trustRemoteAddress(req)).replace(/^.*:/, "");
const getIPs = (req) => all(req, trustRemoteAddress(req));
const getSubdomains = (req, subdomainOffset = 2) => {
  const hostname = getHostname(req);
  if (!hostname) return [];
  const subdomains = isIP(hostname) ? [hostname] : hostname.split(".").reverse();
  return subdomains.slice(subdomainOffset);
};
const renderTemplate = (_req, res, app) => (file, data, options) => {
  app.render(file, data ? { ...res.locals, ...data } : res.locals, options, (err, html) => {
    if (err) throw err;
    res.send(html);
  });
  return res;
};
const extendMiddleware = (app) => (req, res, next) => {
  const { settings } = app;
  res.get = getResponseHeader(res);
  req.get = getRequestHeader(req);
  if (settings == null ? void 0 : settings.bindAppToReqRes) {
    req.app = app;
    res.app = app;
  }
  if (settings == null ? void 0 : settings.networkExtensions) {
    req.protocol = getProtocol(req);
    req.secure = req.protocol === "https";
    req.hostname = getHostname(req);
    req.subdomains = getSubdomains(req, settings.subdomainOffset);
    req.ip = getIP(req);
    req.ips = getIPs(req);
  }
  req.query = getQueryParams(req.url);
  req.range = getRangeFromHeader(req);
  req.accepts = getAccepts(req);
  req.acceptsCharsets = getAcceptsCharsets(req);
  req.acceptsEncodings = getAcceptsEncodings(req);
  req.acceptsLanguages = getAcceptsLanguages(req);
  req.xhr = checkIfXMLHttpRequest(req);
  res.header = res.set = setHeader(res);
  res.send = send(req, res);
  res.json = json(res);
  res.status = status(res);
  res.sendStatus = sendStatus(req, res);
  res.sendFile = sendFile(req, res);
  res.type = setContentType(res);
  res.location = setLocationHeader(req, res);
  res.links = setLinksHeader(res);
  res.vary = setVaryHeader(res);
  res.cookie = setCookie(req, res);
  res.clearCookie = clearCookie(req, res);
  res.render = renderTemplate(req, res, app);
  res.format = formatResponse(req, res, next);
  res.redirect = redirect(req, res, next);
  res.attachment = attachment(res);
  res.download = download(req, res);
  res.append = append(res);
  res.locals = res.locals || /* @__PURE__ */ Object.create(null);
  Object.defineProperty(req, "fresh", { get: getFreshOrStale.bind(null, req, res), configurable: true });
  req.stale = !req.fresh;
  next();
};
const onErrorHandler = function(err, _req, res) {
  if (this.onError === onErrorHandler && this.parent) return this.parent.onError(err, _req, res);
  if (err instanceof Error) console.error(err);
  const code = err.code in STATUS_CODES ? err.code : err.status;
  if (typeof err === "string" || Buffer.isBuffer(err)) res.writeHead(500).end(err);
  else if (code in STATUS_CODES) res.writeHead(code).end(STATUS_CODES[code]);
  else res.writeHead(500).end(err.message);
};
function tryStat(path) {
  try {
    return statSync(path);
  } catch (e) {
    return void 0;
  }
}
class View {
  constructor(name, opts = {}) {
    this.ext = extname(name);
    this.name = name;
    this.root = opts.root;
    this.defaultEngine = opts.defaultEngine;
    if (!this.ext && !this.defaultEngine)
      throw new Error("No default engine was specified and no extension was provided.");
    let fileName = name;
    if (!this.ext) {
      this.ext = this.defaultEngine[0] !== "." ? `.${this.defaultEngine}` : this.defaultEngine;
      fileName += this.ext;
    }
    if (!opts.engines[this.ext]) throw new Error(`No engine was found for ${this.ext}`);
    this.engine = opts.engines[this.ext];
    this.path = this.#lookup(fileName);
  }
  #lookup(name) {
    let path;
    const roots = [].concat(this.root);
    for (let i = 0; i < roots.length && !path; i++) {
      const root = roots[i];
      const loc = resolve(root, name);
      const dir = dirname(loc);
      const file = basename(loc);
      path = this.#resolve(dir, file);
    }
    return path;
  }
  #resolve(dir, file) {
    const ext = this.ext;
    let path = join(dir, file);
    let stat = tryStat(path);
    if (stat == null ? void 0 : stat.isFile()) {
      return path;
    }
    path = join(dir, basename(file, ext), `index${ext}`);
    stat = tryStat(path);
    if (stat == null ? void 0 : stat.isFile()) {
      return path;
    }
  }
  render(options, data, cb) {
    this.engine(this.path, data, options, cb);
  }
}
const lead = (x) => x.charCodeAt(0) === 47 ? x : `/${x}`;
const mount = (fn) => fn instanceof App ? fn.attach : fn;
const applyHandler = (h) => async (req, res, next) => {
  try {
    if (h[Symbol.toStringTag] === "AsyncFunction") {
      await h(req, res, next);
    } else h(req, res, next);
  } catch (e) {
    next(e);
  }
};
class App extends Router {
  constructor(options = {}) {
    super();
    this.middleware = [];
    this.locals = {};
    this.engines = {};
    this.onError = (options == null ? void 0 : options.onError) || onErrorHandler;
    this.noMatchHandler = (options == null ? void 0 : options.noMatchHandler) || this.onError.bind(this, { code: 404 });
    this.settings = {
      view: View,
      xPoweredBy: true,
      views: `${process.cwd()}/views`,
      "view cache": process.env.NODE_ENV === "production",
      ...options.settings
    };
    this.applyExtensions = options == null ? void 0 : options.applyExtensions;
    this.attach = (req, res) => setImmediate(this.handler.bind(this, req, res, void 0), req, res);
    this.cache = {};
  }
  /**
   * Set app setting
   * @param setting setting name
   * @param value setting value
   */
  set(setting, value) {
    this.settings[setting] = value;
    return this;
  }
  /**
   * Enable app setting
   * @param setting Setting name
   */
  enable(setting) {
    this.settings[setting] = true;
    return this;
  }
  /**
   * Check if setting is enabled
   * @param setting Setting name
   * @returns
   */
  enabled(setting) {
    return Boolean(this.settings[setting]);
  }
  /**
   * Disable app setting
   * @param setting Setting name
   */
  disable(setting) {
    this.settings[setting] = false;
    return this;
  }
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
  path() {
    return this.parent ? this.parent.path() + this.mountpath : "";
  }
  /**
   * Register a template engine with extension
   */
  engine(ext, fn) {
    this.engines[ext[0] === "." ? ext : `.${ext}`] = fn;
    return this;
  }
  /**
   * Render a template
   * @param file What to render
   * @param data data that is passed to a template
   * @param options Template engine options
   * @param cb Callback that consumes error and html
   */
  render(name, data = {}, options = {}, cb = () => {
  }) {
    let view;
    const { _locals, ...opts } = options;
    let locals = this.locals;
    if (_locals) locals = { ...locals, ..._locals };
    locals = { ...locals, ...data };
    if (opts.cache == null) opts.cache = this.enabled("view cache");
    if (opts.cache) {
      view = this.cache[name];
    }
    if (!view) {
      const View2 = this.settings.view;
      view = new View2(name, {
        defaultEngine: this.settings["view engine"],
        root: this.settings.views,
        engines: this.engines
      });
      if (!view.path) {
        const dirs = Array.isArray(view.root) && view.root.length > 1 ? `directories "${view.root.slice(0, -1).join('", "')}" or "${view.root[view.root.length - 1]}"` : `directory "${view.root}"`;
        const err = new Error(`Failed to lookup view "${name}" in views ${dirs}`);
        return cb(err);
      }
      if (opts.cache) {
        this.cache[name] = view;
      }
    }
    try {
      view.render(opts, locals, cb);
    } catch (err) {
      cb(err);
    }
  }
  use(...args) {
    var _a;
    const base = args[0];
    const fns = args.slice(1).flat();
    let pathArray = [];
    if (typeof base === "function" || base instanceof App) {
      fns.unshift(base);
    } else {
      let basePaths = [];
      if (Array.isArray(base)) basePaths = [...base];
      else if (typeof base === "string") basePaths = [base];
      basePaths = basePaths.filter((element) => {
        if (typeof element === "string") {
          pathArray.push(element);
          return false;
        }
        return true;
      });
      fns.unshift(...basePaths);
    }
    pathArray = pathArray.length ? pathArray.map((path) => lead(path)) : ["/"];
    const mountpath = pathArray.join(", ");
    let regex;
    for (const fn of fns) {
      if (fn instanceof App) {
        for (const path of pathArray) {
          regex = parse(path, true);
          fn.mountpath = mountpath;
          this.apps[path] = fn;
          fn.parent = this;
        }
      }
    }
    for (const path of pathArray) {
      const handlerPaths = [];
      const handlerFunctions = [];
      const handlerPathBase = path === "/" ? "" : lead(path);
      for (const fn of fns) {
        if (fn instanceof App && ((_a = fn.middleware) == null ? void 0 : _a.length)) {
          for (const mw of fn.middleware) {
            handlerPaths.push(handlerPathBase + lead(mw.path));
            handlerFunctions.push(fn);
          }
        } else {
          handlerPaths.push("");
          handlerFunctions.push(fn);
        }
      }
      pushMiddleware(this.middleware)({
        path,
        regex,
        type: "mw",
        handler: mount(handlerFunctions[0]),
        handlers: handlerFunctions.slice(1).map(mount),
        fullPaths: handlerPaths
      });
    }
    return this;
  }
  route(path) {
    const app = new App({ settings: this.settings });
    this.use(path, app);
    return app;
  }
  #find(url) {
    return this.middleware.filter((m) => {
      m.regex = m.regex || parse(m.path, m.type === "mw");
      let fullPathRegex;
      m.fullPath && typeof m.fullPath === "string" ? fullPathRegex = parse(m.fullPath, m.type === "mw") : fullPathRegex = null;
      return m.regex.pattern.test(url) && (m.type === "mw" && fullPathRegex ? fullPathRegex.pattern.test(url) : true);
    });
  }
  /**
   * Extends Req / Res objects, pushes 404 and 500 handlers, dispatches middleware
   * @param req Req object
   * @param res Res object
   */
  handler(req, res, next) {
    const { xPoweredBy } = this.settings;
    if (xPoweredBy) res.setHeader("X-Powered-By", typeof xPoweredBy === "string" ? xPoweredBy : "tinyhttp");
    const exts = this.applyExtensions || extendMiddleware(this);
    req.originalUrl = req.url || req.originalUrl;
    const pathname = getPathname(req.originalUrl);
    const matched = this.#find(pathname);
    const mw = [
      {
        handler: exts,
        type: "mw",
        path: "/"
      },
      ...matched.filter((x) => req.method === "HEAD" || (x.method ? x.method === req.method : true))
    ];
    if (matched[0] != null) {
      mw.push({
        type: "mw",
        handler: (req2, res2, next2) => {
          if (req2.method === "HEAD") {
            res2.statusCode = 204;
            return res2.end("");
          }
          next2();
        },
        path: "/"
      });
    }
    mw.push({
      handler: this.noMatchHandler,
      type: "mw",
      path: "/"
    });
    const handle = (mw2) => async (req2, res2, next2) => {
      var _a;
      const { path, handler, regex } = mw2;
      let params;
      try {
        params = regex ? getURLParams(regex, pathname) : {};
      } catch (e) {
        console.error(e);
        if (e instanceof URIError) return res2.sendStatus(400);
        throw e;
      }
      let prefix = path;
      if (regex) {
        for (const key of regex.keys) {
          if (key === "wild") {
            prefix = prefix.replace("*", params.wild);
          } else {
            prefix = prefix.replace(`:${key}`, params[key]);
          }
        }
      }
      req2.params = { ...req2.params, ...params };
      if (mw2.type === "mw") {
        req2.url = lead(req2.originalUrl.substring(prefix.length));
      }
      if (!req2.path) req2.path = getPathname(req2.url);
      if ((_a = this.settings) == null ? void 0 : _a.enableReqRoute) req2.route = mw2;
      await applyHandler(handler)(req2, res2, next2);
    };
    let idx = 0;
    const loop = () => res.writableEnded || idx < mw.length && handle(mw[idx++])(req, res, next);
    next = next || ((err) => err ? this.onError(err, req, res) : loop());
    loop();
  }
  /**
   * Creates HTTP server and dispatches middleware
   * @param port server listening port
   * @param Server callback after server starts listening
   * @param host server listening host
   */
  listen(port, cb, host) {
    return createServer().on("request", this.attach).listen(port, host, cb);
  }
}
export {
  App,
  View,
  extendMiddleware,
  getHostname,
  getIP,
  getIPs,
  getProtocol,
  getSubdomains,
  getURLParams2 as getURLParams,
  onErrorHandler,
  renderTemplate
};
//# sourceMappingURL=index.js.map
