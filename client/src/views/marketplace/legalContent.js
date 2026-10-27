// legalContent.js
// FEX Digital agent-facing Terms of Service and Privacy Policy.
// Each section body supports **bold**, blank-line paragraphs and "- " bullets.

export const EFFECTIVE_DATE = 'October 27, 2026';

export const TERMS_SECTIONS = [
  {
    title: '1. Agreement and Scope',
    body: 'These Terms of Service ("Terms") are a binding agreement between Final Expense Digital, LLC ("FEX Digital," "we," "us") and the licensed insurance agent or agency ("you") that creates an account on, or buys any product or service from, fexdigital.com, the FEX Digital CRM, or any FEX Digital payment link (together, the "Platform"). These Terms cover every product and service we offer, including leads of every type, live transfers, messaging lines, AI messaging tools, and CRM software (the "Services"). Product-specific terms below apply in addition to these general terms. You accept these Terms by checking the acceptance box, creating an account, completing a purchase, or using the Services. If you accept on behalf of an agency, you confirm you are authorized to bind it, and "you" includes the agency and its users.',
  },
  {
    title: '2. Changes to These Terms',
    body: 'We may update these Terms from time to time. We may post the updated Terms on the Platform with a new effective date and, for material changes, notify you by email or in the CRM at least 15 days before they take effect (changes required by law or made for compliance reasons may take effect immediately). Your continued use of the Services, or any purchase, after the effective date means you accept the updated Terms. If you do not agree, you must stop using the Services and cancel any subscriptions before the effective date. Changes do not apply retroactively to orders already paid for.',
  },
  {
    title: '3. Eligibility and Licensing',
    body: 'You must be at least 18 years old and hold, and keep, an active life insurance producer license (and any required carrier appointments) in every state for which you buy leads, receive live transfers, or contact consumers. You will give us your accurate National Producer Number (NPN) and licensed states, and keep them current. You will tell us within 5 business days if any license is suspended, revoked, lapses, or becomes the subject of a regulatory action. We may verify your license at any time, and we may refuse, pause, or limit delivery for any state where we cannot confirm your license. You may not buy leads or transfers for states in which you are not licensed.',
  },
  {
    title: '4. Accounts and Leaderboards',
    body: 'Each account is for one individual licensed agent. You are responsible for all activity under your account and for keeping your login credentials confidential; do not share them or let anyone else use your account. Tell us immediately at info@fexdigital.com if you suspect unauthorized access. FEX Digital administrators can view your production, sales, lead and activity data in the Platform to operate, support and improve the Services. Your name and production figures will appear on leaderboards and similar rankings visible to other Platform users. Leaderboard participation is part of the Services, and by using the Platform you consent to it.',
  },
  {
    title: '5. Product Definitions',
    body: "(a) **Website Leads** are consumers who requested final expense information on GetSeniorQuotes.com. Website Leads are sold as a mixed batch of Verified and Unverified leads.\n\n(b) **Website Leads - Verified** are the same product, limited to Verified leads.\n\n(c) **Instant Form Leads** are consumers who submitted a GetSeniorQuotes-branded lead form on Meta (Facebook/Instagram). All Instant Form Leads are Verified.\n\n(d) **Verified** means the consumer's phone number was confirmed at submission: for Website Leads, by entering a one-time code we sent by text; for Instant Form Leads, through Meta's instant form verification. Verification confirms only that the consumer controlled that phone at the time. It does not confirm identity, intent, health, or insurability.\n\n(e) **Banked Leads** are Website or Instant Form Leads that were generated in the last 72 hours and never delivered to an agent.\n\n(f) **Aged Leads** are Website or Instant Form Leads 31-90 days or 91-180 days old, which may have been previously delivered to one or more agents.\n\n(g) **Live Transfers** are inbound calls from consumers that we connect to you by phone.",
  },
  {
    title: '6. Exclusivity and Resale',
    body: "Website Leads, Instant Form Leads and Banked Leads are delivered to one agent at a time. For 30 days after delivery to you, we will not sell that lead to another agent. After 30 days, we may sell the lead to other agents as an Aged Lead, and Aged Leads are not exclusive. Exclusivity applies only to leads we sell; the same consumer may have submitted requests to other companies or on more than one occasion, and we do not guarantee that no other party has the consumer's information.",
  },
  {
    title: '7. Delivery',
    body: 'We deliver leads to your CRM account and, where you set it up, to connected third-party tools (for example Ringy, GoHighLevel, InsurDial or your messaging line). Real-time products are delivered over time as consumers submit requests in your selected states. We do not guarantee a delivery date, pace, volume, or geographic mix. You are responsible for keeping your states, filters, and integration settings accurate; leads delivered according to your settings are considered delivered, even if a third-party tool fails to receive or display them. We may pause or reroute delivery if your settings, license information, or payment status needs attention. Third-party tools are governed by their own terms, and we are not responsible for their availability or for how they store data.',
  },
  {
    title: '8. Pricing and Payment',
    body: 'Prices are shown on the Platform at the time of purchase and may change for future purchases. All amounts are in U.S. dollars and are due at purchase unless an invoice says otherwise. Prices exclude sales, use, and similar taxes, which we will add where required. You authorize us and our payment processor (Stripe) to charge your payment method for all purchases and recurring fees.\n\n**Chargebacks.** Leads and live transfers are digital products delivered immediately, and all charges for delivered products are final except as provided in Section 11 (Refunds and Replacements). You agree to use the refund process in Section 11, or to contact us at info@fexdigital.com, for any billing concern, and not to initiate a chargeback or payment dispute for products that were delivered to your account. An unwarranted chargeback is a material breach of these Terms. If you initiate one, we may immediately suspend your account and all deliveries, cancel subscriptions and any undelivered orders, and recover from you the disputed amount, dispute fees, and reasonable collection costs. You agree that we may submit your acceptance of these Terms, delivery records, and account activity to your card issuer as evidence. We may refuse future service to any account with an unwarranted chargeback.',
  },
  {
    title: '9. Promotions and Credits',
    body: 'Promo codes and discounts are subject to the terms shown when offered, may be limited by product, quantity, time or customer, cannot be combined unless stated, expire on the date shown, and have no cash value. We may end or change a promotion at any time without affecting orders already placed, and may void discounts obtained through misuse (for example, multiple accounts). Lead credits and replacement leads are non-cash, non-transferable, cannot be redeemed for money, are issued as the lead type stated, and expire 12 months after issue. Credits are forfeited if your account is terminated for breach.',
  },
  {
    title: '10. Subscriptions',
    body: "Subscription Services (such as the Sendblue Line, Sendblue Bot, and recurring lead packs) renew automatically at the end of each billing period at the then-current price, and your payment method will be charged until you cancel. You may cancel at any time by emailing info@fexdigital.com or through any self-service option we provide; cancellation takes effect at the end of the current billing period. Fees already paid are non-refundable, and we do not prorate partial periods. We will give you at least 15 days' notice of any subscription price increase. If a payment fails, we may suspend the subscription until it is paid, and may cancel it after 14 days.",
  },
  {
    title: '11. Refunds and Replacements',
    body: '(a) **Eligible leads.** Only Unverified Website Leads may be submitted for replacement (Banked Leads and Aged Leads are not eligible, even if Unverified), using the Request Refund option in the CRM within 7 days of delivery, only by the agent the lead was first delivered to, and only if you have not marked the lead as sold.\n\n(b) **Grounds.** A request may be approved if the lead is clearly fictitious, the phone number is disconnected or invalid, or the phone number belongs to a business or to someone unrelated to the named consumer. We review each request using our records and third-party phone-data tools, and our decision is final. Each lead may be submitted once.\n\n(c) **Remedy.** An approved request is credited as one replacement lead of the same type. Replacements are not cash refunds.\n\n(d) **Final sale.** Verified leads, Instant Form Leads, Banked Leads, Aged Leads, and Live Transfers (other than as described in Section 12) are final sale.\n\n(e) Abuse of the refund process, including repeated invalid requests, may result in loss of refund eligibility.',
  },
  {
    title: '12. Live Transfers',
    body: "Live Transfers are inbound calls from consumers that we offer at the same time to eligible agents who have live-transfer credits, have delivery turned on, and are licensed in the caller's state. The first agent to accept the call is connected; you are not guaranteed any particular call or number of calls. One Live Transfer credit is used when your connected call lasts more than 90 seconds. Calls you do not answer or accept do not use a credit. If a caller is a consumer whose lead was already delivered to you, or who you previously spoke with through a Live Transfer, we may route the call directly to you, and no additional credit is used. Calls are recorded by us and our telephony providers for quality, billing, and compliance, and you consent to that recording. You will not separately record calls unless you comply with applicable recording-consent laws, including all-party-consent states. Billing disputes must be sent to info@fexdigital.com within 7 days of the call; we will review call records and our decision is final.",
  },
  {
    title: '13. Messaging Lines',
    body: "We provide messaging lines through third-party carriers and platforms (currently Sendblue). The phone number is assigned to you for as long as your subscription is active. When your subscription ends, we may release or reassign the number, and message history may be deleted after 30 days, so export anything you need before canceling. You must use the line only for lawful insurance-related communications, follow carrier and provider policies, honor opt-outs, and not send messages before 8 a.m. or after 8 p.m. in the recipient's local time.",
  },
  {
    title: '14. AI Messaging Tools',
    body: 'The Sendblue Bot and similar features use automated systems and third-party artificial-intelligence models to draft and send messages to contacts on your line on your behalf. You authorize us to send these messages in your name. You are responsible for deciding which contacts the tools message and for confirming you have the consent required to message them. AI output can be inaccurate or incomplete; the tools do not give insurance advice and may not quote prices, promise coverage, or bind any policy, and you are responsible for reviewing conversations and correcting errors. We may include a disclosure that messages are automated, apply quiet hours and opt-out handling, and log and review conversations to operate, improve, and keep the tools compliant. We may change, limit, or suspend the tools at any time, including for compliance reasons. We do not guarantee any appointment, response, or sales outcome.',
  },
  {
    title: '15. Your Contacts',
    body: '(a) For any data you upload or import into the Services that did not come from us, you represent that you obtained it lawfully and have the right to provide it to us. (b) Before you message any contact that did not come from us, through your messaging line, the CRM, or the AI Bot, you represent that you have all consents required under the TCPA, state telemarketing laws and carrier rules, including prior express written consent for automated marketing texts, and that you have scrubbed them against federal and state Do Not Call lists. You will keep records of that consent for at least 5 years and give them to us within 5 business days if we ask. We may refuse to message, or remove, any contact we believe lacks consent.',
  },
  {
    title: '16. Compliance',
    body: 'Each party is responsible for its own compliance with law. You are responsible for your calls, texts, emails, and sales conduct, including compliance with the TCPA, the Telemarketing Sales Rule, federal and state Do Not Call rules, state telemarketing laws (including state call-time limits and registration requirements), call-recording laws, insurance laws and regulations, and carrier rules. Before calling a lead, you will scrub it against the National Do Not Call Registry and applicable state lists unless an exemption applies. On request, we will provide the consent record we hold for a lead we sold you (such as the date, time, IP address, page, and disclosure language) within 5 business days.',
  },
  {
    title: '17. Opt-Outs and Complaints',
    body: "You will honor any request from a consumer to stop contact, made by any reasonable means, across all channels within the time required by law (and no later than 10 business days), and, for leads you received from us, email the consumer's name and phone number to info@fexdigital.com so we can stop reselling or re-contacting that consumer. You will notify us at info@fexdigital.com within 5 business days if you receive a demand letter, lawsuit, regulatory inquiry, or written complaint alleging unlawful contact (for example, a TCPA, Do Not Call, or lack-of-consent claim) related to a lead or the Services. We may share opt-outs and complaints with other agents who received the same consumer and with our service providers so they can be honored.",
  },
  {
    title: '18. Names and Marks',
    body: 'When contacting a consumer from a lead you purchased from us, you may say you are calling or texting from Get Senior Quotes. You may not say or imply that FEX Digital or Get Senior Quotes is an insurance company or issues policies, or that you represent an insurance carrier you are not appointed with or a government agency, and you may not use our names, logos, or domains in ads, websites, or social profiles without our written permission. You grant us a non-exclusive, royalty-free license to use your name, agency name, photo, license information, and reviews from consumers you served, (a) on GetSeniorQuotes.com and in communications with consumers, to identify you as the agent assisting them; and (b) in our marketing to agents, such as testimonials, case studies, sales results, and promotional materials on our websites, emails, and social media. You may opt out of (b) by emailing info@fexdigital.com.',
  },
  {
    title: '19. Use and Protection of Lead Data',
    body: 'You may use lead data only to offer insurance products you are licensed to sell to the consumer, and for no other purpose. You will not sell, share, rent, or disclose lead data to anyone other than your own staff and service providers who need it for that purpose and are bound to protect it. You will protect lead data, especially health information, with reasonable administrative, technical, and physical safeguards that meet applicable law (including GLBA and state insurance data-security laws), and notify us within 72 hours of discovering any unauthorized access to lead data received from us.',
  },
  {
    title: '20. Your Data in the CRM',
    body: 'You keep ownership of the client and business data you enter into the CRM ("Your Data"). You give us a license to host, process, and use Your Data to provide, secure, and support the Services, to verify lead quality and process refunds, and to create aggregated or de-identified statistics. We also use information about sales of leads we provided (such as the sale event and premium amount) to measure and improve our marketing, which may include sharing hashed identifiers and sale values with advertising platforms. You confirm you have the right to enter Your Data, including any notices or consents required to share client information with us.',
  },
  {
    title: '21. Communications to You',
    body: 'You agree we may contact you by email, text message, phone, and in-app notices at the contact details on your account about your account, orders, lead deliveries, billing, compliance, and changes to these Terms, and that electronic notices satisfy any legal requirement for written notice. With your consent, we may also send you marketing messages about our products, including by automated text; consent is not a condition of purchase. You can opt out of marketing texts by replying STOP and of marketing emails with the unsubscribe link. Message and data rates may apply.',
  },
  {
    title: '22. Acceptable Use and Confidentiality',
    body: 'You will not: (a) share your account or let others access the Platform through it; (b) scrape, copy, or use automated tools to access the Platform except through features we provide; (c) reverse-engineer, interfere with, or try to bypass security, state filters, or purchase limits; (d) use the Services to send spam, unlawful, or misleading content; or (e) use the Services to build or supply a competing lead or software product. Non-public information we share with you, including private pricing, lead-source and performance data, bot configurations, and Platform features, is confidential, and you will use it only to use the Services and not disclose it.',
  },
  {
    title: '23. Suspension and Termination',
    body: 'You may close your account at any time by emailing info@fexdigital.com. We may suspend or terminate your access, pause deliveries, or suspend any line or tool, immediately and without prior notice, if you breach these Terms, your license lapses, we receive credible complaints or regulatory inquiries about your conduct, a payment fails or is disputed, a carrier or provider requires it, or we reasonably believe continuing would create legal risk. If your account is closed or terminated for any reason, we will refund amounts you prepaid for leads not yet delivered. Replacement credits have no cash value and end on termination. On termination, subscriptions end, lines may be released, and your obligations regarding lead data, payment, indemnity, and disputes continue. After termination, we may delete Your Data after a reasonable period, so export anything you need before closing your account.',
  },
  {
    title: '24. Relationship; No Guarantees',
    body: 'FEX Digital is a marketing and software company. We are not an insurance carrier, agency, or producer, we do not solicit, sell, or recommend insurance, and we do not employ or supervise you. You are an independent business, and nothing in these Terms creates a partnership, employment, agency, or franchise relationship. Fees are for marketing and software services and are never based on whether you sell a policy, the premium, or your commission. Except as expressly stated in these Terms, the Services are provided "as is" and "as available," and we make no guarantee of contact rates, appointments, sales, income, or uninterrupted availability.',
  },
  {
    title: '25. Limitation of Liability and Indemnity',
    body: "(a) To the fullest extent permitted by law, FEX Digital will not be liable to you for any indirect, consequential, special, or punitive damages, and FEX Digital's total liability to you for all claims arising from these Terms or the Services will not exceed the greater of (i) the amounts you paid us in the 3 months before the claim arose or (ii) $100. (b) You will defend, indemnify, and hold harmless FEX Digital and its owners, officers, employees, and contractors from any claims, fines, losses, and costs (including reasonable attorneys' fees) arising from your use of leads or the Services; your communications with consumers, including messages sent through your line or AI tools to Your Contacts or at your direction; your breach of these Terms or of law; or any data incident in your systems.",
  },
  {
    title: '26. Disputes',
    body: 'Before starting any proceeding, the parties will try to resolve a dispute informally for 30 days after written notice. Any unresolved dispute will be resolved by binding individual arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules, seated in Wyoming or held remotely. Either party may instead bring an individual claim in small-claims court, or seek injunctive relief in court to protect confidential information, data, or intellectual property. Claims may be brought only on an individual basis, not as a plaintiff or class member in any class, collective, or representative proceeding, and the arbitrator may not consolidate claims. Any claim must be brought within one year after it arises. These Terms are governed by the laws of the State of Wyoming, without regard to conflict-of-law rules. The parties waive any right to a jury trial.',
  },
  {
    title: '27. General',
    body: 'Notices to us must be sent to info@fexdigital.com and by mail to Final Expense Digital, LLC, 30 N Gould St, Ste N, Sheridan, WY 82801; notices to you go to your account email. We are not liable for delays caused by events beyond our reasonable control, including carrier, platform, or internet outages. Our failure to enforce a provision is not a waiver. If any provision is unenforceable, the rest remains in effect. These Terms, together with any order terms and policies referenced here, are the entire agreement on their subject. Sections on payment, lead data, confidentiality, your data, liability, indemnity, and disputes survive termination.',
  },
];

