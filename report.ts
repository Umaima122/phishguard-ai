import type { AnalysisResult } from './types'

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const sevColor = { high: '#dc2626', medium: '#d97706', low: '#64748b' }

/** Self-contained, printable HTML report. URLs are shown as text, never as clickable links. */
export function buildReportHtml(r: AnalysisResult, meta: { subject: string; sender: string }) {
  const phish = r.classification === 'Potential Phishing'
  const accent = phish ? '#dc2626' : '#059669'
  const list = (items: string[]) => items.map(i => `<li>${esc(i)}</li>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>PhishGuard AI report ${esc(r.id)}</title>
<style>body{font:14px/1.6 system-ui,sans-serif;color:#0f172a;max-width:820px;margin:40px auto;padding:0 24px}
h1{font-size:22px;margin:0}h2{font-size:15px;margin:28px 0 8px;text-transform:uppercase;letter-spacing:.06em;color:#475569}
.top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #0f172a;padding-bottom:12px}
.verdict{border-left:5px solid ${accent};background:#f8fafc;padding:14px 18px;margin-top:20px}
.verdict b{color:${accent};font-size:18px}.mono{font-family:ui-monospace,Menlo,monospace;font-size:12px;word-break:break-all}
table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #e2e8f0;padding:6px 8px;text-align:left;vertical-align:top}
.sev{font-size:11px;font-weight:600;text-transform:uppercase}.demo{background:#fef3c7;border:1px solid #f59e0b;padding:8px 12px;margin-top:16px}
.muted{color:#64748b;font-size:12px}@media print{body{margin:0}}</style></head><body>
<div class="top"><div><div class="muted">PhishGuard AI · Email security report</div><h1>${esc(meta.subject || '(no subject)')}</h1>
<div class="mono">${esc(meta.sender || 'Sender not provided')}</div></div><div class="muted">${new Date(r.timestamp).toLocaleString()}<br>ID ${esc(r.id)}</div></div>
${r.source === 'demo' ? '<div class="demo"><b>DEMO MODE.</b> This report was produced by a browser heuristic, not the trained machine-learning model.</div>' : ''}
<div class="verdict"><b>${esc(r.classification)}</b> · Threat level: <b>${esc(r.threat_level)}</b><br>
Model score: <b>${r.score.toFixed(1)}/100</b> (${esc(r.engine.name)}). This is a model estimate, not a guaranteed probability.</div>
<h2>Explanation</h2><p>${esc(r.explanation)}</p>
${r.comparison.length ? `<h2>Model comparison</h2><table><tr><th>Engine</th><th>Score</th><th>Classification</th></tr>${r.comparison.map(c => `<tr><td>${esc(c.name)}</td><td>${c.score == null ? '—' : c.score.toFixed(1)}</td><td>${esc(c.classification ?? c.status ?? '')}</td></tr>`).join('')}</table>` : ''}
<h2>Warning indicators (${r.warnings.length})</h2>${r.warnings.length ? `<table>${r.warnings.map(w => `<tr><td class="sev" style="color:${sevColor[w.severity]}">${w.severity}</td><td><b>${esc(w.title)}</b><div class="muted">Evidence: ${esc(w.evidence.join(', '))}</div></td></tr>`).join('')}</table>` : '<p>None found.</p>'}
<h2>Extracted URLs (${r.urls.length})</h2>${r.urls.length ? `<table>${r.urls.map(u => `<tr><td class="sev" style="color:${sevColor[u.risk]}">${u.risk}</td><td><div class="mono">${esc(u.url)}</div><div class="muted">${esc(u.indicators.map(i => i.label).join(' · ') || 'No static indicators')}</div></td></tr>`).join('')}</table>` : '<p>No URLs detected.</p>'}
${r.sender ? `<h2>Sender analysis</h2><p class="mono">${esc(r.sender.address)}</p>${r.sender.indicators.length ? `<ul>${list(r.sender.indicators.map(i => `[${i.severity}] ${i.label}: ${i.detail}`))}</ul>` : '<p>No sender warnings.</p>'}` : ''}
<h2>Recommended actions</h2><ul>${list(r.recommendations)}</ul>
<p class="muted" style="margin-top:32px">Static checks never visit links. Automated analysis can be wrong; use it alongside your own judgement and your organisation's reporting process.</p>
</body></html>`
}

export function downloadReport(r: AnalysisResult, meta: { subject: string; sender: string }) {
  const blob = new Blob([buildReportHtml(r, meta)], { type: 'text/html' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `phishguard-report-${r.id}.html`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
