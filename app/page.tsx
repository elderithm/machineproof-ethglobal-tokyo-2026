import { WalletBar } from "@/components/WalletBar";
import { Marketplace } from "@/components/Marketplace";
import { DueDiligence } from "@/components/DueDiligence";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { EvmProvenance } from "@/components/EvmProvenance";
import { ConfigBanner } from "@/components/ConfigBanner";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            MachineProof
          </h1>
          <p className="mt-1 text-sm text-muted">
            Verified-human auction &amp; programmable settlement for used
            industrial machinery.
          </p>
        </div>
        <WalletBar />
      </header>

      <div className="mt-6 space-y-6">
        <ConfigBanner />
        <Marketplace />
        <DueDiligence />
        <ActivityTimeline />
        <EvmProvenance />
      </div>

      <footer className="mt-10 border-t border-edge pt-6 text-xs text-muted">
        <p>
          World ID gates auction entry (unique-human check bound to auction +
          wallet). Sui Move controls bids, refunds, the winner&apos;s
          PurchaseRight, and milestone settlement. The MachineProof passport
          anchors the physical asset.
        </p>
        <p className="mt-2">
          World ID reduces bot/Sybil registration; it does not prove corporate
          authority or creditworthiness. A PurchaseRight is a demo entitlement,
          not automatic legal title.
        </p>
      </footer>
    </main>
  );
}
