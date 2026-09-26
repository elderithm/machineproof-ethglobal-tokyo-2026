import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

const id = (s: string) => keccak256(toUtf8Bytes(s));

async function deploy() {
  const [owner, other] = await ethers.getSigners();
  const factory = await ethers.getContractFactory("MachineRWARegistry");
  const c = await factory.deploy();
  await c.waitForDeployment();
  return { c, owner, other };
}

describe("MachineRWARegistry", () => {
  it("registers a machine and reads it back", async () => {
    const { c } = await deploy();
    const mid = id("MP-JP-0001");
    await expect(
      c.registerMachine(mid, id("prov"), id("insp"), "ipfs://x"),
    ).to.emit(c, "MachineRegistered");
    const r = await c.getMachine(mid);
    expect(r.machineId).to.equal(mid);
    expect(r.metadataURI).to.equal("ipfs://x");
    expect(r.exists).to.equal(true);
  });

  it("updates provenance and anchors inspection with events", async () => {
    const { c } = await deploy();
    const mid = id("MP-JP-0001");
    await c.registerMachine(mid, id("p0"), id("i0"), "ipfs://x");
    await expect(c.updateProvenance(mid, id("p1"))).to.emit(
      c,
      "ProvenanceUpdated",
    );
    await expect(c.anchorInspection(mid, id("i1"))).to.emit(
      c,
      "InspectionAnchored",
    );
    const r = await c.getMachine(mid);
    expect(r.provenanceHash).to.equal(id("p1"));
    expect(r.inspectionHash).to.equal(id("i1"));
  });

  it("reverts getMachine for an unknown machine", async () => {
    const { c } = await deploy();
    await expect(c.getMachine(id("nope"))).to.be.revertedWithCustomError(
      c,
      "UnknownMachine",
    );
  });

  it("only the owner can register", async () => {
    const { c, other } = await deploy();
    await expect(
      c.connect(other).registerMachine(id("MP-JP-0001"), id("p"), id("i"), "x"),
    ).to.be.revertedWithCustomError(c, "NotOwner");
  });

  it("updateProvenance reverts for an unknown machine", async () => {
    const { c } = await deploy();
    await expect(
      c.updateProvenance(id("nope"), id("p")),
    ).to.be.revertedWithCustomError(c, "UnknownMachine");
  });
});
