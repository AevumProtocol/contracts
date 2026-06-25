// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IReputationOracle {
    function isAgentAuthorizedView(address agentAddress, address protocol) external view returns (bool);
    function checkScore(address agentAddress) external view returns (uint256);
}

contract AgentMarketplace is IReputationOracle {

    address public owner;
    IReputationOracle public immutable oracle;

    uint256 public listingCount;
    uint256 public jobCount;
    uint256 public platformFeeBps = 250;
    uint256 public maxDisputeWindow = 7 days;
    uint256 public minJobDuration = 1 hours;
    uint256 public minCancelDelay = 7 days;
    uint256 public constant maxJobDuration = 90 days;

    // Pull payment pattern for owner fees
    mapping(address => uint256) public pendingFees;

    enum JobStatus { Open, InProgress, Completed, Disputed, Cancelled }

    struct Listing {
        uint256 id;
        address agent;
        string title;
        string description;
        uint256 priceWei;
        bool active;
    }

    struct Job {
        uint256 id;
        uint256 listingId;
        address client;
        address agent;
        uint256 amount;
        JobStatus status;
        uint256 createdAt;
        uint256 disputedAt;
    }

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Job) public jobs;
    mapping(address => uint256[]) public agentListings;
    mapping(address => uint256[]) public clientJobs;

    event ListingCreated(uint256 indexed listingId, address indexed agent, uint256 price);
    event ListingDeactivated(uint256 indexed listingId);
    event JobCreated(uint256 indexed jobId, uint256 indexed listingId, address indexed client);
    event JobCompleted(uint256 indexed jobId, address agent, uint256 amount);
    event JobDisputed(uint256 indexed jobId, address client);
    event JobCancelled(uint256 indexed jobId);
    event DisputeResolved(uint256 indexed jobId, address winner, uint256 amount);
    event DisputeExpired(uint256 indexed jobId, address agent, uint256 amount);
    event FeeWithdrawn(address indexed owner, uint256 amount);
    event PlatformFeeUpdated(uint256 newFeeBps);
    event MaxDisputeWindowUpdated(uint256 newWindow);
    event MinJobDurationUpdated(uint256 newDuration);
    event MinCancelDelayUpdated(uint256 newDelay);
    event EmergencyCancelled(uint256 indexed jobId);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _oracleAddress) {
        require(_oracleAddress != address(0), "Invalid oracle address");
        owner = msg.sender;
        oracle = IReputationOracle(_oracleAddress);
    }

    // IReputationOracle stub — not used internally, satisfies inheritance
    function isAgentAuthorizedView(address, address) external pure override returns (bool) {
        return false;
    }
    function checkScore(address) external pure override returns (uint256) {
        return 0;
    }

    function createListing(
        string calldata title,
        string calldata description,
        uint256 priceWei
    ) external returns (uint256) {
        require(priceWei > 0, "Price must be greater than 0");
        bool authorized = oracle.isAgentAuthorizedView(msg.sender, address(this));
        require(authorized, "Agent not authorized by oracle");
        listingCount++;
        listings[listingCount] = Listing({
            id: listingCount,
            agent: msg.sender,
            title: title,
            description: description,
            priceWei: priceWei,
            active: true
        });
        agentListings[msg.sender].push(listingCount);
        emit ListingCreated(listingCount, msg.sender, priceWei);
        return listingCount;
    }

    /// @notice Deactivating a listing does not affect jobs already in progress
    function deactivateListing(uint256 listingId) external {
        require(listings[listingId].agent == msg.sender, "Not listing owner");
        listings[listingId].active = false;
        emit ListingDeactivated(listingId);
    }

    function hireAgent(uint256 listingId) external payable returns (uint256) {
        Listing memory listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(msg.value == listing.priceWei, "Incorrect payment amount");
        require(msg.sender != listing.agent, "Cannot hire yourself");

        // Check agent is still authorized at hire time
        bool authorized = oracle.isAgentAuthorizedView(listing.agent, address(this));
        require(authorized, "Agent no longer authorized");

        jobCount++;
        jobs[jobCount] = Job({
            id: jobCount,
            listingId: listingId,
            client: msg.sender,
            agent: listing.agent,
            amount: msg.value,
            status: JobStatus.InProgress,
            createdAt: block.timestamp,
            disputedAt: 0
        });
        clientJobs[msg.sender].push(jobCount);
        emit JobCreated(jobCount, listingId, msg.sender);
        return jobCount;
    }

    function completeJob(uint256 jobId) external {
        Job storage job = jobs[jobId];
        require(msg.sender == job.client, "Only client can complete");
        require(job.status == JobStatus.InProgress, "Job not in progress");
        require(
            block.timestamp >= job.createdAt + minJobDuration,
            "Job must run for minimum duration before completion"
        );
        job.status = JobStatus.Completed;
        uint256 fee = (job.amount * platformFeeBps) / 10000;
        uint256 agentPayment = job.amount - fee;

        // Pull pattern for fees
        pendingFees[owner] += fee;

        emit JobCompleted(jobId, job.agent, agentPayment);

        (bool agentPaid, ) = payable(job.agent).call{value: agentPayment}("");
        require(agentPaid, "Agent payment failed");
    }

    function disputeJob(uint256 jobId) external {
        Job storage job = jobs[jobId];
        require(msg.sender == job.client, "Only client can dispute");
        require(job.status == JobStatus.InProgress, "Job not in progress");
        job.status = JobStatus.Disputed;
        job.disputedAt = block.timestamp;
        emit JobDisputed(jobId, msg.sender);
    }

    function resolveDispute(uint256 jobId, bool favorAgent) external onlyOwner {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Disputed, "Job not disputed");
        job.status = JobStatus.Completed;
        uint256 fee = (job.amount * platformFeeBps) / 10000;
        uint256 winnerPayment = job.amount - fee;
        address winner = favorAgent ? job.agent : job.client;

        // Pull pattern for fees
        pendingFees[owner] += fee;

        emit DisputeResolved(jobId, winner, winnerPayment);

        (bool paid, ) = payable(winner).call{value: winnerPayment}("");
        require(paid, "Payment failed");
    }

    function claimExpiredDispute(uint256 jobId) external {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Disputed, "Job not disputed");
        require(msg.sender == job.agent, "Only agent can claim");
        require(
            block.timestamp >= job.disputedAt + maxDisputeWindow,
            "Dispute window not expired"
        );
        job.status = JobStatus.Completed;
        uint256 fee = (job.amount * platformFeeBps) / 10000;
        uint256 agentPayment = job.amount - fee;

        // Pull pattern for fees
        pendingFees[owner] += fee;

        emit DisputeExpired(jobId, job.agent, agentPayment);

        (bool paid, ) = payable(job.agent).call{value: agentPayment}("");
        require(paid, "Payment failed");
    }

    function cancelJob(uint256 jobId) external {
        Job storage job = jobs[jobId];
        require(msg.sender == job.client, "Only client can cancel");
        require(job.status == JobStatus.InProgress, "Job not in progress");
        require(
            block.timestamp >= job.createdAt + minCancelDelay,
            "Must wait minimum delay before cancelling"
        );
        job.status = JobStatus.Cancelled;

        emit JobCancelled(jobId);

        (bool refunded, ) = payable(job.client).call{value: job.amount}("");
        require(refunded, "Refund failed");
    }

    function emergencyCancel(uint256 jobId) external onlyOwner {
        Job storage job = jobs[jobId];
        require(
            job.status == JobStatus.InProgress || job.status == JobStatus.Disputed,
            "Job not active"
        );
        require(
            block.timestamp >= job.createdAt + maxJobDuration,
            "Job not stuck yet"
        );
        job.status = JobStatus.Cancelled;

        emit EmergencyCancelled(jobId);

        (bool refunded, ) = payable(job.client).call{value: job.amount}("");
        require(refunded, "Refund failed");
    }

    function withdrawFees() external onlyOwner {
        uint256 amount = pendingFees[owner];
        require(amount > 0, "No fees to withdraw");
        pendingFees[owner] = 0;

        emit FeeWithdrawn(owner, amount);

        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "Fee withdrawal failed");
    }

    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps >= 50, "Fee too low");
        require(newFeeBps <= 1000, "Fee too high");
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(newFeeBps);
    }

    function setMaxDisputeWindow(uint256 newWindow) external onlyOwner {
        maxDisputeWindow = newWindow;
        emit MaxDisputeWindowUpdated(newWindow);
    }

    function setMinJobDuration(uint256 newDuration) external onlyOwner {
        minJobDuration = newDuration;
        emit MinJobDurationUpdated(newDuration);
    }

    function setMinCancelDelay(uint256 newDelay) external onlyOwner {
        minCancelDelay = newDelay;
        emit MinCancelDelayUpdated(newDelay);
    }

    function getAgentListings(address agent) external view returns (uint256[] memory) {
        return agentListings[agent];
    }

    function getClientJobs(address client) external view returns (uint256[] memory) {
        return clientJobs[client];
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
