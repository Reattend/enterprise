import Link from 'next/link'
import Image from 'next/image'

// Privacy policy for Reattend Enterprise. Self-contained — does NOT import
// the legacy Personal Reattend Navbar/Footer. UI is intentionally minimal;
// a polish pass lands in Sprint O. Content tracks the data-handling claims
// in the Chrome Web Store submission (data declarations + permission
// justifications) and the controls advertised on /compliance.

const LAST_UPDATED = 'April 25, 2026'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-gradient-to-br from-neutral-200/40 via-neutral-100/20 to-transparent blur-3xl pointer-events-none" />

      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-5xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/black_logo.svg" alt="Reattend" width={32} height={32} className="h-8 w-8" unoptimized />
          <div>
            <span className="text-[17px] font-bold text-[#1a1a2e] tracking-tight">Reattend</span>
            <span className="text-[10px] font-semibold text-neutral-400 ml-1.5 uppercase tracking-wider">Enterprise</span>
          </div>
        </Link>
        <div className="flex items-center gap-6 text-[13px]">
          <Link href="/pricing" className="font-semibold text-neutral-500 hover:text-[#1a1a2e] transition-colors">Pricing</Link>
          <Link href="/compliance" className="font-semibold text-neutral-500 hover:text-[#1a1a2e] transition-colors">Compliance</Link>
          <Link href="/login" className="font-semibold text-[#1a1a2e] hover:text-neutral-600 transition-colors">Sign in &rarr;</Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-3xl mx-auto px-8 pt-12 pb-24">
        <header className="mb-12">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">Legal</p>
          <h1 className="text-[42px] md:text-[52px] font-bold tracking-[-0.03em] leading-[1.1] text-[#1a1a2e] mb-3">
            Privacy Policy
          </h1>
          <p className="text-[14px] text-neutral-500">Last updated: {LAST_UPDATED} · Reattend Technologies Private Limited</p>
        </header>

        <article className="prose prose-neutral max-w-none">
          <p className="text-[15px] text-neutral-600 leading-relaxed mb-8">
            Reattend Enterprise (&ldquo;Reattend,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is operated by Reattend Technologies
            Private Limited. This Privacy Policy explains what information we collect from customer
            organizations and their authorized users, how we use it, who we share it with, and the rights
            available to you. It applies to enterprise.reattend.com, the Reattend Enterprise web app, the
            Reattend Enterprise Chrome extension, the public sandbox at <code>/sandbox</code>, and any
            customer-deployed on-premise instance running our software.
          </p>

          <Section title="1. Who is the controller of your data">
            <p>
              For customer organizations that deploy Reattend Enterprise on our SaaS infrastructure,
              Reattend Technologies Private Limited acts as the data <em>processor</em> and the customer
              organization is the <em>controller</em> of the content their users put into the system.
              For customers running an on-premise deployment, Reattend has no access to customer data;
              the customer is the sole controller and operator.
            </p>
            <p>
              For visitors of our public marketing pages (home, pricing, compliance, the sandbox), and
              for the holders of personal Reattend accounts created directly on enterprise.reattend.com,
              Reattend Technologies Private Limited is the controller of the limited data described
              below.
            </p>
          </Section>

          <Section title="2. What we collect">
            <SubSection title="Account information">
              <p>
                When a user signs up or is invited into a Reattend organization, we collect their email
                address and display name. If the user signs in via Google we additionally receive their
                Google profile name and avatar URL. Passwords are never stored in plaintext; we use
                one-way hashes (bcrypt) for any password-based credentials.
              </p>
            </SubSection>

            <SubSection title="Authentication credentials">
              <p>
                We issue session cookies (for the web app), short-lived SSO tickets (60-second JWTs used
                during single sign-on handoff and the sandbox launch flow), and long-lived API tokens
                (for the Chrome extension and any programmatic access). These are scoped to a single
                user inside a single organization. Users can revoke their API tokens at any time from
                their settings page.
              </p>
            </SubSection>

            <SubSection title="Organizational content">
              <p>
                The substance of the product: memory records, decisions, policies, agents, exit
                interviews, handoff documents, OCR-processed documents, prompt library entries,
                announcements, and the metadata generated about them (tags, summaries, embeddings,
                links to related records). All of this is content that the customer organization or
                its authorized users explicitly create or upload. Each record is stored against a
                single organization and is gated by the eight record-visibility rules described on
                our <Link href="/compliance">compliance page</Link>.
              </p>
            </SubSection>

            <SubSection title="Chrome extension capture data">
              <p>
                The Reattend Enterprise Chrome extension ships with two surfaces that touch web page
                content. We describe them precisely because a Chrome Web Store reviewer (and any
                privacy-conscious customer admin) will want exact mechanics.
              </p>
              <ul>
                <li>
                  <strong>User-invoked capture.</strong> Only when the user explicitly clicks the
                  toolbar popup&apos;s Save buttons, the floating R-pin on a whitelisted page, or one of
                  the right-click context menu items, the extension reads the title, URL, any text
                  selection, and (truncated to 4,000 characters) the visible text of the active tab.
                  This payload is sent to the customer&apos;s configured Reattend Enterprise instance to
                  become a memory record. Nothing is captured automatically; nothing is sent on tabs
                  the user did not explicitly invoke.
                </li>
                <li>
                  <strong>Ambient related-memory lookup.</strong> Only on pages whose hostname is in
                  the user&apos;s whitelist or the org admin&apos;s required/recommended-domain policy, the
                  extension sends the page&apos;s URL, title, and a 400-character excerpt to the
                  customer&apos;s Reattend instance to look up related memories. The lookup is read-only
                  on the server (it does not create a record) and the user can disable ambient
                  surfacing entirely from extension settings or have the org admin disable it
                  globally for the org. On non-whitelisted pages the content script returns
                  immediately at the very first runtime check with zero DOM access and zero network
                  traffic.
                </li>
              </ul>
              <p>
                The extension never observes keystrokes, mouse movement, scroll position, or page
                interaction. It does not track browsing history beyond the explicit cases above. It
                contains no third-party analytics SDK and no remote-loaded code.
              </p>
            </SubSection>

            <SubSection title="Sandbox usage">
              <p>
                The public sandbox at <code>/sandbox</code> creates a synthetic temporary user
                (<code>sb-XXXXXXXX@sandbox.reattend.local</code>) and a cloned demo organization for
                each visitor. Sandbox sessions last up to one hour; cloned orgs are automatically
                deleted by a cron that runs every ten minutes. We may retain anonymous aggregated
                usage statistics (e.g., total sandbox launches per role) for product improvement; no
                personal information is collected from sandbox visitors and no calls are made to AI
                providers — every AI feature in the sandbox returns canned fixtures.
              </p>
            </SubSection>

            <SubSection title="Operational telemetry">
              <p>
                We log technical metadata required to run a secure service: source IP address, browser
                type, request paths, response codes, latencies, and error stack traces. This data is
                used solely to operate, debug, and secure the service. We do not perform behavioral
                profiling, ad targeting, or cross-site tracking. Server logs are retained for 30 days
                unless a security incident requires longer retention.
              </p>
            </SubSection>

            <SubSection title="Audit log">
              <p>
                For Enterprise and Government plans, every privileged action inside an organization
                (record creation, decision authorship, policy publication, member invites, role
                changes, exports, deletions) is appended to a tamper-evident, hash-chained audit log
                inside the customer&apos;s organization. The customer org&apos;s admins control retention and
                can verify the chain on demand from <code>/admin/&lt;orgId&gt;/audit</code>.
              </p>
            </SubSection>
          </Section>

          <Section title="3. How we use the data">
            <ul>
              <li>To operate the service: authenticate users, render the UI, retrieve the records they ask for.</li>
              <li>To run the AI features the customer has explicitly enabled: triage, classification, search reranking, structured answer generation, exit-interview question writing, handoff drafting, etc. Each AI call sends only the records retrieved for the asking user (and the question / prompt) — the model never sees records the user does not have permission to read.</li>
              <li>To send transactional email: account verification codes, organization invitations, billing receipts. We do not send marketing email without explicit opt-in.</li>
              <li>To detect and prevent fraud, abuse, security incidents, or violations of our Terms of Service.</li>
              <li>To comply with legal obligations and respond to lawful requests from authorities (with notice to the customer where lawfully permitted).</li>
            </ul>
          </Section>

          <Section title="4. What we do NOT do">
            <ul>
              <li><strong>We do not sell customer data.</strong> Ever. To anyone. There is no advertising business.</li>
              <li><strong>We do not train AI models on customer content.</strong> Customer memory records, decisions, exit interviews, and OCR documents are never used as training data for any general-purpose model. AI providers we route requests through contractually agree to the same restriction (see &ldquo;Sub-processors&rdquo; below).</li>
              <li><strong>We do not commingle customer data.</strong> Every record is tagged with its organization id and gated by org-scoped retrieval. The model literally never receives memories from another customer&apos;s organization.</li>
              <li><strong>We do not share content between users inside an organization beyond what RBAC explicitly allows.</strong> Eight record-visibility rules (creator, private, team, department, org-wide, explicit shares, admin override, non-enterprise fallback) are enforced at the database query layer.</li>
              <li><strong>We do not perform cross-site tracking</strong> on visitors of our marketing pages or on whitelisted pages observed by the extension.</li>
            </ul>
          </Section>

          <Section title="5. Sub-processors">
            <p>
              For the SaaS deployment, we route AI inference through managed AI providers under
              contracts that prohibit retention or training on the inference payload. We use cloud
              infrastructure providers for hosting, email-delivery providers for transactional email,
              error-tracking providers for stack traces, and payment processors for billing. The full
              list is published at <code>/subprocessors</code> (link in the footer); customer
              organizations on the Enterprise plan are notified at least 30 days before any new
              sub-processor is added.
            </p>
            <p>
              Customers who require zero third-party data flow can deploy Reattend Enterprise
              <strong> on-premise</strong>, including the AI inference engine. In that configuration
              no customer data ever leaves the customer&apos;s network and Reattend has no operational
              access to the deployment.
            </p>
          </Section>

          <Section title="6. International transfers">
            <p>
              The SaaS instance currently runs in a single region. Customer organizations that require
              data residency in a specific jurisdiction (EU, UK, India, or a US state-cloud) should
              contact us before signing — we will document the residency commitment in the order form
              and route their tenant accordingly. For customers under GDPR scope, transfers outside
              the EEA rely on Standard Contractual Clauses incorporated into our DPA.
            </p>
          </Section>

          <Section title="7. Retention">
            <p>
              Customer content is retained for the life of the organization&apos;s account, plus 30 days
              after termination during which the customer can request a full export. After that
              window we permanently delete the organization&apos;s data from primary storage; encrypted
              backups are rotated within 90 additional days.
            </p>
            <p>
              Server logs: 30 days. Audit log: customer-controlled, configurable per organization.
              Sandbox orgs: 1 hour. Email-verification OTPs: minutes (single-use). API tokens: until
              the user revokes them.
            </p>
          </Section>

          <Section title="8. Your rights">
            <p>
              Depending on your jurisdiction (GDPR, UK GDPR, CCPA/CPRA, India DPDP Act, etc.) you have
              the right to access, correct, export, restrict, and delete the personal information we
              hold about you. Most of these rights are self-serviceable inside the app:
            </p>
            <ul>
              <li><strong>Access &amp; export:</strong> <code>/app/settings</code> &rarr; Data controls &rarr; Export — produces a JSON bundle of everything we hold for your user account, on demand.</li>
              <li><strong>Right to erasure:</strong> <code>/app/settings</code> &rarr; Data controls &rarr; Delete account — typed-confirmation hard-delete of your user account and the records you authored, with an immutable audit-log entry recording the request.</li>
              <li><strong>Correction:</strong> profile fields are editable in settings; for content fields, the org owns the edit/delete authority via RBAC.</li>
              <li><strong>Withdrawal of consent:</strong> revoke API tokens, disconnect integrations, or close your account at any time.</li>
            </ul>
            <p>
              Organization-scope requests (e.g., a regulator-verified erasure of a former employee&apos;s
              data, or an org-wide SQL export) should be addressed to the customer organization&apos;s
              admin first; if you cannot reach them, contact us at <a href="mailto:privacy@reattend.ai">privacy@reattend.ai</a> and
              we will respond within 30 days.
            </p>
          </Section>

          <Section title="9. Security">
            <p>
              All traffic uses HTTPS with modern TLS. Data at rest is encrypted on the underlying
              storage layer. Authentication uses NextAuth.js with JWT session cookies and an
              SSO-ticket exchange for handoff flows. Two-tier RBAC (organization role plus
              department role) is enforced at the database query layer for every retrieval path.
              Every privileged write is appended to a sha256-chained audit log that customers can
              verify on demand. We are tracking SOC 2 Type I (timeline disclosed on{' '}
              <Link href="/compliance">/compliance</Link>); StateRAMP Moderate and CJIS addendum
              packs are available for government customers on request.
            </p>
          </Section>

          <Section title="10. Cookies">
            <p>
              We use a single first-party session cookie (<code>next-auth.session-token</code>) plus
              a per-user workspace-id cookie used to remember the active organization. We do not
              set advertising cookies, third-party analytics cookies, or cross-site tracking cookies.
              The marketing pages are static and embed no third-party trackers.
            </p>
          </Section>

          <Section title="11. Children's privacy">
            <p>
              Reattend Enterprise is built for organizations and is not intended for users under 16.
              We do not knowingly collect data from children. If you believe a child has created an
              account, contact us and we will delete it.
            </p>
          </Section>

          <Section title="12. Changes to this policy">
            <p>
              We may update this Privacy Policy as the product evolves. Material changes will be
              notified to organization admins by email at least 30 days in advance, and the
              &ldquo;Last updated&rdquo; date at the top of this page will reflect the latest revision.
              Continued use of the service after the effective date constitutes acceptance.
            </p>
          </Section>

          <Section title="13. Contact">
            <p>
              <strong>Reattend Technologies Private Limited</strong><br />
              Privacy questions: <a href="mailto:privacy@reattend.ai">privacy@reattend.ai</a><br />
              Security disclosures: <a href="mailto:security@reattend.ai">security@reattend.ai</a><br />
              General contact: <a href="mailto:pb@reattend.ai">pb@reattend.ai</a>
            </p>
          </Section>
        </article>
      </main>

      <footer className="relative z-10 border-t border-neutral-200/60 bg-white/40 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-neutral-500">
          <p>&copy; {new Date().getFullYear()} Reattend Technologies Private Limited.</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-[#1a1a2e] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[#1a1a2e] transition-colors">Terms &amp; Conditions</Link>
            <Link href="/compliance" className="hover:text-[#1a1a2e] transition-colors">Compliance</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 pt-10 border-t border-neutral-200/60 first:border-t-0 first:pt-0 first:mt-0">
      <h2 className="text-[20px] font-bold tracking-tight text-[#1a1a2e] mb-4">{title}</h2>
      <div className="text-[15px] text-neutral-600 leading-relaxed space-y-4 [&>ul]:space-y-2 [&>ul]:pl-5 [&>ul>li]:list-disc [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[13px] [&_a]:text-[#4F46E5] [&_a]:underline-offset-2 hover:[&_a]:underline">
        {children}
      </div>
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-[15px] font-semibold text-[#1a1a2e] mb-2">{title}</h3>
      <div className="text-[15px] text-neutral-600 leading-relaxed space-y-3 [&>ul]:space-y-2 [&>ul]:pl-5 [&>ul>li]:list-disc">
        {children}
      </div>
    </div>
  )
}
