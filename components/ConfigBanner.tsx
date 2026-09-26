"use client";

import {
  ADMIN_CAP_ID,
  AUCTION_ID,
  MACHINE_ASSET_ID,
  PACKAGE_ID,
  WORLD_APP_ID,
  IS_CONFIGURED,
} from "@/lib/config";
import { ObjectLink, Notice } from "@/components/ui";

export function ConfigBanner() {
  if (!IS_CONFIGURED) {
    return (
      <Notice tone="warn">
        <p className="font-semibold">Not deployed yet.</p>
        <p className="mt-1">
          Run <code className="font-mono">npm run sui:deploy</code> then{" "}
          <code className="font-mono">npm run sui:seed</code>, copy the printed
          IDs into <code className="font-mono">.env.local</code>, and restart.
          The UI reads all live state from Sui.
        </p>
      </Notice>
    );
  }
  return (
    <div className="card">
      <div className="label">Deployment</div>
      <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
        <div className="flex justify-between gap-2">
          <span className="text-muted">Package</span>
          <ObjectLink id={PACKAGE_ID} />
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted">Auction</span>
          <ObjectLink id={AUCTION_ID} />
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted">Machine</span>
          <ObjectLink id={MACHINE_ASSET_ID} />
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted">AdminCap</span>
          <ObjectLink id={ADMIN_CAP_ID} />
        </div>
      </div>
      {!WORLD_APP_ID && (
        <p className="mt-3 text-xs text-warn">
          NEXT_PUBLIC_WORLD_APP_ID is empty — World verification will not open.
        </p>
      )}
    </div>
  );
}
