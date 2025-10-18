import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_HUB_ID = 101;
const ERR_INVALID_PROPOSAL_TEXT = 102;
const ERR_INVALID_GOALS = 103;
const ERR_INVALID_VOTING_DEADLINE = 104;
const ERR_INVALID_THRESHOLD = 105;
const ERR_PROPOSAL_ALREADY_EXISTS = 106;
const ERR_PROPOSAL_NOT_FOUND = 107;
const ERR_INVALID_TIMESTAMP = 108;
const ERR_HUB_NOT_VERIFIED = 109;
const ERR_INVALID_MIN_VOTES = 110;
const ERR_INVALID_MAX_OPTIONS = 111;
const ERR_MAX_PROPOSALS_EXCEEDED = 114;
const ERR_INVALID_UPDATE_PARAM = 113;
const ERR_INVALID_PROPOSAL_TYPE = 115;
const ERR_INVALID_WEIGHT = 116;
const ERR_VOTING_CLOSED = 119;
const ERR_ALREADY_VOTED = 118;
const ERR_INVALID_OPTION = 120;

interface Proposal {
  hubId: number;
  text: string;
  goals: string;
  votingDeadline: number;
  threshold: number;
  timestamp: number;
  creator: string;
  proposalType: string;
  weight: number;
  status: boolean;
  minVotes: number;
  maxOptions: number;
  voteCount: number;
}

interface ProposalUpdate {
  updateText: string;
  updateGoals: string;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class ProposalManagerMock {
  state: {
    nextProposalId: number;
    maxProposals: number;
    submissionFee: number;
    hubRegistryContract: string | null;
    proposals: Map<number, Proposal>;
    proposalUpdates: Map<number, ProposalUpdate>;
    proposalsByHub: Map<number, number[]>;
    votes: Map<string, number>;
    voteOptions: Map<number, string[]>;
  } = {
    nextProposalId: 0,
    maxProposals: 1000,
    submissionFee: 500,
    hubRegistryContract: null,
    proposals: new Map(),
    proposalUpdates: new Map(),
    proposalsByHub: new Map(),
    votes: new Map(),
    voteOptions: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  authorities: Set<string> = new Set(["ST1TEST"]);
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextProposalId: 0,
      maxProposals: 1000,
      submissionFee: 500,
      hubRegistryContract: null,
      proposals: new Map(),
      proposalUpdates: new Map(),
      proposalsByHub: new Map(),
      votes: new Map(),
      voteOptions: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.authorities = new Set(["ST1TEST"]);
    this.stxTransfers = [];
  }

  isVerifiedAuthority(principal: string): Result<boolean> {
    return { ok: true, value: this.authorities.has(principal) };
  }

  setHubRegistryContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.hubRegistryContract !== null) {
      return { ok: false, value: false };
    }
    this.state.hubRegistryContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setSubmissionFee(newFee: number): Result<boolean> {
    if (!this.state.hubRegistryContract) return { ok: false, value: false };
    this.state.submissionFee = newFee;
    return { ok: true, value: true };
  }

  submitProposal(
    hubId: number,
    text: string,
    goals: string,
    votingDeadline: number,
    threshold: number,
    proposalType: string,
    weight: number,
    minVotes: number,
    maxOptions: number,
    options: string[]
  ): Result<number> {
    if (this.state.nextProposalId >= this.state.maxProposals) return { ok: false, value: ERR_MAX_PROPOSALS_EXCEEDED };
    if (hubId <= 0) return { ok: false, value: ERR_INVALID_HUB_ID };
    if (!text || text.length > 500) return { ok: false, value: ERR_INVALID_PROPOSAL_TEXT };
    if (!goals || goals.length > 300) return { ok: false, value: ERR_INVALID_GOALS };
    if (votingDeadline <= this.blockHeight) return { ok: false, value: ERR_INVALID_VOTING_DEADLINE };
    if (threshold <= 0 || threshold > 100) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (!["policy", "amendment", "initiative"].includes(proposalType)) return { ok: false, value: ERR_INVALID_PROPOSAL_TYPE };
    if (weight > 10) return { ok: false, value: ERR_INVALID_WEIGHT };
    if (minVotes <= 0) return { ok: false, value: ERR_INVALID_MIN_VOTES };
    if (maxOptions <= 0 || maxOptions > 10) return { ok: false, value: ERR_INVALID_MAX_OPTIONS };
    if (!this.isVerifiedAuthority(this.caller).value) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (!this.state.hubRegistryContract) return { ok: false, value: ERR_HUB_NOT_VERIFIED };
    this.stxTransfers.push({ amount: this.state.submissionFee, from: this.caller, to: this.state.hubRegistryContract });
    const id = this.state.nextProposalId;
    const proposal: Proposal = {
      hubId,
      text,
      goals,
      votingDeadline,
      threshold,
      timestamp: this.blockHeight,
      creator: this.caller,
      proposalType,
      weight,
      status: true,
      minVotes,
      maxOptions,
      voteCount: 0,
    };
    this.state.proposals.set(id, proposal);
    this.state.voteOptions.set(id, options);
    const hubProposals = this.state.proposalsByHub.get(hubId) || [];
    hubProposals.push(id);
    this.state.proposalsByHub.set(hubId, hubProposals);
    this.state.nextProposalId++;
    return { ok: true, value: id };
  }

