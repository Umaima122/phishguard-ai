"""Static URL inspection. Never fetches or opens a URL; it only parses the string."""

import ipaddress
import re
from urllib.parse import urlsplit

URL_RE = re.compile(r"""(?:https?://|www\.)[^\s<>"'()\]]+""", re.IGNORECASE)

SHORTENERS = {"bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
              "cutt.ly", "rebrand.ly", "shorturl.at", "tiny.cc", "rb.gy", "t.ly"}
# TLDs that are cheap/frequently abused. Flagged as "less common", never as proof.
RISKY_TLDS = {"zip", "mov", "xyz", "top", "click", "link", "gq", "tk", "ml", "cf", "ga",
              "work", "rest", "country", "kim", "support", "loan", "win", "review"}
BRANDS = ["paypal", "microsoft", "apple", "google", "amazon", "netflix", "facebook",
          "instagram", "outlook", "office365", "dropbox", "docusign", "chase", "wellsfargo",
          "bankofamerica", "hbl", "meezan", "jazzcash", "easypaisa", "linkedin", "whatsapp"]
LURE_WORDS = ["login", "signin", "verify", "account", "secure", "update", "confirm",
              "banking", "password", "wallet", "unlock", "billing"]
LEET = str.maketrans({"0": "o", "1": "l", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a"})


def _ind(label, severity, detail):
    return {"label": label, "severity": severity, "detail": detail}


def registrable_domain(host: str) -> str:
    parts = host.split(".")
    if len(parts) >= 3 and len(parts[-1]) == 2 and parts[-2] in {"co", "com", "org", "net", "gov", "edu", "ac"}:
        return ".".join(parts[-3:])
    return ".".join(parts[-2:])


def brand_lookalike(host: str):
    """Return brand name if the host imitates a brand without being that brand's domain."""
    base = registrable_domain(host).split(".")[0]
    normalised = host.translate(LEET)
    for brand in BRANDS:
        if base == brand:
            return None  # the real brand's own domain (best effort)
        if brand in normalised.replace("-", "").replace(".", ""):
            return brand
    return None


def inspect_url(raw: str) -> dict:
    url = raw.strip().rstrip(".,;:!?")
    to_parse = url if re.match(r"^[a-z][a-z0-9+.-]*://", url, re.I) else "http://" + url
    indicators = []
    try:
        parts = urlsplit(to_parse)
        host = (parts.hostname or "").lower()
    except ValueError:
        return {"url": url, "host": "", "scheme": "", "indicators": [
            _ind("Malformed URL", "high", "The URL could not be parsed.")], "risk": "high"}

    scheme = parts.scheme.lower()
    if scheme != "https":
        indicators.append(_ind("No HTTPS", "medium",
                               "The link is not encrypted. HTTPS alone does not make a site safe, but its absence is a warning sign for login or payment pages."))
    if "@" in parts.netloc:
        indicators.append(_ind("@ symbol in address", "high",
                               "Text before '@' is ignored by browsers, a classic trick to disguise the real destination."))
    is_ip = False
    try:
        ipaddress.ip_address(host.strip("[]"))
        is_ip = True
    except ValueError:
        pass
    if is_ip:
        indicators.append(_ind("IP address as host", "high",
                               "Legitimate services almost always use a domain name, not a raw IP address."))
    if host.startswith("xn--") or ".xn--" in host:
        indicators.append(_ind("Internationalised (punycode) domain", "high",
                               "May use look-alike characters from other alphabets to imitate a known domain."))
    if any(ord(c) > 127 for c in url):
        indicators.append(_ind("Non-ASCII characters", "medium",
                               "Unicode characters can be used to imitate familiar domains."))
    if host in SHORTENERS:
        indicators.append(_ind("URL shortener", "medium",
                               "The real destination is hidden behind a shortening service."))
    tld = host.rsplit(".", 1)[-1] if "." in host else ""
    if tld in RISKY_TLDS:
        indicators.append(_ind(f"Less common TLD (.{tld})", "low",
                               "This top-level domain is cheap to register and frequently seen in abuse reports."))
    if not is_ip and host.count(".") >= 4:
        indicators.append(_ind("Deep subdomain chain", "medium",
                               f"{host.count('.') + 1} levels of subdomains can push the real domain out of view."))
    if host.count("-") >= 3:
        indicators.append(_ind("Many hyphens in domain", "low", "Common in throwaway or imitation domains."))
    if len(url) > 120:
        indicators.append(_ind("Very long URL", "low", f"{len(url)} characters; long URLs can hide the destination."))
    if parts.port and parts.port not in (80, 443):
        indicators.append(_ind(f"Non-standard port ({parts.port})", "medium", "Unusual for public websites."))
    if not is_ip and host:
        brand = brand_lookalike(host)
        if brand:
            indicators.append(_ind(f"Possible '{brand}' look-alike", "high",
                                   f"The domain mentions '{brand}' but is not that brand's main domain ({registrable_domain(host)})."))
    path = (parts.path + "?" + parts.query).lower()
    lures = [w for w in LURE_WORDS if w in path or w in host]
    if lures:
        indicators.append(_ind("Credential-lure keywords", "low", "Contains: " + ", ".join(lures[:4])))
    if re.search(r"\.(exe|scr|js|vbs|bat|apk|msi|iso|zip|rar)(\?|$)", parts.path, re.I):
        indicators.append(_ind("Links directly to a file", "high", "Downloads executables or archives."))

    sev = [i["severity"] for i in indicators]
    risk = "high" if "high" in sev or sev.count("medium") >= 2 else "medium" if "medium" in sev else "low"
    return {"url": url, "host": host, "scheme": scheme, "domain": registrable_domain(host) if host and not is_ip else host,
            "indicators": indicators, "risk": risk}


def extract_urls(text: str) -> list[str]:
    seen, out = set(), []
    for m in URL_RE.findall(text or ""):
        u = m.rstrip(".,;:!?")
        if u.lower() not in seen:
            seen.add(u.lower())
            out.append(u)
    return out[:25]
