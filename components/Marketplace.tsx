"use client";

import { useState } from "react";
import { AUCTION_ID } from "@/lib/config";
import { AuctionsList } from "@/components/AuctionsList";
import { MachinePassport } from "@/components/MachinePassport";
import { AuctionPanel } from "@/components/AuctionPanel";
import { SettlementPanel } from "@/components/SettlementPanel";

// Holds the selected auction. Defaults to the featured auction from env; the
// marketplace list lets a bidder switch to any created auction.
export function Marketplace() {
  const [selected, setSelected] = useState(AUCTION_ID);

  return (
    <div className="space-y-6">
      <AuctionsList selectedId={selected} onSelect={setSelected} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MachinePassport />
        <AuctionPanel auctionId={selected} />
      </div>
      <SettlementPanel auctionId={selected} />
    </div>
  );
}
