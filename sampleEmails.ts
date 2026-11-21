export interface SampleEmail { id: string; label: string; kind: 'phishing' | 'legitimate' | 'tricky'; subject: string; sender: string; body: string }

/** Hand-written educational samples. Not taken from the training dataset. */
export const sampleEmails: SampleEmail[] = [
  {
    id: 'bank-suspend', label: 'Bank account suspension', kind: 'phishing',
    subject: 'URGENT: Your account has been suspended',
    sender: 'Security Team <security-alert@meezan-verify-online.xyz>',
    body: `Dear Customer,

We detected unusual activity on your online banking account. For your protection, access has been temporarily suspended.

To restore access you must verify your identity within 24 hours. Click here to confirm your login details and card PIN:
http://meezan-verify-online.xyz/secure/login?session=88231

If you do not verify immediately, your account will be permanently closed.

Regards,
Online Banking Security`,
  },
  {
    id: 'uni-password', label: 'University password expiry', kind: 'phishing',
    subject: 'Action required: student portal password expires today',
    sender: 'IT Helpdesk <it.helpdesk.au2026@gmail.com>',
    body: `Dear student,

Your university portal password expires today. To avoid losing access to LMS and email, update your password now using the link below:

https://bit.ly/au-portal-reset

Failure to act will result in account deactivation.

IT Services`,
  },
  {
    id: 'prize', label: 'Prize winner', kind: 'phishing',
    subject: 'Congratulations! You have won a brand new iPhone',
    sender: 'Rewards <winner@promo-rewards.top>',
    body: `Congratulations!! You have been selected as our lucky winner this week.

Claim your prize now by filling in your details and paying a small $4.99 delivery fee:
http://192.168.10.44/claim/iphone

Offer expires in 2 hours. Keep this confidential.`,
  },
  {
    id: 'invoice', label: 'Invoice with attachment', kind: 'phishing',
    subject: 'Overdue invoice #INV-20931',
    sender: 'Accounts <billing@docusign-files.support>',
    body: `Hello,

Please see the attached invoice (INV-20931.html). Payment is overdue and late fees apply after today.

Open the attachment and sign in with your Microsoft 365 account to view the document.

Thanks,
Accounts Receivable`,
  },
  {
    id: 'lecture', label: 'Class reschedule', kind: 'legitimate',
    subject: 'Discrete Maths: Thursday lecture moved to Room 204',
    sender: 'Dr. Sana Khan <sana.khan@au.edu.pk>',
    body: `Hi everyone,

Thursday's lecture on sorting algorithms will be held in Room 204 instead of the usual hall, same time (10:00).

Please bring your draft solutions for Assignment 3 so we can go through them together. Slides are on the course page as usual.

See you there,
Dr. Khan`,
  },
  {
    id: 'team', label: 'Team project update', kind: 'legitimate',
    subject: 'Re: semester project meeting notes',
    sender: 'Hamza Ali <hamza.ali@students.au.edu.pk>',
    body: `Hey team,

Thanks for joining today. Quick recap:
- Ahad is finishing the frontend analyzer page
- I'll write the evaluation section for the report
- We present the demo next Friday

Let me know if I missed anything.

Hamza`,
  },
  {
    id: 'real-alert', label: 'Genuine-looking security notice', kind: 'tricky',
    subject: 'New sign-in to your account',
    sender: 'Google <no-reply@accounts.google.com>',
    body: `A new sign-in was detected on a Windows device.

If this was you, you don't need to do anything. If not, review your account activity from the security page in your Google Account settings.

You received this email to let you know about important changes to your account.`,
  },
]
