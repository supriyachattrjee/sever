const ENCODE_URL_ATTR_CHAR_REGEXP = /[\x00-\x20"'()*,/:;<=>?@[\\\]{}\x7f]/g;
const HEX_ESCAPE_REGEXP = /%[0-9A-Fa-f]{2}/;
const HEX_ESCAPE_REPLACE_REGEXP = /%([0-9A-Fa-f]{2})/g;
const NON_LATIN1_REGEXP = /[^\x20-\x7e\xa0-\xff]/g;
const QESC_REGEXP = /\\([\u0000-\u007f])/g;
const QUOTE_REGEXP = /([\\"])/g;
const PARAM_REGEXP = (
  // biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
  /;[\x09\x20]*([!#$%&'*+.0-9A-Z^_`a-z|~-]+)[\x09\x20]*=[\x09\x20]*("(?:[\x20!\x23-\x5b\x5d-\x7e\x80-\xff]|\\[\x20-\x7e])*"|[!#$%&'*+.0-9A-Z^_`a-z|~-]+)[\x09\x20]*/g
);
const TEXT_REGEXP = /^[\x20-\x7e\x80-\xff]+$/;
const TOKEN_REGEXP = /^[!#$%&'*+.0-9A-Z^_`a-z|~-]+$/;
const EXT_VALUE_REGEXP = /^([A-Za-z0-9!#$%&+\-^_`{}~]+)'(?:[A-Za-z]{2,3}(?:-[A-Za-z]{3}){0,3}|[A-Za-z]{4,8}|)'((?:%[0-9A-Fa-f]{2}|[A-Za-z0-9!#$&+.^_`|~-])+)$/;
const DISPOSITION_TYPE_REGEXP = /^([!#$%&'*+.0-9A-Z^_`a-z|~-]+)[\x09\x20]*(?:$|;)/;
const getlatin1 = (val) => {
  return String(val).replace(NON_LATIN1_REGEXP, "?");
};
class ContentDisposition {
  constructor(type, parameters) {
    this.type = type;
    this.parameters = parameters;
  }
}
const qstring = (val) => `"${String(val).replace(QUOTE_REGEXP, "\\$1")}"`;
const pencode = (char) => `%${String(char).charCodeAt(0).toString(16).toUpperCase()}`;
function ustring(val) {
  const str = String(val);
  const encoded = encodeURIComponent(str).replace(ENCODE_URL_ATTR_CHAR_REGEXP, pencode);
  return `UTF-8''${encoded}`;
}
const basename = (str) => str.slice(str.lastIndexOf("/") + 1);
function format({
  parameters,
  type
}) {
  if (!type || typeof type !== "string" || !TOKEN_REGEXP.test(type)) {
    throw new TypeError("invalid type");
  }
  let string = String(type).toLowerCase();
  if (parameters && typeof parameters === "object") {
    const params = Object.keys(parameters).sort();
    for (const param of params) {
      const val = param.slice(-1) === "*" ? ustring(parameters[param]) : qstring(parameters[param]);
      string += `; ${param}=${val}`;
    }
  }
  return string;
}
function createParams(filename, fallback) {
  if (filename === void 0) return;
  const params = {};
  if (!fallback) fallback = true;
  if (typeof fallback === "string" && NON_LATIN1_REGEXP.test(fallback)) {
    throw new TypeError("fallback must be ISO-8859-1 string");
  }
  const name = basename(filename);
  const isQuotedString = TEXT_REGEXP.test(name);
  const fallbackName = typeof fallback !== "string" ? fallback && getlatin1(name) : basename(fallback);
  const hasFallback = typeof fallbackName === "string" && fallbackName !== name;
  if (hasFallback || !isQuotedString || HEX_ESCAPE_REGEXP.test(name)) {
    params["filename*"] = name;
  }
  if (isQuotedString || hasFallback) {
    params.filename = hasFallback ? fallbackName : name;
  }
  return params;
}
const pdecode = (_str, hex) => String.fromCharCode(Number.parseInt(hex, 16));
function contentDisposition(filename, options = {}) {
  return format(new ContentDisposition(options.type || "attachment", createParams(filename, options.fallback)));
}
function decodefield(str) {
  const match = EXT_VALUE_REGEXP.exec(str);
  if (!match) throw new TypeError("invalid extended field value");
  const charset = match[1].toLowerCase();
  const encoded = match[2];
  let value;
  switch (charset) {
    case "iso-8859-1":
      value = getlatin1(encoded.replace(HEX_ESCAPE_REPLACE_REGEXP, pdecode));
      break;
    case "utf-8":
      try {
        value = decodeURIComponent(encoded);
      } catch {
        throw new TypeError("invalid encoded utf-8");
      }
      break;
    default:
      throw new TypeError("unsupported charset in extended field");
  }
  return value;
}
function parse(header) {
  let match = DISPOSITION_TYPE_REGEXP.exec(header);
  if (!match) throw new TypeError("invalid type format");
  let index = match[0].length;
  const type = match[1].toLowerCase();
  let key;
  const names = [];
  const params = {};
  let value;
  index = PARAM_REGEXP.lastIndex = match[0].slice(-1) === ";" ? index - 1 : index;
  while (match = PARAM_REGEXP.exec(header)) {
    if (match.index !== index) throw new TypeError("invalid parameter format");
    index += match[0].length;
    key = match[1].toLowerCase();
    value = match[2];
    if (names.indexOf(key) !== -1) {
      throw new TypeError("invalid duplicate parameter");
    }
    names.push(key);
    if (key.indexOf("*") + 1 === key.length) {
      key = key.slice(0, -1);
      value = decodefield(value);
      params[key] = value;
      continue;
    }
    if (typeof params[key] === "string") continue;
    if (value[0] === '"') {
      value = value.slice(1, value.length - 1).replace(QESC_REGEXP, "$1");
    }
    params[key] = value;
  }
  if (index !== -1 && index !== header.length) {
    throw new TypeError("invalid parameter format");
  }
  return new ContentDisposition(type, params);
}
export {
  ContentDisposition,
  contentDisposition,
  parse
};
//# sourceMappingURL=index.js.map
