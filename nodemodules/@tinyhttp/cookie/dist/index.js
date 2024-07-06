const pairSplitRegExp = /; */;
const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
function tryDecode(str, decode) {
  try {
    return decode(str);
  } catch (e) {
    return str;
  }
}
function parse(str, options = {
  decode: decodeURIComponent
}) {
  const obj = {};
  const pairs = str.split(pairSplitRegExp);
  for (const pair of pairs) {
    let eqIdx = pair.indexOf("=");
    if (eqIdx < 0) continue;
    const key = pair.slice(0, eqIdx).trim();
    let val = pair.slice(++eqIdx, pair.length).trim();
    if ('"' === val[0]) val = val.slice(1, -1);
    if (obj[key] == null) obj[key] = tryDecode(val, options.decode);
  }
  return obj;
}
function serialize(name, val, opt = {}) {
  if (!opt.encode) opt.encode = encodeURIComponent;
  if (!fieldContentRegExp.test(name)) throw new TypeError("argument name is invalid");
  const value = opt.encode(val);
  if (value && !fieldContentRegExp.test(value)) throw new TypeError("argument val is invalid");
  let str = `${name}=${value}`;
  if (null != opt.maxAge) {
    const maxAge = opt.maxAge - 0;
    if (Number.isNaN(maxAge) || !Number.isFinite(maxAge)) throw new TypeError("option maxAge is invalid");
    str += `; Max-Age=${Math.floor(maxAge)}`;
  }
  if (opt.domain) {
    if (!fieldContentRegExp.test(opt.domain)) throw new TypeError("option domain is invalid");
    str += `; Domain=${opt.domain}`;
  }
  if (opt.path) {
    if (!fieldContentRegExp.test(opt.path)) throw new TypeError("option path is invalid");
    str += `; Path=${opt.path}`;
  }
  if (opt.expires) str += `; Expires=${opt.expires.toUTCString()}`;
  if (opt.httpOnly) str += "; HttpOnly";
  if (opt.secure) str += "; Secure";
  if (opt.sameSite) {
    const sameSite = typeof opt.sameSite === "string" ? opt.sameSite.toLowerCase() : opt.sameSite;
    switch (sameSite) {
      case true:
      case "strict":
        str += "; SameSite=Strict";
        break;
      case "lax":
        str += "; SameSite=Lax";
        break;
      case "none":
        str += "; SameSite=None";
        break;
      default:
        throw new TypeError("option sameSite is invalid");
    }
  }
  return str;
}
export {
  parse,
  serialize
};
//# sourceMappingURL=index.js.map
