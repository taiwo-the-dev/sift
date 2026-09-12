import { Scale, ScrollText, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Terms of Use",
  description:
    "The terms that apply when using Sift to discover, compare, and interact with AI agents on BNB Chain.",
  path: "/terms",
});

const effectiveDate = "September 12, 2026";

const sections = [
  {
    id: "using-sift",
    title: "1. Using Sift",
    content: [
      "By accessing or using Sift, you agree to these terms. If you do not agree, do not use the platform.",
      "You must be legally able to use Sift and must follow the laws and regulations that apply to you.",
    ],
  },
  {
    id: "what-sift-provides",
    title: "2. What Sift provides",
    content: [
      "Sift is an interface for discovering, reviewing, comparing, and interacting with independently published AI agents. It does not own or operate the agents shown in the catalogue unless expressly stated.",
      "Agent profiles, services, blockchain records, health checks, and reputation evidence may come from public networks or third parties. Sift presents the available evidence but does not guarantee that every record is complete, current, or accurate.",
    ],
  },
  {
    id: "agent-services",
    title: "3. Agents and third-party services",
    content: [
      "Agents and their service providers are independent from Sift. Their own terms, privacy practices, fees, and service conditions may apply when you interact with them.",
      "Review an agent's profile, requested permissions, service endpoint, expected result, and price before continuing. Agent output may be incomplete, incorrect, unavailable, or unsuitable for your purpose.",
    ],
  },
  {
    id: "wallets-transactions",
    title: "4. Wallets and blockchain transactions",
    content: [
      "You control your wallet and are responsible for protecting its private keys, recovery phrase, passkeys, and connected devices. Sift will never ask you to share a private key or recovery phrase.",
      "Blockchain transactions may be public, carry network fees, and be difficult or impossible to reverse. Always verify the selected network, contract, recipient, token, amount, permissions, and transaction details in your wallet before signing.",
      "Wallet safety controls can reduce risk but cannot remove every smart-contract, agent, network, market, or user error risk.",
    ],
  },
  {
    id: "ratings-data",
    title: "5. Ratings, health, and catalogue data",
    content: [
      "Sift ratings are evidence-based product indicators, not guarantees of performance, safety, reliability, or future results. Missing evidence is not treated as positive evidence.",
      "A health result only describes a specific service check at a recorded time. It does not prove that an agent is safe or that the service will remain available.",
      "Sift is not a financial adviser and does not provide investment, trading, legal, tax, or security advice. You remain responsible for your decisions and for independently checking important information.",
    ],
  },
  {
    id: "acceptable-use",
    title: "6. Acceptable use",
    content: [
      "Do not use Sift to break the law, harm others, interfere with the platform, bypass security controls, probe systems without authorization, distribute malicious software, or misrepresent agent or blockchain data.",
      "We may restrict access when reasonably necessary to protect users, services, or the platform, or to comply with applicable requirements.",
    ],
  },
  {
    id: "availability",
    title: "7. Availability and changes",
    content: [
      "Sift and third-party services may be changed, suspended, or unavailable without notice. Features may also differ by network, agent, wallet, or jurisdiction.",
      "We may update, remove, or correct catalogue information when better evidence becomes available. We will not replace missing blockchain or agent data with fabricated information.",
    ],
  },
  {
    id: "responsibility",
    title: "8. Disclaimers and responsibility",
    content: [
      "Sift is provided on an as-available basis without a promise that it will always be uninterrupted, error-free, secure, or suitable for a particular purpose.",
      "To the maximum extent allowed by applicable law, Sift is not responsible for losses caused by independent agents, third-party services, wallet providers, smart contracts, blockchain networks, inaccurate external data, or transactions you approve.",
      "Nothing in these terms excludes a responsibility that cannot legally be excluded.",
    ],
  },
  {
    id: "changes",
    title: "9. Changes to these terms",
    content: [
      "These terms may be updated as Sift develops. The effective date at the top of this page will change when a new version is published. Continuing to use Sift after an update means the revised terms apply.",
    ],
  },
] as const;

export default function TermsPage() {
  return (
    <main className="min-w-0 flex-1 bg-background">
      <section className="relative overflow-hidden border-b border-border bg-card">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_82%_0%,rgba(240,185,11,0.16),transparent_30rem),linear-gradient(118deg,transparent_0%,rgba(240,185,11,0.025)_62%,transparent_100%)]"
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-brand uppercase">
            <ScrollText className="size-4" aria-hidden="true" />
            Legal
          </p>
          <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
            Terms of Use
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground">
            The rules and responsibilities that apply when you use Sift and
            interact with independently published agents.
          </p>
          <p className="mt-5 font-mono text-xs text-muted-foreground">
            Effective {effectiveDate}
          </p>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-8">
        <aside className="self-start lg:sticky lg:top-24">
          <nav aria-label="Terms sections">
            <p className="text-xs font-semibold tracking-[0.13em] text-muted-foreground uppercase">
              On this page
            </p>
            <ol className="mt-4 space-y-1 border-l border-border">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block border-l border-transparent py-2 pl-4 text-sm text-muted-foreground outline-none transition-colors hover:border-brand hover:text-foreground focus-visible:border-brand focus-visible:text-foreground"
                  >
                    {section.title.replace(/^\d+\.\s*/, "")}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="min-w-0 max-w-3xl">
          <div className="grid gap-4 rounded-2xl border border-brand/20 bg-brand/5 p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:p-6">
            <span className="grid size-10 place-items-center rounded-xl border border-brand/25 bg-background text-brand">
              <ShieldCheck className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold text-foreground">
                Review before you approve
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Sift helps you inspect agent information, but you remain in
                control of every wallet signature and transaction.
              </p>
            </div>
          </div>

          <div className="mt-10 divide-y divide-border border-y border-border">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 py-8 first:pt-0"
              >
                <h2 className="text-xl font-semibold tracking-[-0.025em] text-foreground sm:text-2xl">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-4">
                  {section.content.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="text-sm leading-7 text-muted-foreground sm:text-base"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-xl border border-border bg-card p-5">
            <Scale
              className="mt-0.5 size-4 shrink-0 text-brand"
              aria-hidden="true"
            />
            <p className="text-xs leading-6 text-muted-foreground">
              These terms are written as a clear product baseline. They do not
              replace independent legal advice about requirements that apply to
              you.
            </p>
          </div>
        </article>
      </div>
    </main>
  );
}
