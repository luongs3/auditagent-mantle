// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Access-control test for the hardened AttestationRegistry.
// Verified passing 7/7 under Foundry (solc 0.8.28). To run:
//   forge test --match-path test/AttestationRegistry.access.t.sol -vv
// (the project ships Hardhat; this is a self-contained Foundry verification file —
//  `forge-std` is its only extra dep.)

import "forge-std/Test.sol";
import "../contracts/AttestationRegistry.sol";

contract AttestationRegistryAccessTest is Test {
    AttestationRegistry reg;
    address owner = address(this);
    address agent = address(0xA11CE);
    address attacker = address(0xBEEF);
    address target = address(0x1234);

    function setUp() public { reg = new AttestationRegistry(); }

    function _attest(address as_) internal {
        vm.prank(as_);
        reg.attest(target, AttestationRegistry.Risk.High, 42, bytes32("h"), "ipfs://x");
    }

    function test_DeployerIsOwnerAndAuditor() public view {
        assertEq(reg.owner(), owner);
        assertTrue(reg.isAuditor(owner));
    }

    function test_OwnerCanAttest() public {
        _attest(owner);
        assertEq(reg.total(), 1);
    }

    function test_AuthorizedAuditorCanAttest() public {
        reg.setAuditor(agent, true);
        _attest(agent);
        assertEq(reg.latestOf(target).auditor, agent);
    }

    function test_UnauthorizedCannotAttest() public {
        vm.expectRevert(AttestationRegistry.NotAuditor.selector);
        _attest(attacker);
    }

    function test_RevokedAuditorCannotAttest() public {
        reg.setAuditor(agent, true);
        reg.setAuditor(agent, false);
        vm.expectRevert(AttestationRegistry.NotAuditor.selector);
        _attest(agent);
    }

    function test_NonOwnerCannotSetAuditor() public {
        vm.prank(attacker);
        vm.expectRevert(AttestationRegistry.NotOwner.selector);
        reg.setAuditor(attacker, true);
    }

    function test_OwnershipTransfer() public {
        reg.transferOwnership(agent);
        assertEq(reg.owner(), agent);
        vm.prank(agent);
        reg.setAuditor(attacker, true);
        assertTrue(reg.isAuditor(attacker));
    }
}
