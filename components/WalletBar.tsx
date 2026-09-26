"use client";

import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { SUI_NETWORK, addressUrl, shorten } from "@/lib/config";

export function WalletBar() {
  const account = useCurrentAccount();
  return (
    <div className="flex items-center gap-3">
      <span className="pill text-muted">Sui · {SUI_NETWORK}</span>
      {account && (
        <a
          className="link font-mono text-xs"
          href={addressUrl(account.address)}
          target="_blank"
          rel="noreferrer"
        >
          {shorten(account.address)} ↗
        </a>
      )}
      <ConnectButton />
    </div>
  );
}
