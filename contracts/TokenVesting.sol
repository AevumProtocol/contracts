// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract TokenVesting {

    address public owner;
    IERC20 public aevToken;

    struct VestingSchedule {
        address beneficiary;
        uint256 totalAmount;
        uint256 released;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 vestingDuration;
        bool revoked;
        string label;
    }

    uint256 public scheduleCount;
    mapping(uint256 => VestingSchedule) public schedules;
    mapping(address => uint256[]) public beneficiarySchedules;

    event ScheduleCreated(
        uint256 indexed scheduleId,
        address indexed beneficiary,
        uint256 totalAmount,
        uint256 cliffDuration,
        uint256 vestingDuration,
        string label
    );
    event TokensReleased(uint256 indexed scheduleId, address indexed beneficiary, uint256 amount);
    event ScheduleRevoked(uint256 indexed scheduleId, address indexed beneficiary, uint256 returned);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _aevToken) {
        owner = msg.sender;
        aevToken = IERC20(_aevToken);
    }

    function createSchedule(
        address beneficiary,
        uint256 totalAmount,
        uint256 cliffDuration,
        uint256 vestingDuration,
        string calldata label
    ) external onlyOwner returns (uint256) {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(totalAmount > 0, "Amount must be greater than 0");
        require(vestingDuration > 0, "Vesting duration must be greater than 0");
        require(cliffDuration <= vestingDuration, "Cliff exceeds vesting duration");
        require(
            aevToken.balanceOf(address(this)) >= totalAmount,
            "Insufficient token balance in vesting contract"
        );

        scheduleCount++;
        schedules[scheduleCount] = VestingSchedule({
            beneficiary: beneficiary,
            totalAmount: totalAmount,
            released: 0,
            startTime: block.timestamp,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            revoked: false,
            label: label
        });

        beneficiarySchedules[beneficiary].push(scheduleCount);

        emit ScheduleCreated(
            scheduleCount,
            beneficiary,
            totalAmount,
            cliffDuration,
            vestingDuration,
            label
        );

        return scheduleCount;
    }

    function release(uint256 scheduleId) external {
        VestingSchedule storage schedule = schedules[scheduleId];
        require(msg.sender == schedule.beneficiary, "Not beneficiary");
        require(!schedule.revoked, "Schedule revoked");

        uint256 releasable = _releasableAmount(schedule);
        require(releasable > 0, "No tokens to release");

        schedule.released += releasable;

        bool success = aevToken.transfer(schedule.beneficiary, releasable);
        require(success, "Token transfer failed");

        emit TokensReleased(scheduleId, schedule.beneficiary, releasable);
    }

    function revoke(uint256 scheduleId) external onlyOwner {
        VestingSchedule storage schedule = schedules[scheduleId];
        require(!schedule.revoked, "Already revoked");

        uint256 releasable = _releasableAmount(schedule);
        if (releasable > 0) {
            schedule.released += releasable;
            aevToken.transfer(schedule.beneficiary, releasable);
        }

        uint256 remaining = schedule.totalAmount - schedule.released;
        schedule.revoked = true;

        if (remaining > 0) {
            aevToken.transfer(owner, remaining);
        }

        emit ScheduleRevoked(scheduleId, schedule.beneficiary, remaining);
    }

    function releasableAmount(uint256 scheduleId) external view returns (uint256) {
        return _releasableAmount(schedules[scheduleId]);
    }

    function vestedAmount(uint256 scheduleId) external view returns (uint256) {
        return _vestedAmount(schedules[scheduleId]);
    }

    function getBeneficiarySchedules(address beneficiary) external view returns (uint256[] memory) {
        return beneficiarySchedules[beneficiary];
    }

    function _releasableAmount(VestingSchedule storage schedule) internal view returns (uint256) {
        return _vestedAmount(schedule) - schedule.released;
    }

    function _vestedAmount(VestingSchedule storage schedule) internal view returns (uint256) {
        if (schedule.revoked) {
            return schedule.released;
        }

        uint256 elapsed = block.timestamp - schedule.startTime;

        if (elapsed < schedule.cliffDuration) {
            return 0;
        }

        if (elapsed >= schedule.vestingDuration) {
            return schedule.totalAmount;
        }

        return (schedule.totalAmount * elapsed) / schedule.vestingDuration;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}