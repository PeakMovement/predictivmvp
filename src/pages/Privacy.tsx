import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const EFFECTIVE_DATE = "8 March 2026";
const COMPANY = "Predictiv";
const CONTACT_EMAIL = "justin15muller@gmail.com";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Nav bar */}
      <nav className="sticky top-0 bg-white/90 backdrop-blur border-b border-slate-100 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-slate-600">Privacy Policy</span>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-10 pb-20">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">{COMPANY} Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-2">Effective date: {EFFECTIVE_DATE}</p>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 text-sm text-blue-800 leading-relaxed">
          <strong>POPIA notice.</strong> This policy is issued in compliance with the Protection of Personal Information Act 4 of 2013 ("<strong>POPIA</strong>"), the primary data-protection law of the Republic of South Africa. Where this policy refers to your rights as a data subject, those rights are conferred by POPIA.
        </div>

        <Section title="1. Who we are and how to contact us">
          <p>
            {COMPANY} is the responsible party (in POPIA terms: the "<strong>responsible party</strong>") for personal information processed through this application. We are based in the Republic of South Africa.
          </p>
          <p>
            <strong>Data requests and privacy enquiries:</strong>{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a>
          </p>
          <p>
            For any request relating to your personal information — including access, correction, or deletion — please email the address above with the subject line "<em>Privacy Request</em>".
          </p>
        </Section>

        <Section title="2. What personal information we collect">
          <p>We collect the following categories of personal information:</p>

          <SubHeading>Account &amp; identity information</SubHeading>
          <ul>
            <li>Email address and password (authentication)</li>
            <li>Display name / username</li>
            <li>Phone number (optional, for notifications)</li>
            <li>Date of birth and age (for health personalisation)</li>
          </ul>

          <SubHeading>Health and biometric data</SubHeading>
          <ul>
            <li>Wearable device data: heart rate, HRV, SpO₂, sleep scores, activity metrics, readiness scores, body battery, stress levels, VO₂ max, GPS distance (sourced from Oura, Garmin, Polar, and other connected devices)</li>
            <li>Self-reported health goals, medical notes, and injury information</li>
            <li>Symptom check-in responses</li>
            <li>Training load, recovery metrics, and performance trends derived from the above</li>
          </ul>

          <SubHeading>Profile and preferences</SubHeading>
          <ul>
            <li>Athletic goals, training preferences, and lifestyle information</li>
            <li>Uploaded health documents (e.g., scan reports)</li>
            <li>App usage preferences and layout customisations</li>
          </ul>

          <SubHeading>Usage data</SubHeading>
          <ul>
            <li>Log data including IP address, browser type, and pages visited</li>
            <li>Feature interactions used to improve the Service</li>
          </ul>

          <p className="text-slate-500 text-sm italic">
            Health and biometric data is classified as special personal information under POPIA. We process it only with your explicit consent and solely for the purposes described in this policy.
          </p>
        </Section>

        <Section title="3. How we use your information">
          <p>We use your personal information for the following purposes:</p>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="p-3 border border-slate-200 font-semibold text-slate-700">Purpose</th>
                <th className="p-3 border border-slate-200 font-semibold text-slate-700">Legal basis (POPIA)</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Providing the Service, including syncing and displaying your wearable data", "Performance of contract / legitimate interest"],
                ["Generating AI-powered health insights, daily briefings, and recommendations via Yves", "Consent (explicit, for health data)"],
                ["Calculating training load, anomalies, and recovery trends", "Consent (explicit, for health data)"],
                ["Enabling practitioner access to your data when you explicitly invite a practitioner", "Consent"],
                ["Sending service notifications and account communications", "Performance of contract"],
                ["Improving the Service through analysis of aggregate, anonymised usage patterns", "Legitimate interest"],
                ["Complying with legal obligations", "Legal obligation"],
              ].map(([purpose, basis]) => (
                <tr key={purpose} className="border-b border-slate-100">
                  <td className="p-3 border border-slate-200 text-slate-600 align-top">{purpose}</td>
                  <td className="p-3 border border-slate-200 text-slate-500 align-top">{basis}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="font-semibold text-slate-800">
            We do not sell, rent, or trade your personal information — including your health data — to any third party for commercial purposes.
          </p>
        </Section>

        <Section title="4. AI personalisation and automated processing">
          <p>
            {COMPANY} uses a large language model (AI) to generate personalised insights, briefings, and recommendations. Your health and profile data is passed to the AI model solely for this purpose.
          </p>
          <p>
            The AI provider processes data on our behalf as an operator under POPIA. AI-generated outputs are informational only and do not constitute medical decisions. No automated decision with legal or similarly significant effect is made about you without human oversight.
          </p>
          <p>
            You may opt out of AI personalisation by contacting us. Opting out will mean that AI-generated features (Yves briefings and recommendations) are no longer available to you.
          </p>
        </Section>

        <Section title="5. Sharing your information">
          <p>We share your personal information only in the following circumstances:</p>
          <ul>
            <li><strong>Practitioners you invite:</strong> When you explicitly share access with a practitioner via Settings, they receive read-only access to specific data as described on the sharing screen.</li>
            <li><strong>Service providers:</strong> We use Supabase (database and authentication) and AI inference providers as sub-operators. These providers are contractually bound to process data only as instructed by {COMPANY}.</li>
            <li><strong>Legal requirements:</strong> We may disclose your information when required to do so by law, court order, or a lawful request from a public authority.</li>
            <li><strong>Business transfer:</strong> If {COMPANY} is involved in a merger or acquisition, your information may be transferred. We will notify you before your information is transferred and becomes subject to a different privacy policy.</li>
          </ul>
          <p>We do not transfer personal information outside South Africa except where the receiving country provides an adequate level of protection or where you have consented.</p>
        </Section>

        <Section title="6. Data retention">
          <p>
            We retain your personal information for as long as your account is active, plus a period of up to 12 months thereafter to comply with legal obligations and resolve any disputes.
          </p>
          <p>
            Specific retention periods:
          </p>
          <ul>
            <li><strong>Wearable session data:</strong> Retained for the lifetime of the account and deleted within 30 days of account deletion.</li>
            <li><strong>AI-generated content</strong> (briefings, recommendations): Retained for 12 months, then automatically purged.</li>
            <li><strong>Uploaded documents:</strong> Retained until you delete them or your account is closed.</li>
            <li><strong>Usage logs:</strong> Retained for 90 days.</li>
          </ul>
          <p>
            Anonymised and aggregated data (which cannot identify you) may be retained indefinitely for product improvement purposes.
          </p>
        </Section>

        <Section title="7. Your rights as a data subject">
          <p>Under POPIA you have the right to:</p>
          <ul>
            <li><strong>Access</strong> — request a copy of the personal information we hold about you;</li>
            <li><strong>Correction</strong> — request that inaccurate or incomplete information is corrected;</li>
            <li><strong>Deletion</strong> — request erasure of your personal information (subject to our legal retention obligations);</li>
            <li><strong>Objection</strong> — object to the processing of your information on grounds relating to your particular situation;</li>
            <li><strong>Withdrawal of consent</strong> — where processing is based on consent, you may withdraw it at any time without affecting the lawfulness of processing before withdrawal;</li>
            <li><strong>Lodging a complaint</strong> — you may lodge a complaint with the Information Regulator of South Africa (<a href="https://inforegulator.org.za" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">inforegulator.org.za</a>).</li>
          </ul>
          <p>
            To exercise any of these rights, email <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a> with the subject line "<em>Privacy Request</em>". We will respond within 30 days.
          </p>
        </Section>

        <Section title="8. Security">
          <p>
            We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, loss, or disclosure. These include encrypted data storage, TLS in transit, row-level security on the database, and access controls for our team.
          </p>
          <p>
            No method of transmission over the internet is 100% secure. You accept the inherent risks of providing information online.
          </p>
        </Section>

        <Section title="9. Cookies and tracking">
          <p>
            The Service uses browser local storage and session storage to maintain your session and preferences. We do not currently use third-party advertising cookies or cross-site tracking technologies.
          </p>
        </Section>

        <Section title="10. POPIA compliance statement">
          <p>
            {COMPANY} is committed to complying with POPIA and processing personal information lawfully, fairly, and transparently. We collect information only for specific, explicitly defined, and legitimate purposes and do not process it in a manner incompatible with those purposes. We take reasonable steps to ensure information is accurate, complete, and kept no longer than necessary.
          </p>
          <p>
            Our designated Information Officer can be contacted at:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a>
          </p>
        </Section>

        <Section title="11. Changes to this policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material changes by email or in-app notification at least 14 days before the changes take effect. The "Effective date" at the top of this page shows when the policy was last revised.
          </p>
        </Section>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-400">
          <a href="/terms" className="hover:text-slate-600 underline">Terms of Service</a>
          <a href="/" className="hover:text-slate-600">← Back to Predictiv</a>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-slate-900 mb-3">{title}</h2>
      <div className="space-y-3 text-slate-600 leading-relaxed text-sm sm:text-base">
        {children}
      </div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <p className="font-semibold text-slate-700 mt-3 mb-1">{children}</p>;
}
