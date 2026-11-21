"""Rule-based indicators, sender analysis and plain-language explanations.

These are heuristics that explain *why* an email looks suspicious. They are not
proof of phishing: legitimate mail can use urgent wording too.
"""

import re

from .url_checker import BRANDS, LEET, registrable_domain

FREE_MAIL = {"gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "live.com", "aol.com",
             "icloud.com", "proton.me", "protonmail.com", "gmx.com", "mail.com", "yandex.com", "zoho.com"}

RULES = [
    {"id": "urgency", "title": "Urgent or threatening language", "severity": "high", "category": "Language",
     "pattern": r"\b(urgent(ly)?|immediately|act now|right away|within \d+ (hours?|days?)|expires? (today|soon)|expires? in \d+ (hours?|minutes?|days?)|final (notice|warning)|last chance|asap)\b"},
    {"id": "threat", "title": "Account threat or suspension", "severity": "high", "category": "Language",
     "pattern": r"\b(suspend(ed)?|locked|deactivat(ed|ion)|terminat(ed|ion)|restricted|disabled|closed|unauthori[sz]ed (access|activity)|unusual (sign[- ]?in|activity))\b"},
    {"id": "credentials", "title": "Requests credentials or sensitive data", "severity": "high", "category": "Request",
     "pattern": r"\b((verify|confirm|update|enter|provide|submit|validate)\b.{0,40}\b(password|account|identity|credentials?|login|details|ssn|pin|cvv|card)|password|social security|one[- ]time (code|password)|otp)\b"},
    {"id": "financial", "title": "Financial or payment pressure", "severity": "medium", "category": "Request",
     "pattern": r"\b(wire transfer|bank (details|account)|payment (failed|declined|overdue)|invoice|refund|billing|gift ?cards?|bitcoin|crypto|western union)\b"},
    {"id": "reward", "title": "Prize, reward or too-good-to-be-true offer", "severity": "medium", "category": "Language",
     "pattern": r"\b(congratulations|you('ve| have)? won|winner|prize|lottery|jackpot|free (money|gift|iphone)|claim (now|your)|inheritance|selected to receive)\b"},
    {"id": "generic_greeting", "title": "Generic greeting", "severity": "low", "category": "Language",
     "pattern": r"\bdear (customer|user|member|valued|client|account ?holder|sir/madam|beneficiary)\b"},
    {"id": "click", "title": "Pushes you to click a link", "severity": "medium", "category": "Request",
     "pattern": r"\b(click (here|below|the link)|follow the link|tap (here|below)|open the link|log ?in (here|now|below))\b"},
    {"id": "attachment", "title": "Mentions an attachment", "severity": "medium", "category": "Attachment",
     "pattern": r"\b(attached (file|invoice|document)|see attach(ed|ment)|open the attach(ed|ment)|\.(zip|exe|scr|html?|iso|docm|xlsm)\b)"},
    {"id": "secrecy", "title": "Asks for secrecy or bypassing normal process", "severity": "medium", "category": "Language",
     "pattern": r"\b(keep (this|it) (confidential|between us)|do not (tell|share|discuss)|don't tell)\b"},
]


def scan_rules(text: str) -> list[dict]:
    found = []
    for rule in RULES:
        matches = {m.group(0).strip() for m in re.finditer(rule["pattern"], text, re.IGNORECASE)}
        if matches:
            found.append({"id": rule["id"], "title": rule["title"], "severity": rule["severity"],
                          "category": rule["category"], "evidence": sorted(matches, key=len)[:4]})
    return found


