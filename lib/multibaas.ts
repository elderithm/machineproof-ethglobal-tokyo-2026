// Curvegrid MultiBaas read layer for the EVM provenance mirror.
//
// The DApp User API key is browser-safe (frontend reads only), so these run
// client-side. Method signatures are pinned to @curvegrid/multibaas-sdk 1.1.1:
//   callContractFunction(addressOrAlias, contract, method, postMethodArgs)
//   listEvents(blockHash?, blockNumber?, txIndexInBlock?, eventIndexInLog?,
//              txHash?, fromConstructor?, contractAddress?, contractLabel?,
//              eventSignature?, limit?, offset?)
// (Confirmed against the installed .d.ts.)

import * as MultiBaas from "@curvegrid/multibaas-sdk";
import {
  MULTIBAAS_DAPP_KEY,
  MULTIBAAS_DEPLOYMENT_URL,
  MULTIBAAS_REGISTRY_ALIAS,
  MULTIBAAS_REGISTRY_LABEL,
} from "@/lib/config";

function apis() {
  const config = new MultiBaas.Configuration({
    basePath: new URL("/api/v0", MULTIBAAS_DEPLOYMENT_URL).toString(),
    accessToken: MULTIBAAS_DAPP_KEY,
  });
  return {
    contracts: new MultiBaas.ContractsApi(config),
    events: new MultiBaas.EventsApi(config),
  };
}

export type EvmMachineRecord = {
  machineId: string;
  provenanceHash: string;
  inspectionHash: string;
  metadataURI: string;
  registrar: string;
  updatedAt: string;
};

/** Read the machine record via getMachine(bytes32). */
export async function readEvmMachine(
  machineId: string,
): Promise<EvmMachineRecord | null> {
  const { contracts } = apis();
  const resp = await contracts.callContractFunction(
    MULTIBAAS_REGISTRY_ALIAS,
    MULTIBAAS_REGISTRY_LABEL,
    "getMachine",
    { args: [machineId] },
  );
  // View calls return { kind: "MethodCallResponse", output: <decoded tuple> }.
  const out = (resp.data?.result as { output?: unknown } | undefined)?.output as
    | Record<string, unknown>
    | unknown[]
    | undefined;
  if (!out) return null;
  const get = (k: string, i: number) =>
    Array.isArray(out)
      ? out[i]
      : (out as Record<string, unknown>)[k];
  return {
    machineId: String(get("machineId", 0) ?? ""),
    provenanceHash: String(get("provenanceHash", 1) ?? ""),
    inspectionHash: String(get("inspectionHash", 2) ?? ""),
    metadataURI: String(get("metadataURI", 3) ?? ""),
    registrar: String(get("registrar", 4) ?? ""),
    updatedAt: String(get("updatedAt", 5) ?? ""),
  };
}

export type EvmEvent = {
  name: string;
  triggeredAt: string;
  txHash: string;
  fields: { name: string; value: string }[];
};

/** List recent indexed events for the registry contract (all event types). */
export async function listEvmEvents(limit = 50): Promise<EvmEvent[]> {
  const { events } = apis();
  const resp = await events.listEvents(
    undefined, // blockHash
    undefined, // blockNumber
    undefined, // txIndexInBlock
    undefined, // eventIndexInLog
    undefined, // txHash
    undefined, // fromConstructor
    undefined, // contractAddress
    MULTIBAAS_REGISTRY_LABEL, // contractLabel
    undefined, // eventSignature (all)
    limit,
  );
  const rows = (resp.data?.result as unknown[] | undefined) ?? [];
  return rows.map((r) => {
    const row = r as {
      triggeredAt?: string;
      event?: {
        name?: string;
        inputs?: { name?: string; value?: unknown }[];
      };
      transaction?: { txHash?: string; transactionHash?: string };
    };
    return {
      name: row.event?.name ?? "Event",
      triggeredAt: row.triggeredAt ?? "",
      txHash: row.transaction?.txHash ?? row.transaction?.transactionHash ?? "",
      fields: (row.event?.inputs ?? []).map((f) => ({
        name: f.name ?? "",
        value: String(f.value ?? ""),
      })),
    };
  });
}
