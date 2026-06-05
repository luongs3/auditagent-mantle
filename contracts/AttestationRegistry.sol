// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title AuditAgent Attestation Registry
/// @notice On-chain registry of AI-generated smart-contract risk attestations.
///         An off-chain AI audit agent analyzes a target contract and writes its
///         verdict here, creating a permanent, queryable record on Mantle.
/// @dev    Satisfies the hackathon's "AI inference result written on-chain" bar:
///         the AI's risk score + findings hash are committed by the agent wallet.
contract AttestationRegistry {
    /// @notice Risk levels the AI agent can assign.
    enum Risk { Unknown, Low, Medium, High, Critical }

    struct Attestation {
        address target;        // contract that was audited
        Risk risk;             // AI-assigned overall risk
        uint8 score;           // 0-100 safety score (higher = safer)
        bytes32 findingsHash;  // keccak256 of the full off-chain audit report (JSON)
        string reportURI;      // pointer to full report (IPFS/HTTP)
        address auditor;       // agent wallet that submitted
        uint64 timestamp;      // block time of attestation
    }

    /// @notice All attestations, in submission order.
    Attestation[] public attestations;

    /// @notice target => indexes into `attestations` (a target can be re-audited).
    mapping(address => uint256[]) private _byTarget;

    /// @notice Emitted on every new AI attestation. Indexed for cheap off-chain queries.
    event Attested(
        uint256 indexed id,
        address indexed target,
        Risk risk,
        uint8 score,
        bytes32 findingsHash,
        address indexed auditor
    );

    /// @notice The AI agent calls this to commit an audit verdict on-chain.
    /// @return id The index of the new attestation.
    function attest(
        address target,
        Risk risk,
        uint8 score,
        bytes32 findingsHash,
        string calldata reportURI
    ) external returns (uint256 id) {
        require(target != address(0), "target=0");
        require(score <= 100, "score>100");

        id = attestations.length;
        attestations.push(
            Attestation({
                target: target,
                risk: risk,
                score: score,
                findingsHash: findingsHash,
                reportURI: reportURI,
                auditor: msg.sender,
                timestamp: uint64(block.timestamp)
            })
        );
        _byTarget[target].push(id);

        emit Attested(id, target, risk, score, findingsHash, msg.sender);
    }

    /// @notice Total number of attestations recorded.
    function total() external view returns (uint256) {
        return attestations.length;
    }

    /// @notice All attestation ids for a given audited contract.
    function attestationsOf(address target) external view returns (uint256[] memory) {
        return _byTarget[target];
    }

    /// @notice The latest attestation for a target. Reverts if none.
    function latestOf(address target) external view returns (Attestation memory) {
        uint256[] storage ids = _byTarget[target];
        require(ids.length > 0, "no attestation");
        return attestations[ids[ids.length - 1]];
    }
}
