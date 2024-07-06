import * as typer from "@tinyhttp/content-type";
import mime from "mime";
function normalizeType(value) {
  const type = typer.parse(value);
  type.parameters = {};
  return typer.format(type);
}
function tryNormalizeType(value) {
  if (!value) return null;
  try {
    return normalizeType(value);
  } catch (err) {
    return null;
  }
}
function mimeMatch(expected, actual) {
  if (expected === false) return false;
  const actualParts = actual.split("/");
  const expectedParts = expected.split("/");
  if (actualParts.length !== 2 || expectedParts.length !== 2) return false;
  if (expectedParts[0] !== "*" && expectedParts[0] !== actualParts[0]) return false;
  if (expectedParts[1].slice(0, 2) === "*+")
    return expectedParts[1].length <= actualParts[1].length + 1 && expectedParts[1].slice(1) === actualParts[1].slice(1 - expectedParts[1].length);
  if (expectedParts[1] !== "*" && expectedParts[1] !== actualParts[1]) return false;
  return true;
}
function normalize(type) {
  if (typeof type !== "string") return false;
  switch (type) {
    case "urlencoded":
      return "application/x-www-form-urlencoded";
    case "multipart":
      return "multipart/*";
  }
  if (type[0] === "+") return `*/*${type}`;
  return type.indexOf("/") === -1 ? mime.getType(type) : type;
}
const typeIs = (value, ...types) => {
  let i;
  const val = tryNormalizeType(value);
  if (!val) return false;
  if (!types || !types.length) return val;
  let type;
  for (i = 0; i < types.length; i++) {
    if (mimeMatch(normalize(type = types[i]), val)) {
      return type[0] === "+" || type.indexOf("*") !== -1 ? val : type;
    }
  }
  return false;
};
export {
  typeIs
};
//# sourceMappingURL=index.js.map
