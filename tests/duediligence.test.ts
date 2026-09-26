import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRulesChecklist } from "../lib/duediligence";

test("a complete passport satisfies every checklist item", () => {
  const r = buildRulesChecklist({
    machineId: "MP-JP-0001",
    manufacturer: "MAZAK",
    model: "QUICK TURN 200",
    inspectionStatus: "Verified",
    provenanceHash: "sha256:abc",
    provenance: [
      { label: "Export inspection", value: "Completed" },
      { label: "Maintenance", value: "Documented service history" },
    ],
  });
  assert.ok(r.checklist.every((i) => i.status === "ok"));
  assert.match(r.summary, /not an independent physical inspection/);
});

test("a sparse passport flags warn/missing (honest gaps)", () => {
  const r = buildRulesChecklist({
    machineId: "",
    manufacturer: "",
    model: "",
  });
  const byLabel = Object.fromEntries(r.checklist.map((i) => [i.label, i.status]));
  assert.equal(byLabel["Machine identity present"], "missing");
  assert.equal(byLabel["Manufacturer / model"], "missing");
  assert.equal(byLabel["Provenance commitment anchored"], "warn");
  assert.equal(byLabel["Export documentation"], "warn");
});
