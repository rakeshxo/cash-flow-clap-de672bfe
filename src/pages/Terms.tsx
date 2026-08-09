import { Link } from "react-router-dom";
import Seo from "@/components/Seo";

const LegalSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="font-display text-lg font-bold uppercase tracking-wider text-foreground">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

const Terms = () => {
  const updated = "August 2026";

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Terms of Service | Survey Paradox"
        description="The rules for using Survey Paradox: accounts, earning coins, withdrawals, fair use, and account suspension."
        path="/terms"
      />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <Link to="/" className="text-xs uppercase tracking-widest text-primary hover:underline">
          ← Back to home
        </Link>
        <h1 className="mt-4 font-display text-3xl font-bold uppercase tracking-wider text-foreground">
          Terms of Service
        </h1>
        <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">Last updated: {updated}</p>

        <div className="mt-10 space-y-10">
          <LegalSection title="Accepting these terms">
            <p>
              By creating an account or using Survey Paradox you agree to these terms. If you do not agree, please do
              not use the platform.
            </p>
          </LegalSection>

          <LegalSection title="Your account">
            <ul className="list-disc space-y-2 pl-5">
              <li>You must provide accurate information and keep your login credentials secure.</li>
              <li>One account per person. Duplicate or shared accounts may be suspended.</li>
              <li>You are responsible for all activity that happens under your account.</li>
            </ul>
          </LegalSection>

          <LegalSection title="Earning coins">
            <p>
              Coins are awarded for completed surveys, videos, offers, and other tasks shown in the app. Rewards for
              third-party surveys are credited after the submission is verified. Screener questions determine
              eligibility; if you do not qualify for a survey, no reward is due. Coins have no cash value until a
              withdrawal is approved and paid.
            </p>
          </LegalSection>

          <LegalSection title="Withdrawals">
            <ul className="list-disc space-y-2 pl-5">
              <li>The minimum withdrawal is 500 coins.</li>
              <li>Only one withdrawal request can be pending at a time.</li>
              <li>Requests are reviewed before payout, and coins are returned if a request is rejected.</li>
              <li>
                A payout destination may only be linked to a single account. Shared destinations are flagged and
                blocked.
              </li>
              <li>Withdrawals are paused while an account is under review.</li>
            </ul>
          </LegalSection>

          <LegalSection title="Fair use">
            <p>You agree not to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Submit false, random, or automated survey answers.</li>
              <li>Use bots, scripts, VPN masking, or emulators to manipulate rewards.</li>
              <li>Create multiple accounts or share payout details with other members.</li>
              <li>Attempt to bypass rate limits, screeners, or platform security controls.</li>
            </ul>
          </LegalSection>

          <LegalSection title="Suspension and forfeiture">
            <p>
              We may flag, suspend, or close accounts that breach these terms or show signs of fraud, and we may
              withhold or reverse coins earned through such activity. Where possible we will tell you why an action was
              taken.
            </p>
          </LegalSection>

          <LegalSection title="Third-party surveys">
            <p>
              Some surveys are hosted by third parties. Their content, availability, and terms are outside our control,
              and completing them is subject to their rules.
            </p>
          </LegalSection>

          <LegalSection title="Changes to the service">
            <p>
              We may add, change, or remove features, reward amounts, and earning opportunities. We may update these
              terms; continued use after an update means you accept the revised terms.
            </p>
          </LegalSection>

          <LegalSection title="Contact">
            <p>
              Questions about these terms? Reach us at{" "}
              <a href="mailto:pie99110@gmail.com" className="text-primary underline underline-offset-2">
                contact@surveyparadox.com
              </a>
              .
            </p>
          </LegalSection>
        </div>

        <div className="mt-12 border-t border-border/60 pt-6 text-xs uppercase tracking-widest text-muted-foreground">
          <Link to="/privacy" className="text-primary underline underline-offset-2">
            Privacy Policy
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Terms;
