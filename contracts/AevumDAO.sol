// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
}

contract AevumDAO {

    address public owner;
    IERC20 public immutable aevToken;

    uint256 public proposalCount;
    uint256 public votingPeriod = 7 days;
    uint256 public timelockDelay = 48 hours;
    uint256 public quorumVotes;
    uint256 public constant MIN_PROPOSAL_TOKENS = 1_000_000 * 10**18;
    uint256 public constant MIN_QUORUM = 10_000_000 * 10**18;

    enum ProposalState { Active, Passed, Failed, Executed, Cancelled, Queued }

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
    event QuorumUpdated(uint256 newQuorum);
    event VotingPeriodUpdated(uint256 newPeriod);
    event TimelockDelayUpdated(uint256 newDelay);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _aevToken, uint256 _quorumVotes) {
        require(_quorumVotes >= MIN_QUORUM, "Below minimum quorum");
        owner = msg.sender;
        aevToken = IERC20(_aevToken);
        quorumVotes = _quorumVotes;
    }

    function propose(
        string calldata title,
        string calldata description,
        address target,
        bytes calldata callData
    ) external returns (uint256) {
        require(
            aevToken.balanceOf(msg.sender) >= MIN_PROPOSAL_TOKENS,
            "Need 1,000,000 AEV to propose"
        );
        require(target != address(0), "Invalid target");

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
            snapshotBlock: block.number,
            state: ProposalState.Active
        });

        // snapshot proposer balance
        snapshotBalances[proposalCount][msg.sender] = aevToken.balanceOf(msg.sender);

        emit ProposalCreated(proposalCount, msg.sender, title, target);
        return proposalCount;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.state == ProposalState.Active, "Proposal not active");
        require(block.timestamp <= proposal.endTime, "Voting period ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        // use snapshot balance if available, otherwise current balance
        uint256 weight = snapshotBalances[proposalId][msg.sender] > 0
            ? snapshotBalances[proposalId][msg.sender]
            : aevToken.balanceOf(msg.sender);

        require(weight > 0, "No voting power");

        // snapshot balance at vote time to prevent double voting with transfers
        snapshotBalances[proposalId][msg.sender] = weight;
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
        require(
            block.timestamp >= proposal.executionTime,
            "Timelock delay not met"
        );

        proposal.state = ProposalState.Executed;

        (bool success, ) = proposal.target.call(proposal.callData);
        require(success, "Execution failed");

        emit ProposalExecuted(proposalId);
    }

    function cancel(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(
            msg.sender == proposal.proposer || msg.sender == owner,
            "Not proposer or owner"
        );
        require(
            proposal.state == ProposalState.Active ||
            proposal.state == ProposalState.Queued,
            "Cannot cancel"
        );
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

    function getProposalState(uint256 proposalId) external view returns (ProposalState) {
        return proposals[proposalId].state;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}