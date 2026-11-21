/**
 * DEMO MODE ONLY. Used when the Python backend can't be reached.
 * The static checks mirror backend/app/url_checker.py and indicators.py, but the
 * score here is a simple keyword heuristic, NOT the machine-learning model.
 */
import type { AnalysisResult, AnalyzeRequest, Indicator, SenderReport, Severity, UrlReport, Warning } from './types'

const SHORTENERS = new Set(['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'cutt.ly', 'rebrand.ly', 'shorturl.at', 'tiny.cc', 'rb.gy', 't.ly'])
const RISKY_TLDS = new Set(['zip', 'mov', 'xyz', 'top', 'click', 'link', 'gq', 'tk', 'ml', 'cf', 'ga', 'work', 'rest', 'country', 'kim', 'support', 'loan', 'win', 'review'])
const BRANDS = ['paypal', 'microsoft', 'apple', 'google', 'amazon', 'netflix', 'facebook', 'instagram', 'outlook', 'office365', 'dropbox', 'docusign', 'chase', 'wellsfargo', 'bankofamerica', 'hbl', 'meezan', 'jazzcash', 'easypaisa', 'linkedin', 'whatsapp']
const LURES = ['login', 'signin', 'verify', 'account', 'secure', 'update', 'confirm', 'banking', 'password', 'wallet', 'unlock', 'billing']
const FREE_MAIL = new Set(['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com', 'aol.com', 'icloud.com', 'proton.me', 'protonmail.com', 'gmx.com', 'mail.com', 'yandex.com', 'zoho.com'])
const leet = (s: string) => s.replace(/0/g, 'o').replace(/1/g, 'l').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
const ind = (label: string, severity: Severity, detail: string): Indicator => ({ label, severity, detail })

export function registrableDomain(host: string) {
  const p = host.split('.')
  if (p.length >= 3 && p[p.length - 1].length === 2 && ['co', 'com', 'org', 'net', 'gov', 'edu', 'ac'].includes(p[p.length - 2])) return p.slice(-3).join('.')
  return p.slice(-2).join('.')
}

export function inspectUrlLocal(raw: string): UrlReport {
  const url = raw.trim().replace(/[.,;:!?]+$/, '')
  const toParse = /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : 'http://' + url
  const indicators: Indicator[] = []
  let u: URL
  try { u = new URL(toParse) } catch {
    return { url, host: '', scheme: '', indicators: [ind('Malformed URL', 'high', 'The URL could not be parsed.')], risk: 'high' }
  }
  const host = u.hostname.toLowerCase()
  const scheme = u.protocol.replace(':', '')
  if (scheme !== 'https') indicators.push(ind('No HTTPS', 'medium', 'The link is not encrypted. HTTPS alone does not make a site safe, but its absence is a warning sign for login or payment pages.'))
  if (/^[a-z]+:\/\/[^/]*@/i.test(toParse)) indicators.push(ind('@ symbol in address', 'high', "Text before '@' is ignored by browsers, a classic trick to disguise the real destination."))
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[')
  if (isIp) indicators.push(ind('IP address as host', 'high', 'Legitimate services almost always use a domain name, not a raw IP address.'))
  if (host.startsWith('xn--') || host.includes('.xn--')) indicators.push(ind('Internationalised (punycode) domain', 'high', 'May use look-alike characters from other alphabets to imitate a known domain.'))
  if (/[^\x00-\x7F]/.test(url)) indicators.push(ind('Non-ASCII characters', 'medium', 'Unicode characters can be used to imitate familiar domains.'))
  if (SHORTENERS.has(host)) indicators.push(ind('URL shortener', 'medium', 'The real destination is hidden behind a shortening service.'))
  const tld = host.includes('.') ? host.split('.').pop()! : ''
  if (RISKY_TLDS.has(tld)) indicators.push(ind(`Less common TLD (.${tld})`, 'low', 'This top-level domain is cheap to register and frequently seen in abuse reports.'))
  const dots = (host.match(/\./g) || []).length
  if (!isIp && dots >= 4) indicators.push(ind('Deep subdomain chain', 'medium', `${dots + 1} levels of subdomains can push the real domain out of view.`))
  if ((host.match(/-/g) || []).length >= 3) indicators.push(ind('Many hyphens in domain', 'low', 'Common in throwaway or imitation domains.'))
  if (url.length > 120) indicators.push(ind('Very long URL', 'low', `${url.length} characters; long URLs can hide the destination.`))
  if (u.port && !['80', '443'].includes(u.port)) indicators.push(ind(`Non-standard port (${u.port})`, 'medium', 'Unusual for public websites.'))
  const domain = isIp ? host : registrableDomain(host)
  if (!isIp && host) {
    const base = domain.split('.')[0]
    const norm = leet(host).replace(/[-.]/g, '')
    const brand = base !== '' && !BRANDS.includes(base) ? BRANDS.find(b => norm.includes(b)) : undefined
    if (brand) indicators.push(ind(`Possible '${brand}' look-alike`, 'high', `The domain mentions '${brand}' but is not that brand's main domain (${domain}).`))
  }
  const path = (u.pathname + u.search).toLowerCase()
  const lures = LURES.filter(w => path.includes(w) || host.includes(w))
  if (lures.length) indicators.push(ind('Credential-lure keywords', 'low', 'Contains: ' + lures.slice(0, 4).join(', ')))
  if (/\.(exe|scr|js|vbs|bat|apk|msi|iso|zip|rar)$/i.test(u.pathname)) indicators.push(ind('Links directly to a file', 'high', 'Downloads executables or archives.'))
  const sev = indicators.map(i => i.severity)
  const risk: Severity = sev.includes('high') || sev.filter(s => s === 'medium').length >= 2 ? 'high' : sev.includes('medium') ? 'medium' : 'low'
  return { url, host, scheme, domain, indicators, risk }
}

export function extractUrls(text: string) {
  const out: string[] = []
  for (const m of text.match(/(?:https?:\/\/|www\.)[^\s<>"'()\]]+/gi) || []) {
    const u = m.replace(/[.,;:!?]+$/, '')
    if (!out.some(x => x.toLowerCase() === u.toLowerCase())) out.push(u)
  }
  return out.slice(0, 25)
}

const RULES: { id: string; title: string; severity: Severity; category: string; re: RegExp; w: number }[] = [
  { id: 'urgency', title: 'Urgent or threatening language', severity: 'high', category: 'Language', w: 14, re: /\b(urgent(ly)?|immediately|act now|right away|within \d+ (hours?|days?)|expires? (today|soon)|expires? in \d+ (hours?|minutes?|days?)|final (notice|warning)|last chance|asap)\b/gi },
  { id: 'threat', title: 'Account threat or suspension', severity: 'high', category: 'Language', w: 14, re: /\b(suspend(ed)?|locked|deactivat(ed|ion)|terminat(ed|ion)|restricted|disabled|unauthori[sz]ed (access|activity)|unusual (sign[- ]?in|activity))\b/gi },
  { id: 'credentials', title: 'Requests credentials or sensitive data', severity: 'high', category: 'Request', w: 18, re: /\b((verify|confirm|update|enter|provide|submit|validate)\b.{0,40}\b(password|account|identity|credentials?|login|details|pin|cvv|card)|password|social security|one[- ]time (code|password)|otp)\b/gi },
  { id: 'financial', title: 'Financial or payment pressure', severity: 'medium', category: 'Request', w: 8, re: /\b(wire transfer|bank (details|account)|payment (failed|declined|overdue)|invoice|refund|billing|gift ?cards?|bitcoin|crypto)\b/gi },
  { id: 'reward', title: 'Prize, reward or too-good-to-be-true offer', severity: 'medium', category: 'Language', w: 14, re: /\b(congratulations|you('ve| have)? won|winner|prize|lottery|jackpot|free (money|gift|iphone)|claim (now|your)|inheritance)\b/gi },
  { id: 'generic_greeting', title: 'Generic greeting', severity: 'low', category: 'Language', w: 5, re: /\bdear (customer|user|member|valued|client|account ?holder|beneficiary)\b/gi },
  { id: 'click', title: 'Pushes you to click a link', severity: 'medium', category: 'Request', w: 9, re: /\b(click (here|below|the link)|follow the link|tap (here|below)|open the link|log ?in (here|now|below))\b/gi },
  { id: 'secrecy', title: 'Asks for secrecy or bypassing normal process', severity: 'medium', category: 'Language', w: 8, re: /\b(keep (this|it) (confidential|between us)|do not (tell|share|discuss)|don't tell)\b/gi },
  { id: 'attachment', title: 'Mentions an attachment', severity: 'medium', category: 'Attachment', w: 6, re: /\b(attached (file|invoice|document)|see attach(ed|ment)|open the attach(ed|ment))\b/gi },
]

function senderLocal(sender: string, urlDomains: string[]): SenderReport | null {
  if (!sender.trim()) return null
  const m = sender.match(/<([^>]+)>/)
  const address = (m ? m[1] : sender).trim().toLowerCase()
  const out: SenderReport = { address, display_name: m ? sender.slice(0, m.index).trim().replace(/"/g, '') || null : null, domain: null, indicators: [] }
  if (!/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(address)) { out.indicators.push(ind('Invalid address format', 'medium', 'This does not look like a normal email address.')); return out }
  const [local, domain] = address.split('@')
  out.domain = domain
  const brand = BRANDS.find(b => leet(local + domain).replace(/[-.]/g, '').includes(b))
  if (FREE_MAIL.has(domain)) {
    out.indicators.push(brand ? ind(`'${brand}' name on a free webmail account`, 'high', `Organisations like ${brand} do not send official mail from ${domain}.`) : ind('Free webmail sender', 'low', 'Fine for personal mail, unusual for banks, universities or companies.'))
  } else if (brand && registrableDomain(domain).split('.')[0] !== brand) {
    out.indicators.push(ind(`Possible '${brand}' look-alike domain`, 'high', `${domain} mentions ${brand} but is not its main domain.`))
  }
  if (/\d{3,}/.test(local) || local.length > 30) out.indicators.push(ind('Random-looking username', 'low', 'Long or number-heavy names are common in throwaway accounts.'))
  const foreign = [...new Set(urlDomains.filter(d => d && d !== registrableDomain(domain)))]
  if (foreign.length && !FREE_MAIL.has(domain)) out.indicators.push(ind('Links point to other domains', 'medium', `Sender is ${registrableDomain(domain)} but links go to ${foreign.slice(0, 3).join(', ')}.`))
  return out
}

export function analyzeDemo(req: AnalyzeRequest): AnalysisResult {
  const text = `${req.subject}\n${req.body}`
  const warnings: Warning[] = []
  let score = 8
  for (const r of RULES) {
    const ev = [...new Set((text.match(r.re) || []).map(s => s.trim()))]
    if (ev.length) { warnings.push({ id: r.id, title: r.title, severity: r.severity, category: r.category, evidence: ev.slice(0, 4) }); score += r.w + 4 * (ev.length - 1) }
  }
  const urls = extractUrls(text).map(inspectUrlLocal)
  score += urls.reduce((s, u) => s + (u.risk === 'high' ? 14 : u.risk === 'medium' ? 6 : 2), 0)
  const sender = senderLocal(req.sender, urls.map(u => u.domain || ''))
  score += (sender?.indicators || []).reduce((s, i) => s + (i.severity === 'high' ? 12 : i.severity === 'medium' ? 5 : 1), 0)
  score = Math.min(97, score)
  const isPhish = score >= 50
  const level = score >= 85 ? 'Critical' : score >= 65 ? 'High' : score >= 40 ? 'Medium' : 'Low'
  return {
    id: 'demo-' + Math.random().toString(36).slice(2, 10),
    timestamp: new Date().toISOString(),
    source: 'demo',
    classification: isPhish ? 'Potential Phishing' : 'Likely Legitimate',
    score,
    threat_level: level,
    engine: { key: 'demo', name: 'Demo heuristic (not the ML model)' },
    warnings, urls, sender, top_terms: [],
    explanation: `DEMO MODE: the backend is offline, so this score comes from a simple keyword heuristic in the browser, not the trained model. ${warnings.length ? 'It found ' + warnings.slice(0, 3).map(w => w.title.toLowerCase()).join('; ') + '.' : 'No rule-based warning signs were found.'} Connect the Python backend for a real model score.`,
    recommendations: [
      ...(isPhish || urls.length ? ["Don't click links in this email. Type the official website address yourself instead."] : []),
      'Never share passwords, OTP codes or card details over email.',
      'Verify the sender through a channel you already trust.',
      isPhish ? "Report it to your IT or security team, then delete it." : 'Stay cautious with any unexpected request.',
    ],
    comparison: [],
    saved: false,
  }
}
