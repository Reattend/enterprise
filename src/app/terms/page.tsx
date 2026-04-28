import Link from 'next/link'
import { SiteNav } from '@/components/landing/site-nav'
import { SiteFooter } from '@/components/landing/site-footer'

// Terms & Conditions for Reattend Enterprise. Self-contained — does NOT
// import the legacy Personal Reattend Navbar/Footer. UI is intentionally
// minimal; a polish pass lands in Sprint O. Content is calibrated against
// the Privacy Policy and the controls advertised on /compliance.

const LAST_UPDATED = 'April 25, 2026'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-gradient-to-br from-neutral-200/40 via-neutral-100/20 to-transparent blur-3xl pointer-events-none" />

      <SiteNav />

      <main className="relative z-10 max-w-3xl mx-auto px-8 pt-12 pb-24">
        <header className="mb-12">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">Legal</p>
          <h1 className="text-[42px] md:text-[52px] font-bold tracking-[-0.03em] leading-[1.1] text-[#1a1a2e] mb-3">
            Terms &amp; Conditions
          </h1>
          <p className="text-[14px] text-neutral-500">Last updated: {LAST_UPDATED} · Reattend Technologies Private Limited</p>
        </header>

        <article className="prose prose-neutral max-w-none">
          <p className="text-[15px] text-neutral-600 leading-relaxed mb-8">
            These Terms &amp; Conditions (the &ldquo;Terms&rdquo;) govern access to and use of Reattend Enterprise
            (the &ldquo;Service&rdquo;), including enterprise.reattend.com, the Reattend Enterprise web app, the
            Reattend Enterprise Chrome extension, the public sandbox at <code>/sandbox</code>, any
            related APIs, and customer-deployed on-premise instances of the Reattend Enterprise
            software (collectively, the &ldquo;Service&rdquo;). The Service is provided by Reattend Technologies
            Private Limited (&ldquo;Reattend,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
          </p>
          <p className="text-[15px] text-neutral-600 leading-relaxed mb-8">
            By creating an account, accepting an organization invitation, deploying the on-premise
            distribution, or otherwise using the Service, you (&ldquo;Customer,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) agree
            to these Terms and to our <Link href="/privacy">Privacy Policy</Link>. Customers under an
            executed master services agreement or order form take precedence over these Terms where
            the two conflict.
          </p>

          <Section title="1. Acceptance of terms">
            <p>
              By using the Service you confirm that (a) you are at least 16 years old and have the
              legal capacity to enter a binding contract, (b) if you are using the Service on behalf
              of an organization, you have the authority to bind that organization, and (c) the
              organization on whose behalf you act has not been suspended or terminated from the
              Service.
            </p>
          </Section>

          <Section title="2. Account registration and authentication">
            <p>
              You are responsible for maintaining the confidentiality of your credentials, including
              email-based one-time codes, SSO sessions, and any API tokens you mint. You agree to
              notify us promptly of any unauthorized access. We are not liable for losses arising
              from credentials you have shared, leaked, or failed to revoke.
            </p>
            <p>
              Organization administrators may invite, suspend, change roles for, or remove members of
              their organization. Members agree that the organization controls the lifecycle of their
              access to organization-scoped content.
            </p>
          </Section>

          <Section title="3. Plans and subscriptions">
            <p>
              The Service is offered under three plan families:
            </p>
            <ul>
              <li><strong>Team</strong> — per-seat subscription billed monthly or annually, self-serve sign-up.</li>
              <li><strong>Enterprise</strong> — quote-only annual contract. Includes dedicated tenant, customer-success contact, security review participation, and DPA.</li>
              <li><strong>Government</strong> — quote-only annual contract with on-premise deployment, trainer-assisted onboarding, and compliance addenda (StateRAMP, CJIS, etc.) on request.</li>
            </ul>
            <p>
              Current pricing is published at <Link href="/pricing">/pricing</Link>. We may revise
              pricing at the start of any renewal term with at least 30 days&apos; notice; any change
              applies only to renewals after the notice period.
            </p>
          </Section>

          <Section title="4. Free trial and the public sandbox">
            <p>
              Where offered, the Team plan includes a 30-day free trial requiring no credit card.
              The public sandbox at <code>/sandbox</code> is a read-only-feeling demo seeded with
              synthetic Ministry-of-Finance content; sandbox sessions last up to one hour and are
              automatically deleted. Sandbox visitors are not customers, do not create binding
              accounts, and the AI features in the sandbox return canned scripted responses.
            </p>
          </Section>

          <Section title="5. Billing, taxes, and refunds">
            <p>
              Subscription fees are billed in advance. The Team plan is billed via our payment
              processor; Enterprise and Government plans are billed by invoice. All fees are
              exclusive of applicable taxes (GST, VAT, sales tax) which the Customer is responsible
              for paying.
            </p>
            <p>
              For Team-plan subscribers, you may cancel at any time from billing settings; access
              continues to the end of the prepaid period. We do not offer pro-rated refunds for
              partial periods. Annual subscriptions are non-refundable except where required by law.
              Enterprise and Government cancellations are governed by the executed order form.
            </p>
          </Section>

          <Section title="6. Customer content and ownership">
            <p>
              Customer Content (memory records, decisions, policies, agents, exit interviews, OCR
              uploads, prompts, announcements, and any related metadata you create or upload)
              remains the Customer&apos;s property. The Customer grants Reattend a limited, worldwide,
              non-exclusive license to host, store, copy, transmit, and display Customer Content
              solely as needed to operate, maintain, and improve the Service for that Customer&apos;s
              benefit, and to perform AI inference at the Customer&apos;s request.
            </p>
            <p>
              The Customer represents that it has the rights and authorizations needed to upload its
              Customer Content, including any third-party intellectual property and any personal
              information about its employees, contractors, and counterparts.
            </p>
            <p>
              <strong>We do not train AI models on Customer Content.</strong> The AI providers we
              route inference through contractually agree to the same restriction.
            </p>
          </Section>

          <Section title="7. Acceptable use">
            <p>
              You will not, and will not permit any user to:
            </p>
            <ul>
              <li>Use the Service to violate any applicable law, regulation, or third-party right (including IP, privacy, and export-control laws).</li>
              <li>Upload material that infringes copyright, trademark, trade secret, or any contractual confidentiality obligation, unless you have the right to do so.</li>
              <li>Attempt to bypass authentication, RBAC, rate limits, or audit-logging mechanisms.</li>
              <li>Reverse-engineer, decompile, or extract the source of the Service except where law expressly permits.</li>
              <li>Use the Service to build a competing product, or to scrape, mine, or aggregate data across multiple customer organizations.</li>
              <li>Send spam, malware, phishing payloads, or any content that is illegal in the user&apos;s or organization&apos;s jurisdiction.</li>
            </ul>
          </Section>

          <Section title="8. Organization administration and RBAC">
            <p>
              Organization administrators have privileged powers including the ability to publish
              policies, invite or remove members, change roles, view the audit log, configure the
              Chrome extension domain policy, run agents, and export or erase organization-scoped
              data. Organizations agree that these powers are theirs to exercise responsibly. Reattend
              implements the eight record-visibility rules described on <Link href="/compliance">/compliance</Link>;
              within those constraints the organization is the sole controller of access decisions.
            </p>
          </Section>

          <Section title="9. AI features and outputs">
            <p>
              The Service includes AI-generated content (chat answers, Oracle dossiers, brain-dump
              parsing, exit-interview questions, handoff drafts, blast-radius narratives, agent
              outputs, etc.). AI outputs are inherently probabilistic; they may be incorrect or
              inconsistent and must not be relied upon as a substitute for professional legal,
              medical, financial, or regulatory advice. Every AI answer in the product cites the
              source memories the answer is grounded in — always check the citations before acting
              on a recommendation.
            </p>
          </Section>

          <Section title="10. Privacy">
            <p>
              Our handling of personal information is governed by our <Link href="/privacy">Privacy Policy</Link>,
              which forms part of these Terms. Customers under GDPR, UK GDPR, CCPA/CPRA, or India
              DPDP scope may request our standard Data Processing Addendum.
            </p>
          </Section>

          <Section title="11. Intellectual property">
            <p>
              The Service, including its source code, models, prompts, system prompts, fine-tunes,
              UI, documentation, and all underlying intellectual property, is owned by Reattend or
              its licensors. Subject to your compliance with these Terms and timely payment of fees,
              we grant you a limited, non-exclusive, non-transferable, revocable license to use the
              Service for your internal business purposes during the subscription term.
            </p>
            <p>
              On-premise customers receive an additional license to run the Service binary inside
              their network for the term of the agreement, governed by the executed order form.
            </p>
          </Section>

          <Section title="12. Confidentiality">
            <p>
              Each party agrees to protect the other&apos;s confidential information using the same care
              it uses for its own confidential information of similar sensitivity, and to use
              confidential information only as needed to perform under these Terms. Customer Content
              is the Customer&apos;s confidential information.
            </p>
          </Section>

          <Section title="13. Service levels and support">
            <p>
              For the Team plan we target a 99.5% monthly uptime on the SaaS infrastructure. Enterprise
              plan customers receive a 99.9% target plus a documented incident-response SLA in their
              order form. On-premise deployments are operated by the Customer; we provide patches,
              security advisories, and named-engineer escalation as agreed in the order form.
            </p>
          </Section>

          <Section title="14. Disclaimer of warranties">
            <p>
              EXCEPT AS EXPRESSLY STATED, THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
              WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED
              WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT,
              UNINTERRUPTED OPERATION, OR ACCURACY OF AI OUTPUTS.
            </p>
          </Section>

          <Section title="15. Limitation of liability">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER PARTY WILL BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR LOSS OF PROFITS, REVENUE,
              GOODWILL, OR DATA, ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE, EVEN IF
              ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. EACH PARTY&apos;S AGGREGATE LIABILITY UNDER
              THESE TERMS IS LIMITED TO THE FEES PAID OR PAYABLE BY THE CUSTOMER UNDER THE
              APPLICABLE SUBSCRIPTION IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO
              THE CLAIM. THE LIMITATIONS IN THIS SECTION DO NOT APPLY TO BREACHES OF CONFIDENTIALITY,
              INDEMNIFICATION OBLIGATIONS, OR FEES OWED.
            </p>
          </Section>

          <Section title="16. Indemnification">
            <p>
              Each party will defend and indemnify the other against third-party claims (a) alleging
              that the indemnifying party&apos;s materials infringe such third party&apos;s intellectual
              property rights, or (b) arising from the indemnifying party&apos;s breach of these Terms,
              subject to standard procedural conditions (prompt notice, reasonable cooperation, and
              control of defense and settlement).
            </p>
          </Section>

          <Section title="17. Termination">
            <p>
              Either party may terminate these Terms for material breach by the other if the breach
              is not cured within thirty (30) days of written notice. We may suspend access without
              prior notice if your use poses an imminent security or legal risk. On termination, the
              Customer&apos;s access ceases at the end of the prepaid period (or immediately for material
              breach by the Customer). The Customer has thirty (30) days post-termination to request
              an export of its content; after that we permanently delete the content as described in
              the <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </Section>

          <Section title="18. Modifications">
            <p>
              We may update these Terms as the product evolves. Material changes will be notified to
              organization admins by email at least 30 days in advance. The &ldquo;Last updated&rdquo; date at
              the top of this page reflects the latest revision. Continued use after the effective
              date constitutes acceptance.
            </p>
          </Section>

          <Section title="19. Governing law and dispute resolution">
            <p>
              These Terms are governed by the laws of India, without regard to conflict-of-laws
              principles. Disputes will be submitted to the exclusive jurisdiction of the courts of
              Bengaluru, India, except that either party may seek injunctive relief in any court of
              competent jurisdiction to protect its intellectual property or confidential information.
              Customers under a separately executed master services agreement may have different
              governing-law and venue terms.
            </p>
          </Section>

          <Section title="20. General">
            <p>
              These Terms constitute the entire agreement between the parties on this subject, and
              supersede all prior or contemporaneous communications. If any provision is held
              unenforceable, the remainder will continue in full force. Failure to enforce a right
              is not a waiver. You may not assign these Terms without our written consent; we may
              assign in connection with a merger, acquisition, or sale of substantially all our
              assets.
            </p>
          </Section>

          <Section title="21. Contact">
            <p>
              <strong>Reattend Technologies Private Limited</strong><br />
              General contact: <a href="mailto:pb@reattend.ai">pb@reattend.ai</a><br />
              Privacy: <a href="mailto:privacy@reattend.ai">privacy@reattend.ai</a><br />
              Security: <a href="mailto:security@reattend.ai">security@reattend.ai</a>
            </p>
          </Section>
        </article>
      </main>

      <SiteFooter />
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