export const PRIVACY_SECTIONS = [
  {
    title: '1. Scope',
    body: 'This Privacy Policy explains how Final Expense Digital, LLC ("FEX Digital") collects, uses, and shares personal information about the insurance agents, agencies, and team members who visit fexdigital.com, create an account, buy products, or use the FEX Digital CRM and related services. Information about consumers who request quotes on GetSeniorQuotes.com is covered by the GetSeniorQuotes Privacy Policy. Information about your clients that you store in the CRM is handled as described in the "Client Data" section below.',
  },
  {
    title: '2. Information We Collect',
    body: '(a) **Account and license information**: name, email, phone, agency, National Producer Number, licensed states, upline or team relationships.\n\n(b) **Payment information**: billing name, address, and transaction history; card details are collected and stored by our payment processor, Stripe, not by us.\n\n(c) **Service content**: client and policy records, notes, and files you enter in the CRM; messages sent and received through your messaging line, including AI-assisted conversations; live-transfer call details and recordings.\n\n(d) **Activity information**: purchases, deliveries, refunds and credits, sales you record, and consumer reviews matched to you.\n\n(e) **Technical information**: log-in records, IP address, device and browser data, and usage of the Platform.',
  },
  {
    title: '3. How We Use Information',
    body: 'We use personal information to: create and manage your account; deliver leads, live transfers, and other Services according to your settings; process payments, refunds, credits, and taxes; provision and operate messaging lines and AI tools; verify licenses and lead quality; provide reports, leaderboards, and team views; communicate with you about your account and, with your consent where required, our products; measure and improve our marketing, including using sale information to evaluate advertising; secure the Platform and prevent fraud and misuse; comply with law and respond to legal requests; and enforce our Terms.',
  },
  {
    title: '4. How We Share Information',
    body: 'We do not sell your personal information. We share it with:\n\n(a) **service providers** who help us run the Services, including payment processing (Stripe), messaging and telephony (Sendblue, Twilio/SendGrid, Telnyx), hosting and databases (Google Cloud, Firebase, Supabase), AI model providers, data-verification providers, and advertising and analytics platforms (such as Meta), each limited to what they need to provide their service;\n\n(b) **tools you connect**, such as Ringy, GoHighLevel, or InsurDial, at your direction;\n\n(c) **other Platform users** as described in our Terms, such as your upline or agency owner and leaderboards;\n\n(d) **consumers**, who may see your name, agency, photo, license information, and reviews when you are assigned to help them; and\n\n(e) **authorities or others** when required by law, to protect rights and safety, or to enforce our Terms.',
  },
  {
    title: '5. Client Data',
    body: 'When you enter information about your clients and prospects into the CRM ("Client Data"), we process it on your behalf to provide the Services. We do not sell Client Data or use it to market to your clients. We may use it to provide, secure, and support the Services, to verify the quality of leads we sold, to create aggregated or de-identified statistics, and as described in our Terms for sales of leads we provided.',
  },
  {
    title: '6. Your Choices',
    body: 'You can update account information in the CRM or by emailing us. You can opt out of marketing emails using the unsubscribe link and of marketing texts by replying STOP. We will still send service messages, such as lead alerts, billing notices, and compliance notices, while you have an account. You can control cookies through your browser settings; some features may not work without them.',
  },
  {
    title: '7. Security and Retention',
    body: 'We use administrative, technical, and physical safeguards designed to protect personal information, but no system is completely secure. We keep account and transaction information for as long as your account is active and as needed for legal, tax, and accounting purposes (generally 7 years for financial records), and consent and compliance records for at least 5 years. We delete or de-identify Client Data within 90 days after your account closes, unless you ask us to export it first or the law requires us to keep it. If a security incident affects your personal information, we will notify you as required by law.',
  },
  {
    title: '8. Your Rights',
    body: 'Depending on where you live, you may have the right to access, correct, delete, or receive a copy of your personal information, and to appeal a decision about your request. Email info@fexdigital.com to make a request; we will verify your identity and respond within the time required by law. We will not discriminate against you for exercising your rights.\n\n**Children.** The Services are for licensed professionals and are not directed to anyone under 18.\n\n**Changes.** We may post updates here with a new effective date and notify you of material changes by email or in the CRM.\n\n**Contact.** Final Expense Digital, LLC, 30 N Gould St, Ste N, Sheridan, WY 82801, info@fexdigital.com.',
  },
];
