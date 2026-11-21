export interface Lesson { id: string; title: string; summary: string; points: string[]; example: string }
export interface QuizQ { id: string; scenario: string; question: string; options: string[]; correct: number; explanation: string }

export const lessons: Lesson[] = [
  { id: 'urgency', title: 'Pressure and urgency', summary: 'Attackers rush you so you skip the step where you think.',
    points: ['Deadlines like "within 24 hours" or "expires today"', 'Threats of suspension, fines or account closure', 'Requests to keep things secret or skip normal process'],
    example: '“Your account will be permanently closed unless you verify immediately.”' },
  { id: 'links', title: 'Links that lie', summary: 'The text you see and the place a link goes can be completely different.',
    points: ['Hover (or long-press) to preview the real address before clicking', 'Look-alike domains: paypa1.com, micros0ft-support.net', 'Raw IP addresses, shorteners and odd TLDs like .xyz or .top'],
    example: 'Display text: “www.hbl.com”. Real link: http://hbl-secure-login.top/verify' },
  { id: 'sender', title: 'Who really sent it?', summary: 'Display names are free to fake. The address after the @ matters.',
    points: ['Banks and universities don’t email from gmail.com or yahoo.com', 'Check for extra words or hyphens in the domain', 'Reply-to addresses that differ from the sender'],
    example: '“University IT” <it.helpdesk.au2026@gmail.com>' },
  { id: 'data', title: 'Requests for secrets', summary: 'No legitimate organisation asks for your password or OTP over email.',
    points: ['Passwords, PINs, CVV codes and one-time codes are never requested by email', '“Confirm your details” forms are a common harvesting trick', 'When unsure, go to the official site or app yourself'],
    example: '“Reply with your login and the 6-digit code we just sent you.”' },
  { id: 'attachments', title: 'Dangerous attachments', summary: 'Files can install malware or open fake login pages.',
    points: ['Be wary of .zip, .html, .iso and macro-enabled Office files', 'Unexpected invoices and “scanned documents” are classic lures', 'Opening an HTML attachment can show a perfect fake sign-in page'],
    example: '“Invoice_20931.html — open to view your document”' },
]

export const quiz: QuizQ[] = [
  { id: 'q1', scenario: 'An email says your university account will be suspended unless you verify your password immediately.',
    question: 'What should you do?', options: ['Click the link immediately', 'Reply with your password', "Verify through the university's official website", 'Forward your password to IT'],
    correct: 2, explanation: 'Go to the official portal yourself, by typing the address or using a bookmark. Universities never need your password by email, and the urgency is the warning sign.' },
  { id: 'q2', scenario: 'You get a message from “HBL Support” <hbl.support.desk@gmail.com> about a failed payment.',
    question: 'What is the biggest red flag?', options: ['It mentions a payment', 'A bank is using a free Gmail address', 'It was sent in the morning', 'It uses the bank’s name'],
    correct: 1, explanation: 'Banks send from their own domains. A free webmail address claiming to be a bank is a strong sign of impersonation.' },
  { id: 'q3', scenario: 'A link shows as “www.paypal.com” but hovering reveals http://paypa1-account-secure.xyz/login.',
    question: 'Which statement is true?', options: ['It is safe because the text says paypal.com', 'It is safe if the page has a padlock', 'The real destination is a look-alike domain, so don’t click it', 'It is fine on mobile'],
    correct: 2, explanation: 'Link text can say anything. The real domain swaps “l” for “1” and uses .xyz. A padlock (HTTPS) only means the connection is encrypted, not that the site is honest.' },
  { id: 'q4', scenario: 'A colleague emails: “Can you buy 5 gift cards for a client? Keep this between us, I’m in a meeting.”',
    question: 'Best response?', options: ['Buy them quickly to help', 'Reply asking which cards', 'Confirm with them through a different channel, like a call', 'Ignore all emails from that colleague forever'],
    correct: 2, explanation: 'This is a classic business email compromise pattern: urgency, secrecy and gift cards. Verify through a channel you already trust.' },
  { id: 'q5', scenario: 'An email says you won a prize and only need to pay a $4.99 delivery fee.',
    question: 'What is this most likely?', options: ['A lucky break', 'An advance-fee scam to collect card details', 'A normal marketing email', 'A shipping notification'],
    correct: 1, explanation: 'You can’t win a contest you didn’t enter. The small fee is the hook to capture your card details.' },
  { id: 'q6', scenario: 'PhishGuard rates an email “Likely Legitimate” with a score of 30, but it asks for your OTP code.',
    question: 'What should you do?', options: ['Trust the score and send the code', 'Never share the OTP. The request itself is a red flag', 'Send half the code', 'Wait a day, then send it'],
    correct: 1, explanation: 'A model score is an estimate, not a guarantee. A request for an OTP is reason enough to stop, whatever any tool says.' },
]
