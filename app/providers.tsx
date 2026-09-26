"use client";

import "@mysten/dapp-kit/dist/index.css";
import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  SuiClientProvider,
  WalletProvider,
  createNetworkConfig,
} from "@mysten/dapp-kit";
import { SUI_NETWORK, SUI_RPC_URL } from "@/lib/config";

const { networkConfig } = createNetworkConfig({
  [SUI_NETWORK]: { url: SUI_RPC_URL, network: SUI_NETWORK },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={SUI_NETWORK}>
        <WalletProvider autoConnect>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
