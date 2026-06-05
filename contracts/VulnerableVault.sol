// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title VulnerableVault — DEMO ONLY, intentionally insecure
/// @notice Deployed as an audit TARGET for AuditAgent's demo. Do NOT use for real funds.
///         Contains deliberate, well-known vulnerabilities so the AI agent has something
///         meaningful to find and attest to on-chain.
/// @dev    Planted issues: reentrancy (withdraw), missing access control (setOracle),
///         oracle manipulation surface (borrow), tx.origin auth (adminSweep).
contract VulnerableVault {
    mapping(address => uint256) public deposits;
    address public owner;
    IPriceOracle public oracle;

    constructor() {
        owner = msg.sender;
    }

    function deposit() external payable {
        deposits[msg.sender] += msg.value;
    }

    // BUG: sends ETH before zeroing balance → classic reentrancy
    function withdraw(uint256 amount) external {
        require(deposits[msg.sender] >= amount, "insufficient");
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
        deposits[msg.sender] -= amount;
    }

    // BUG: borrow sizing depends on a manipulable oracle, no validation
    function borrow(uint256 amount) external {
        uint256 price = oracle.getPrice();
        uint256 maxBorrow = (deposits[msg.sender] * price) / 1e18;
        require(amount <= maxBorrow, "over-collateralized");
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok);
    }

    // BUG: no access control — anyone can swap the oracle
    function setOracle(address o) external {
        oracle = IPriceOracle(o);
    }

    // BUG: tx.origin auth is phishable
    function adminSweep(address payable to) external {
        require(tx.origin == owner, "not owner");
        to.transfer(address(this).balance);
    }
}

interface IPriceOracle {
    function getPrice() external view returns (uint256);
}