  getProposal(id: number): Proposal | null {
    return this.state.proposals.get(id) || null;
  }

  updateProposal(id: number, updateText: string, updateGoals: string): Result<boolean> {
    const proposal = this.state.proposals.get(id);
    if (!proposal) return { ok: false, value: false };
    if (proposal.creator !== this.caller) return { ok: false, value: false };
    if (this.blockHeight >= proposal.votingDeadline) return { ok: false, value: false };
    if (!updateText || updateText.length > 500) return { ok: false, value: false };
    if (!updateGoals || updateGoals.length > 300) return { ok: false, value: false };
    const updated: Proposal = {
      ...proposal,
      text: updateText,
      goals: updateGoals,
      timestamp: this.blockHeight,
    };
    this.state.proposals.set(id, updated);
    this.state.proposalUpdates.set(id, {
      updateText,
      updateGoals,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  voteOnProposal(id: number, optionIndex: number): Result<boolean> {
    const proposal = this.state.proposals.get(id);
    if (!proposal) return { ok: false, value: false };
    if (this.blockHeight < proposal.timestamp) return { ok: false, value: false };
    if (this.blockHeight >= proposal.votingDeadline) return { ok: false, value: false };
    const voteKey = `${id}-${this.caller}`;
    if (this.state.votes.has(voteKey)) return { ok: false, value: false };
    if (optionIndex >= proposal.maxOptions) return { ok: false, value: false };
    this.state.votes.set(voteKey, optionIndex);
    const updated: Proposal = {
      ...proposal,
      voteCount: proposal.voteCount + 1,
    };
    this.state.proposals.set(id, updated);
    return { ok: true, value: true };
  }

  getProposalCount(): Result<number> {
    return { ok: true, value: this.state.nextProposalId };
  }

  checkProposalExistence(hubId: number, proposalId: number): Result<boolean> {
    const hubProposals = this.state.proposalsByHub.get(hubId) || [];
    return { ok: true, value: hubProposals.includes(proposalId) };
  }

  getVoteOptions(id: number): string[] | null {
    return this.state.voteOptions.get(id) || null;
  }

  getVoteCount(id: number): number {
    const proposal = this.state.proposals.get(id);
    return proposal ? proposal.voteCount : 0;
  }
}

describe("ProposalManager", () => {
  let contract: ProposalManagerMock;

  beforeEach(() => {
    contract = new ProposalManagerMock();
    contract.reset();
  });

  it("submits a proposal successfully", () => {
    contract.setHubRegistryContract("ST2TEST");
    const result = contract.submitProposal(
      1,
      "Policy Text",
      "Goals Description",
      100,
      50,
      "policy",
      5,
      10,
      3,
      ["Yes", "No", "Abstain"]
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const proposal = contract.getProposal(0);
    expect(proposal?.text).toBe("Policy Text");
    expect(proposal?.goals).toBe("Goals Description");
    expect(proposal?.votingDeadline).toBe(100);
    expect(proposal?.threshold).toBe(50);
    expect(proposal?.proposalType).toBe("policy");
    expect(proposal?.weight).toBe(5);
    expect(proposal?.minVotes).toBe(10);
    expect(proposal?.maxOptions).toBe(3);
    expect(contract.getVoteOptions(0)).toEqual(["Yes", "No", "Abstain"]);
    expect(contract.stxTransfers).toEqual([{ amount: 500, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects submission without hub registry", () => {
    const result = contract.submitProposal(
      1,
      "Policy Text",
      "Goals Description",
      100,
      50,
      "policy",
      5,
      10,
      3,
      ["Yes", "No", "Abstain"]
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_HUB_NOT_VERIFIED);
  });

  it("rejects invalid voting deadline", () => {
    contract.setHubRegistryContract("ST2TEST");
    const result = contract.submitProposal(
      1,
      "Policy Text",
      "Goals Description",
      0,
      50,
      "policy",
      5,
      10,
      3,
      ["Yes", "No", "Abstain"]
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_VOTING_DEADLINE);
  });

  it("updates a proposal successfully", () => {
    contract.setHubRegistryContract("ST2TEST");
    contract.submitProposal(
      1,
      "Old Text",
      "Old Goals",
      100,
      50,
      "policy",
      5,
      10,
      3,
      ["Yes", "No", "Abstain"]
    );
    contract.blockHeight = 50;
    const result = contract.updateProposal(0, "New Text", "New Goals");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const proposal = contract.getProposal(0);
    expect(proposal?.text).toBe("New Text");
    expect(proposal?.goals).toBe("New Goals");
    const update = contract.state.proposalUpdates.get(0);
    expect(update?.updateText).toBe("New Text");
    expect(update?.updateGoals).toBe("New Goals");
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update after voting deadline", () => {
    contract.setHubRegistryContract("ST2TEST");
    contract.submitProposal(
      1,
      "Policy Text",
      "Goals Description",
      100,
      50,
      "policy",
      5,
      10,
      3,
      ["Yes", "No", "Abstain"]
    );
    contract.blockHeight = 101;
    const result = contract.updateProposal(0, "New Text", "New Goals");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("casts a vote successfully", () => {
    contract.setHubRegistryContract("ST2TEST");
    contract.submitProposal(
      1,
      "Policy Text",
      "Goals Description",
      100,
      50,
      "policy",
      5,
      10,
      3,
      ["Yes", "No", "Abstain"]
    );
    contract.blockHeight = 50;
    const result = contract.voteOnProposal(0, 0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.getVoteCount(0)).toBe(1);
  });

  it("rejects vote after deadline", () => {
    contract.setHubRegistryContract("ST2TEST");
    contract.submitProposal(
      1,
      "Policy Text",
      "Goals Description",
      100,
      50,
      "policy",
      5,
      10,
      3,
      ["Yes", "No", "Abstain"]
    );
    contract.blockHeight = 101;
    const result = contract.voteOnProposal(0, 0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects duplicate vote", () => {
    contract.setHubRegistryContract("ST2TEST");
    contract.submitProposal(
      1,
      "Policy Text",
      "Goals Description",
      100,
      50,
      "policy",
      5,
      10,
      3,
      ["Yes", "No", "Abstain"]
    );
    contract.blockHeight = 50;
    contract.voteOnProposal(0, 0);
    const result = contract.voteOnProposal(0, 1);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects invalid option index", () => {
    contract.setHubRegistryContract("ST2TEST");
    contract.submitProposal(
      1,
      "Policy Text",
      "Goals Description",
      100,
      50,
      "policy",
      5,
      10,
      3,
      ["Yes", "No", "Abstain"]
    );
    contract.blockHeight = 50;
    const result = contract.voteOnProposal(0, 3);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct proposal count", () => {
    contract.setHubRegistryContract("ST2TEST");
    contract.submitProposal(
      1,
      "Policy1",
      "Goals1",
      100,
      50,
      "policy",
      5,
      10,
      3,
      ["Yes", "No"]
    );
    contract.submitProposal(
      2,
      "Policy2",
      "Goals2",
      200,
      60,
      "amendment",
      6,
      15,
      2,
      ["Approve", "Reject"]
    );
    const result = contract.getProposalCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks proposal existence correctly", () => {
    contract.setHubRegistryContract("ST2TEST");
    contract.submitProposal(
      1,
      "Policy Text",
      "Goals Description",
      100,
      50,
      "policy",
      5,
      10,
      3,
      ["Yes", "No", "Abstain"]
    );
    const result = contract.checkProposalExistence(1, 0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const result2 = contract.checkProposalExistence(1, 99);
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("parses proposal parameters with Clarity types", () => {
    const text = stringUtf8CV("Policy Text");
    const threshold = uintCV(50);
    expect(text.value).toBe("Policy Text");
    expect(threshold.value).toEqual(BigInt(50));
  });

  it("rejects submission with max proposals exceeded", () => {
    contract.setHubRegistryContract("ST2TEST");
    contract.state.maxProposals = 1;
    contract.submitProposal(
      1,
      "Policy1",
      "Goals1",
      100,
      50,
      "policy",
      5,
      10,
      3,
      ["Yes", "No"]
    );
    const result = contract.submitProposal(
      2,
      "Policy2",
      "Goals2",
      200,
      60,
      "amendment",
      6,
      15,
      2,
      ["Approve", "Reject"]
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_PROPOSALS_EXCEEDED);
  });

  it("sets hub registry contract successfully", () => {
    const result = contract.setHubRegistryContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.hubRegistryContract).toBe("ST2TEST");
  });

  it("rejects invalid hub registry contract", () => {
    const result = contract.setHubRegistryContract("SP000000000000000000002Q6VF78");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
});