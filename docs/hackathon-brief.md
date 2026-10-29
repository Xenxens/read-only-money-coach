# PayPal AI Hackathon — Verified Brief

**Last verified:** 2026-10-26  
**Project:** Read-Only Money Coach

## Sources

- Official rules (Devpost, accessed 2026-10-26): https://paypalaihackathon.devpost.com/rules
- Hackathon overview: https://paypalaihackathon.devpost.com/
- PayPal announcement: https://developer.paypal.com/community/blog/PayPal_AI_Hackathon

## Identity and eligibility

- **Name:** PayPal AI Hackathon — “Build what’s next with PayPal and AI”
- **Sponsor:** PayPal Inc.
- **Administrator:** Devpost, Inc.
- **URL:** https://paypalaihackathon.devpost.com/
- **Eligibility:** Individuals at least the age of majority where they reside; teams and organizations are allowed. There is no maximum team size. A team must appoint one Representative to submit.
- **Excluded residents/domiciles:** Brazil, Quebec, Russia, Crimea, Cuba, Iran, North Korea, and any other country comprehensively sanctioned by the U.S. Treasury’s Office of Foreign Assets Control (OFAC), plus any place where U.S. or local law prohibits participation or prize receipt.
- **Action required:** Confirm your own country/region eligibility before building. Registering on Devpost does not by itself make you eligible.

## Dates (Pacific Time)

| Milestone | Official date |
| --- | --- |
| Submissions open | October 1, 2026, 9:15 am PT |
| **Submission deadline** | **November 12, 2026, 12:00 pm PT (20:00 UTC)** |
| Judging period | December 1, 2026, 2:00 pm PT – December 15, 2026, 8:00 am PT |
| Winners announced | On or around December 21, 2026, 2:00 pm PT |

**Important:** The user-supplied “Gate 2 — November 3, 2026” is an internal project milestone, **not** the official hackathon deadline. The official deadline is November 12, 2026. We will still aim to have the core end-to-end flow working by November 3, which leaves nine days of buffer for security testing, deployment, video, and submission.

## Required submission materials

1. **Working project** that meaningfully uses the PayPal developer platform (free sandbox) and AI.
2. **Text description** explaining features and functionality.
3. **Functional demo.** Judges must be able to run or interact with a working build. This can be satisfied by either:
   - a hosted demo URL, or
   - clear, complete setup and run instructions in the repository.
   A design mockup, static prototype, or non-functional demo does **not** qualify.
4. **Public code repository** on GitHub, GitLab, or Bitbucket.
   - Must contain all source code, assets, and instructions needed to run the project.
   - Must be public and open source.
   - Must include an open-source license file that is detectable and visible in the repository’s **About** section.
5. **Demo video**
   - Should be **under 3 minutes**; judges are not required to watch beyond three minutes.
   - Must show the project functioning on the device it was built for.
   - Must be uploaded to YouTube and publicly visible.
   - Link must be on the Devpost submission form.
   - Must not contain third-party trademarks or copyrighted music/material without permission.
6. **Tools list:** identify which model or AI service was used and explain how it was used.
7. **English** submission materials.
8. The project must be available free of charge and without restriction for judging and testing until the judging period ends.

## Judging criteria (equally weighted)

1. **Technological Implementation** — depth and skill of PayPal + AI use; genuine, working, non-trivial implementation.
2. **Design** — complete, coherent product experience, not just a technical proof of concept.
3. **Potential Impact** — credible, specific problem for a real audience, and evidence the solution addresses it.
4. **Innovation/Idea** — creativity, novelty, and differentiation.
5. **Presentation** — clear end-to-end video; problem, audience, and why it matters.

Judges are not required to test the project and may judge solely on the text description, images, and video. We will therefore provide both a hosted demo and complete local run instructions, and make the video self-sufficient.

## Verified PayPal technical constraints (planning notes)

These are recorded now so the schedule is realistic. They will be re-verified against the live sandbox in Phase 1.

- **Transaction Search:** `GET https://api-m.sandbox.paypal.com/v1/reporting/transactions`
  - `start_date` and `end_date` are required RFC 3339 date-times with seconds.
  - The maximum supported date range per request is **31 days**.
  - OAuth scope: `https://uri.paypal.com/services/reporting/search/read`.
- **Balances:** `GET https://api-m.sandbox.paypal.com/v1/reporting/balances`
  - OAuth scope: `https://uri.paypal.com/services/reporting/balances/read`.
  - Balances can take up to **three hours** to appear.
  - The API lists balances up to the previous three years.
- **Token scope warning:** PayPal’s published sample OAuth response includes payment, refund, payout, invoicing, and other scopes. Do **not** assume that enabling only “Transaction Search” in the dashboard makes the credential incapable of money movement. Phase 1 must record the actual order-creation response. If the prohibited request succeeds, we stop and treat the credential as broad; the app’s read-only guarantee must then be enforced and proven in application code, and the README must say so honestly.

## Scope discipline

The official rules do not require a specific framework, but this project will use Next.js, TypeScript, Tailwind CSS, PayPal REST sandbox APIs, one AI provider, automated tests, GitHub, and Vercel. No paid infrastructure is required for the core build.
