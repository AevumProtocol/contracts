// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IVotes {
    function getPastVotes(address account, uint256 timepoint) external view returns (uint256);
    function getPastTotalSupply(uint256 timepoint) external view returns (uint256);
}

contract AevumDAO {

    address public owner;
    IVotes public immutable aevToken;

    uint256 public proposalCount;
    uint256 public votingPeriod = 7 days;
    uint256 public timelockDelay = 48 hours;
    uint256 public executionDeadline = 30 days;
    uint256 public quorumVotes;
    uint256 public constant MIN_QUORUM = 10_000_000 * 10**18;
    uint256 public constant MIN_PROPOSAL_TOKENS = 1_000_000 * 10**18;

    // Whitelist of contracts that can be targeted by governance
    mapping(address => bool) public approvedTargets;

    enum ProposalState { Active, Queued, Failed, Executed, Cancelled, Expired }

    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        address target;
        bytes callData;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        uint256 executionTime;
        uint256 snapshotBlock;
        ProposalState state;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => uint256)) public snapshotBalances;

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        address target
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );
    event ProposalQueued(uint256 indexed proposalId, uint256 executionTime);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    event ProposalExpired(uint256 indexed proposalId);
    event QuorumUpdated(uint256 newQuorum);
    event VotingPeriodUpdated(uint256 newPeriod);
    event TimelockDelayUpdated(uint256 newDelay);
    event ExecutionDeadlineUpdated(uint256 newDeadline);
    event TargetApproved(address indexed target, bool approved);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _aevToken, uint256 _quorumVotes) {
        require(_quorumVotes >= MIN_QUORUM, "Below minimum quorum");
        require(_aevToken != address(0), "Invalid token address");
        owner = msg.sender;
        aevToken = IVotes(_aevToken);
        quorumVotes = _quorumVotes;
    }

    function approveTarget(address target, bool approved) external onlyOwner {
        require(target != address(0), "Invalid target");
        approvedTargets[target] = approved;
        emit TargetApproved(target, approved);
    }

    function propose(
        string calldata title,
        string calldata description,
        address target,
        bytes calldata callData
    ) external returns (uint256) {
        // Use past votes to prevent flash loan attacks
        uint256 votes = aevToken.getPastVotes(msg.sender, block.number - 1);
        require(votes >= MIN_PROPOSAL_TOKENS, "Need 1,000,000 AEV voting power to propose");
        require(approvedTargets[target], "Target not approved for governance");

        proposalCount++;

        proposals[proposalCount] = Proposal({
            id: proposalCount,
            proposer: msg.sender,
            title: title,
            description: description,
            target: target,
            callData: callData,
            forVotes: 0,
            againstVotes: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + votingPeriod,
            executionTime: 0,
            snapshotBlock: block.number - 1,
            state: ProposalState.Active
        });

        emit ProposalCreated(proposalCount, msg.sender, title, target);
        return proposalCount;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.state == ProposalState.Active, "Proposal not active");
        require(block.timestamp <= proposal.endTime, "Voting period ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        // Use snapshot balance to prevent double voting
        uint256 weight = aevToken.getPastVotes(msg.sender, proposal.snapshotBlock);
        require(weight > 0, "No voting power at snapshot");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    function finalize(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.state == ProposalState.Active, "Proposal not active");
        require(block.timestamp > proposal.endTime, "Voting still active");

        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;

        if (totalVotes >= quorumVotes && proposal.forVotes > proposal.againstVotes) {
            proposal.state = ProposalState.Queued;
            proposal.executionTime = block.timestamp + timelockDelay;
            emit ProposalQueued(proposalId, proposal.executionTime);
        } else {
            proposal.state = ProposalState.Failed;
        }
    }

    function execute(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.state == ProposalState.Queued, "Proposal not queued");
        require(block.timestamp >= proposal.executionTime, "Timelock delay not met");
        require(
            block.timestamp <= proposal.executionTime + executionDeadline,
            "Execution window expired"
        );

        // Emit before external call
        proposal.state = ProposalState.Executed;
        emit ProposalExecuted(proposalId);

        (bool success, ) = proposal.target.call(proposal.callData);
        require(success, "Execution failed");
    }

    function expireProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.state == ProposalState.Queued, "Proposal not queued");
        require(
            block.timestamp > proposal.executionTime + executionDeadline,
            "Execution window not expired"
        );
        proposal.state = ProposalState.Expired;
        emit ProposalExpired(proposalId);
    }

    function cancel(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.state == ProposalState.Queued) {
            // Only proposer can cancel a queued proposal
            require(msg.sender == proposal.proposer, "Only proposer can cancel queued proposal");
        } else if (proposal.state == ProposalState.Active) {
            // Proposer or owner can cancel active proposals
            require(
                msg.sender == proposal.proposer || msg.sender == owner,
                "Not proposer or owner"
            );
        } else {
            revert("Cannot cancel");
        }

        proposal.state = ProposalState.Cancelled;
        emit ProposalCancelled(proposalId);
    }

    function setQuorum(uint256 newQuorum) external onlyOwner {
        require(newQuorum >= MIN_QUORUM, "Below minimum quorum");
        quorumVotes = newQuorum;
        emit QuorumUpdated(newQuorum);
    }

    function setVotingPeriod(uint256 newPeriod) external onlyOwner {
        require(newPeriod >= 1 days, "Period too short");
        votingPeriod = newPeriod;
        emit VotingPeriodUpdated(newPeriod);
    }

    function setTimelockDelay(uint256 newDelay) external onlyOwner {
        require(newDelay >= 24 hours, "Delay too short");
        timelockDelay = newDelay;
        emit TimelockDelayUpdated(newDelay);
    }

    function setExecutionDeadline(uint256 newDeadline) external onlyOwner {
        require(newDeadline >= 1 days, "Deadline too short");
        executionDeadline = newDeadline;
        emit ExecutionDeadlineUpdated(newDeadline);
    }

    function getProposalState(uint256 proposalId) external view returns (ProposalState) {
        return proposals[proposalId].state;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
