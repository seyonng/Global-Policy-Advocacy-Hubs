# 🌍 Global Policy Advocacy Hubs

Welcome to a decentralized platform for global collaboration on policy advocacy! This Web3 project addresses the real-world problem of opaque policy-making processes, lack of trust in endorsements, and barriers to international participation. By leveraging the Stacks blockchain and Clarity smart contracts, it creates transparent "hubs" where activists, organizations, and citizens can collaborate on policy proposals, log endorsements immutably, and track advocacy progress without intermediaries.

## ✨ Features
🌐 Create and join global advocacy hubs for specific policies (e.g., climate action or human rights)  
🤝 Collaborate transparently with multi-signature proposals and voting  
📝 Log endorsements with verifiable timestamps and user identities  
🔒 Prevent fraud through unique endorsement hashes and anti-duplication checks  
📊 Track progress with on-chain analytics for endorsements and hub activities  
🌟 Reward active participants with token incentives for verified contributions  
🔍 Query and verify any endorsement or proposal instantly  
🚀 Integrate with off-chain tools for real-time global discussions  

## 🛠 How It Works
This project uses 8 Clarity smart contracts to build a robust, decentralized system. Each contract handles a specific aspect of the advocacy lifecycle, ensuring modularity and security.

### Key Smart Contracts
1. **HubRegistry.clar**: Manages the creation and registration of advocacy hubs. Stores hub metadata like name, description, and creator.  
2. **ProposalManager.clar**: Allows hub members to submit, edit, and vote on policy proposals using multi-signature approvals.  
3. **EndorsementLogger.clar**: Logs user endorsements with unique hashes, timestamps, and optional anonymous modes to prevent duplicates.  
4. **MembershipToken.clar**: Issues NFTs or fungible tokens for hub membership, controlling access to voting and endorsements.  
5. **VotingSystem.clar**: Handles secure voting on proposals, tallying results transparently with weighted options based on endorsements.  
6. **AnalyticsTracker.clar**: Aggregates on-chain data for hub stats, like total endorsements, active members, and proposal success rates.  
7. **RewardDistributor.clar**: Distributes incentive tokens to participants based on verified contributions (e.g., endorsements or votes).  
8. **VerificationOracle.clar**: Provides functions to verify ownership, endorsements, and proposal statuses for external queries.

**For Advocates/Users**  
- Join a hub by calling `MembershipToken.clar` to mint a membership token.  
- Submit a proposal via `ProposalManager.clar` with details like policy text and goals.  
- Endorse a proposal using `EndorsementLogger.clar`, providing a hash of your support statement.  
- Vote on active proposals through `VotingSystem.clar`—results are immutable!  

**For Hub Creators**  
- Register a new hub with `HubRegistry.clar`, setting initial rules like voting thresholds.  
- Monitor progress with `AnalyticsTracker.clar` to generate reports.  
- Distribute rewards using `RewardDistributor.clar` to boost engagement.  

**For Verifiers/Observers**  
- Use `VerificationOracle.clar` to check any endorsement's validity or proposal details.  
- Query hub stats anytime for transparent insights into global advocacy efforts.  

This setup solves real issues like endorsement forgery in petitions and siloed advocacy groups by making everything on-chain, auditable, and globally accessible. Get started by deploying these contracts on Stacks and building a frontend interface!