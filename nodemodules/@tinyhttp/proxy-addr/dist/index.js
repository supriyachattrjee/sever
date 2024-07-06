import { forwarded } from "@tinyhttp/forwarded";
import ipaddr from "ipaddr.js";
const DIGIT_REGEXP = /^[0-9]+$/;
const isip = ipaddr.isValid;
const parseip = ipaddr.parse;
const IP_RANGES = {
  linklocal: ["169.254.0.0/16", "fe80::/10"],
  loopback: ["127.0.0.1/8", "::1/128"],
  uniquelocal: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "fc00::/7"]
};
const trustNone = () => false;
function alladdrs(req, trust) {
  const addrs = forwarded(req);
  if (!trust) return addrs;
  if (typeof trust !== "function") trust = compile(trust);
  for (let i = 0; i < addrs.length - 1; i++) {
    if (trust(addrs[i], i)) continue;
    addrs.length = i + 1;
  }
  return addrs;
}
function compile(val) {
  let trust;
  if (typeof val === "string") trust = [val];
  else if (Array.isArray(val)) trust = val.slice();
  else throw new TypeError("unsupported trust argument");
  for (let i = 0; i < trust.length; i++) {
    val = trust[i];
    if (!Object.prototype.hasOwnProperty.call(IP_RANGES, val)) continue;
    val = IP_RANGES[val];
    trust.splice.apply(trust, [i, 1].concat(val));
    i += val.length - 1;
  }
  return compileTrust(compileRangeSubnets(trust));
}
function compileRangeSubnets(arr) {
  const rangeSubnets = new Array(arr.length);
  for (let i = 0; i < arr.length; i++) rangeSubnets[i] = parseIPNotation(arr[i]);
  return rangeSubnets;
}
function compileTrust(rangeSubnets) {
  const len = rangeSubnets.length;
  return len === 0 ? trustNone : len === 1 ? trustSingle(rangeSubnets[0]) : trustMulti(rangeSubnets);
}
function parseIPNotation(note) {
  const pos = note.lastIndexOf("/");
  const str = pos !== -1 ? note.substring(0, pos) : note;
  if (!isip(str)) throw new TypeError(`invalid IP address: ${str}`);
  let ip = parseip(str);
  if (pos === -1 && ip.kind() === "ipv6") {
    ip = ip;
    if (ip.isIPv4MappedAddress()) ip = ip.toIPv4Address();
  }
  const max = ip.kind() === "ipv6" ? 128 : 32;
  let range = pos !== -1 ? note.substring(pos + 1, note.length) : null;
  if (range === null) range = max;
  else if (DIGIT_REGEXP.test(range)) range = Number.parseInt(range, 10);
  else if (ip.kind() === "ipv4" && isip(range)) range = parseNetmask(range);
  else range = null;
  if (typeof range === "number" && (range <= 0 || range > max)) throw new TypeError(`invalid range on address: ${note}`);
  return [ip, range];
}
function parseNetmask(netmask) {
  const ip = parseip(netmask);
  return ip.kind() === "ipv4" ? ip.prefixLengthFromSubnetMask() : null;
}
function proxyaddr(req, trust) {
  const addrs = alladdrs(req, trust);
  return addrs[addrs.length - 1];
}
function trustMulti(subnets) {
  return function trust(addr) {
    if (!isip(addr)) return false;
    const ip = parseip(addr);
    let ipconv;
    const kind = ip.kind();
    for (let i = 0; i < subnets.length; i++) {
      const subnet = subnets[i];
      const subnetip = subnet[0];
      const subnetkind = subnetip.kind();
      const subnetrange = subnet[1];
      let trusted = ip;
      if (kind !== subnetkind) {
        if (subnetkind === "ipv4" && !ip.isIPv4MappedAddress()) continue;
        if (!ipconv) ipconv = subnetkind === "ipv4" ? ip.toIPv4Address() : ip.toIPv4MappedAddress();
        trusted = ipconv;
      }
      if (trusted.match(subnetip, subnetrange)) return true;
    }
    return false;
  };
}
function trustSingle(subnet) {
  const subnetip = subnet[0];
  const subnetkind = subnetip.kind();
  const subnetisipv4 = subnetkind === "ipv4";
  const subnetrange = subnet[1];
  return function trust(addr) {
    if (!isip(addr)) return false;
    let ip = parseip(addr);
    const kind = ip.kind();
    if (kind !== subnetkind) {
      if (subnetisipv4 && !ip.isIPv4MappedAddress()) return false;
      ip = subnetisipv4 ? ip.toIPv4Address() : ip.toIPv4MappedAddress();
    }
    return ip.match(subnetip, subnetrange);
  };
}
export {
  alladdrs as all,
  compile,
  parseIPNotation,
  proxyaddr
};
//# sourceMappingURL=index.js.map
