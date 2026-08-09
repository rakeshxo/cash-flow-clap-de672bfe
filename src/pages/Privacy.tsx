import { Link } from "react-router-dom";
import Seo from "@/components/Seo";

const LegalSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="font-display text-lg font-bold uppercase tracking-wider text-foreground">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

const Privacy = () => {
  const updated = "August 2026";

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Privacy Policy | Survey Paradox"
        description="How Survey Paradox collects, uses, and protects your personal data when you take surveys and earn rewards."
        path="/privacy"
      />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <Link to="/" className="text-xs uppercase tracking-widest text-primary hover:underline">
          ← Back to home
        </Link>
        <h1 className="mt-4 font-display text-3xl font-bold uppercase tracking-wider text-foreground">
          Privacy Policy
        </h1>
        <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">Last updated: {updated}</p>

        <div className="mt-10 space-y-10">
          <LegalSection title="Who we are">
            <p>
              Survey Paradox ("we", "us") operates this platform, where members complete surveys and other
              tasks to earn coins that can be withdrawn as rewards. This policy explains what data we handle
              and why.
            </p>
          </LegalSection>

          <LegalSection title="Data we collect">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Account data</strong> — your email address and display
                name, provided when you sign up or sign in with Google.
              </li>
              <li>
                <strong className="text-foreground">Profile and background data</strong> — optional
                demographic details you enter during onboarding (such as age range, country, employment and
                interests) used to match you to relevant surveys.
              </li>
              <li>
                <strong className="text-foreground">Activity data</strong> — surveys started and completed,
                videos watched, coin transactions, and withdrawal requests.
              </li>
              <li>
                <strong className="text-foreground">Payout data</strong> — the payout destination you supply
                when requesting a withdrawal.
              </li>
              <li>
                <strong className="text-foreground">Security data</strong> — limited technical and usage
                signals used to detect fraud, duplicate accounts, and abuse.
              </li>
            </ul>
          </LegalSection>

          <LegalSection title="How we use your data">
            <ul className="list-disc space-y-2 pl-5">
              <li>To create and operate your account and keep you signed in.</li>
              <li>To recommend surveys that match your profile.</li>
              <li>To calculate coin balances and process withdrawal requests.</li>
              <li>To prevent fraud, enforce fair use, and protect other members.</li>
              <li>To respond to your requests and send account notifications.</li>
            </ul>
          </LegalSection>

          <LegalSection title="Cookies and similar technologies">
            <p>
              Essential cookies and local storage keep your session active and protect the platform. Optional
              cookies help us understand how the site is used. You choose your preference in the cookie
              banner, and you can change it at any time by clearing your browser storage for this site.
            </p>
          </LegalSection>

          <LegalSection title="Sharing">
            <p>
              We do not sell your personal data. When you choose to open a third-party survey, you are taken
              to that provider's site and their own privacy terms apply to what you do there. We also rely on
              service providers for hosting, authentication, and database infrastructure, who process data on
              our behalf.
            </p>
          </LegalSection>

          <LegalSection title="Retention">
            <p>
              We keep account, activity, and payout records for as long as your account is active and for as
              long as needed to resolve disputes and meet record-keeping obligations.
            </p>
          </LegalSection>

          <LegalSection title="Your choices">
            <p>
              You can review and update your profile details at any time from your profile page. You can
              request a copy of your data or ask us to delete your account by contacting us. Deleting your
              account removes access to any unredeemed coin balance.
            </p>
          </LegalSection>

          <LegalSection title="Security">
            <p>
              Access to member data is restricted by authentication and per-user access rules, and
              administrative actions are logged. No online service can promise perfect security, so please
              use a strong, unique password.
            </p>
          </LegalSection>

          <LegalSection title="Contact">
            <p>
              Questions about this policy or your data? Reach us at{" "}
              <a href="mailto:pie99110@gmail.com" className="text-primary hover:underline">
                pie99110@gmail.com
              </a>
              .
            </p>
          </LegalSection>
        </div>

        <div className="mt-12 border-t border-border/60 pt-6 text-xs uppercase tracking-widest text-muted-foreground">
          <Link to="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Privacy;
