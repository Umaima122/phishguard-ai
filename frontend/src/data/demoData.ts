import type { HistoryItem, Stats } from '../lib/types'

/** DEMO DATA: shown only when the backend is offline. Never presented as real results. */
const day = (offset: number, h = 10) => {
  const d = new Date(); d.setDate(d.getDate() - offset); d.setHours(h, (offset * 17) % 60, 0, 0); return d.toISOString()
}

export const demoHistory: HistoryItem[] = [
  { id: 'demo-a1', created_at: day(0, 9), subject: 'URGENT: Your account has been suspended', sender: 'security-alert@meezan-verify-online.xyz', preview: 'Dear Customer, We detected unusual activity on your online banking account…', classification: 'Potential Phishing', score: 96.1, threat_level: 'Critical', engine: 'demo', url_count: 1, warning_count: 5 },
  { id: 'demo-a2', created_at: day(0, 8), subject: 'Discrete Maths: lecture moved', sender: 'sana.khan@au.edu.pk', preview: "Hi everyone, Thursday's lecture on sorting algorithms will be held in Room 204…", classification: 'Likely Legitimate', score: 6.4, threat_level: 'Low', engine: 'demo', url_count: 0, warning_count: 0 },
  { id: 'demo-a3', created_at: day(1, 15), subject: 'Congratulations! You have won', sender: 'winner@promo-rewards.top', preview: 'Congratulations!! You have been selected as our lucky winner this week…', classification: 'Potential Phishing', score: 91.7, threat_level: 'Critical', engine: 'demo', url_count: 1, warning_count: 4 },
  { id: 'demo-a4', created_at: day(1, 11), subject: 'Overdue invoice #INV-20931', sender: 'billing@docusign-files.support', preview: 'Please see the attached invoice. Payment is overdue and late fees apply…', classification: 'Potential Phishing', score: 78.2, threat_level: 'High', engine: 'demo', url_count: 0, warning_count: 3 },
  { id: 'demo-a5', created_at: day(2, 14), subject: 'New sign-in to your account', sender: 'no-reply@accounts.google.com', preview: 'A new sign-in was detected on a Windows device. If this was you…', classification: 'Likely Legitimate', score: 31.5, threat_level: 'Low', engine: 'demo', url_count: 0, warning_count: 1 },
  { id: 'demo-a6', created_at: day(3, 10), subject: 'Re: semester project meeting notes', sender: 'hamza.ali@students.au.edu.pk', preview: 'Hey team, Thanks for joining today. Quick recap…', classification: 'Likely Legitimate', score: 4.9, threat_level: 'Low', engine: 'demo', url_count: 0, warning_count: 0 },
  { id: 'demo-a7', created_at: day(4, 16), subject: 'Password expires today', sender: 'it.helpdesk.au2026@gmail.com', preview: 'Your university portal password expires today. To avoid losing access…', classification: 'Potential Phishing', score: 63.0, threat_level: 'Medium', engine: 'demo', url_count: 1, warning_count: 3 },
  { id: 'demo-a8', created_at: day(5, 12), subject: 'Library book due reminder', sender: 'library@au.edu.pk', preview: 'This is a reminder that your borrowed item is due back on Monday…', classification: 'Likely Legitimate', score: 12.2, threat_level: 'Low', engine: 'demo', url_count: 0, warning_count: 0 },
]

export const demoStats: Stats = {
  total: 128, phishing: 47, legitimate: 81, urls_inspected: 96,
  by_level: { Critical: 18, High: 15, Medium: 14, Low: 81 },
  daily: Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i))
    return { date: d.toISOString().slice(0, 10), phishing: [2, 4, 3, 5, 2, 6, 3, 4, 2, 5, 3, 4, 2, 2][i], legitimate: [5, 6, 7, 4, 8, 5, 6, 7, 5, 6, 4, 7, 5, 6][i] }
  }),
  top_warnings: [
    { title: 'Urgent or threatening language', count: 34 }, { title: 'Requests credentials or sensitive data', count: 29 },
    { title: 'Pushes you to click a link', count: 25 }, { title: 'Account threat or suspension', count: 21 },
    { title: 'Generic greeting', count: 17 }, { title: 'Prize, reward or too-good-to-be-true offer', count: 9 },
  ],
}
