import { IndustryDemoModalProvider } from "../components/marketing/industry-demo-modal";
import { MarketingFooter } from "../components/marketing/marketing-footer";
import { MarketingHeader } from "../components/marketing/marketing-header";

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <IndustryDemoModalProvider>
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
        <MarketingHeader />
        <main className="relative min-w-0 flex-1">
          <div
            className="pointer-events-none absolute inset-0 mk-section-pattern opacity-50"
            aria-hidden
          />
          <div className="relative min-w-0">{children}</div>
        </main>
        <MarketingFooter />
      </div>
    </IndustryDemoModalProvider>
  );
}