def analyse_sender(sender: str | None, url_domains: list[str]) -> dict | None:
    if not sender or not sender.strip():
        return None
    raw = sender.strip()
    m = re.search(r"<([^>]+)>", raw)
    display = raw[: m.start()].strip().strip('"') if m else ""
    address = (m.group(1) if m else raw).strip().lower()
    out = {"address": address, "display_name": display or None, "domain": None, "indicators": []}

    def add(label, severity, detail):
        out["indicators"].append({"label": label, "severity": severity, "detail": detail})

    if not re.fullmatch(r"[\w.+-]+@[\w-]+(\.[\w-]+)+", address):
        add("Invalid address format", "medium", "This does not look like a normal email address.")
        return out
    local, domain = address.split("@", 1)
    out["domain"] = domain
    norm = (local + domain).translate(LEET).replace("-", "").replace(".", "")
    brand = next((b for b in BRANDS if b in norm), None)
    if domain in FREE_MAIL:
        if brand:
            add(f"'{brand}' name on a free webmail account", "high",
                f"Organisations like {brand.title()} do not send official mail from {domain}.")
        else:
            add("Free webmail sender", "low", "Fine for personal mail, unusual for banks, universities or companies.")
    elif brand and registrable_domain(domain).split(".")[0] != brand:
        add(f"Possible '{brand}' look-alike domain", "high",
            f"{domain} mentions {brand} but is not its main domain.")
    if domain.startswith("xn--") or ".xn--" in domain:
        add("Punycode sender domain", "high", "May imitate a familiar domain with look-alike characters.")
    if re.search(r"\d{3,}", local) or len(local) > 30:
        add("Random-looking username", "low", "Long or number-heavy names are common in throwaway accounts.")
    if domain.count("-") >= 2 or domain.count(".") >= 3:
        add("Unusual domain structure", "low", "Many hyphens or subdomains.")
    if display and "@" in display and display.lower() != address:
        add("Display name shows a different address", "high",
            "The visible name contains an email address that differs from the real sender.")
    if url_domains:
        sender_root = registrable_domain(domain)
        foreign = sorted({d for d in url_domains if d and d != sender_root})
        if foreign and domain not in FREE_MAIL:
            add("Links point to other domains", "medium",
                "Sender is " + sender_root + " but links go to " + ", ".join(foreign[:3]) + ".")
    return out


SEV_W = {"high": 3, "medium": 2, "low": 1}


def threat_level(score: float, warnings: list[dict], urls: list[dict], sender: dict | None) -> str:
    """Combine model score (0-100) with the weight of static indicators."""
    weight = sum(SEV_W[w["severity"]] for w in warnings)
    weight += sum(3 for u in urls if u["risk"] == "high") + sum(1 for u in urls if u["risk"] == "medium")
    if sender:
        weight += sum(SEV_W[i["severity"]] for i in sender["indicators"] if i["severity"] != "low")
    if score >= 85 or (score >= 65 and weight >= 8):
        return "Critical"
    if score >= 65 or (score >= 45 and weight >= 6):
        return "High"
    if score >= 40 or weight >= 5:
        return "Medium"
    return "Low"


def build_explanation(is_phish: bool, score: float, warnings, urls, sender, top_terms) -> str:
    parts = []
    if is_phish:
        parts.append(f"The model gave this email a phishing score of {score:.0f}/100, above the 50-point decision threshold.")
    else:
        parts.append(f"The model gave this email a phishing score of {score:.0f}/100, below the 50-point decision threshold.")
    up = [t["term"] for t in top_terms if t["weight"] > 0][:5]
    down = [t["term"] for t in top_terms if t["weight"] < 0][:4]
    if is_phish and up:
        parts.append("Words that pushed the score up: " + ", ".join(f"“{t}”" for t in up) + ".")
    elif not is_phish and down:
        parts.append("Words typical of legitimate mail: " + ", ".join(f"“{t}”" for t in down) + ".")
    if warnings:
        names = [w["title"].lower() for w in warnings[:3]]
        parts.append("Rule checks also found " + "; ".join(names) + ".")
    risky = [u for u in urls if u["risk"] == "high"]
    if risky:
        parts.append(f"{len(risky)} link(s) have high-risk structure, such as a look-alike domain or raw IP address.")
    if sender and any(i["severity"] == "high" for i in sender["indicators"]):
        parts.append("The sender address has a high-risk warning.")
    if not is_phish and (warnings or risky):
        parts.append("Even though the overall classification is legitimate, the warnings above are worth checking before you act.")
    if not is_phish and not warnings and not risky:
        parts.append("No rule-based warning signs were found. That lowers risk, but it does not guarantee the email is safe.")
    return " ".join(parts)


def recommendations(is_phish: bool, warnings, urls, sender) -> list[str]:
    recs = []
    ids = {w["id"] for w in warnings}
    if is_phish or urls:
        recs.append("Don't click links in this email. Type the official website address yourself instead.")
    if "credentials" in ids or is_phish:
        recs.append("Never share passwords, OTP codes or card details over email. Real organisations don't ask for them this way.")
    if sender:
        recs.append("Verify the sender through a channel you already trust, such as the official phone number or website.")
    if "attachment" in ids:
        recs.append("Don't open unexpected attachments, especially .zip, .html or macro-enabled Office files.")
    if is_phish:
        recs.append("Report it to your IT or security team (or the platform's 'Report phishing' option), then delete it.")
    else:
        recs.append("Stay cautious with any unexpected request, even from a sender that looks familiar.")
    return recs
