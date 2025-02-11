// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@balancer-labs/v2-interfaces/contracts/vault/IVault.sol";
import "@balancer-labs/v2-interfaces/contracts/vault/IFlashLoanRecipient.sol";

contract FlashLoanTemplate is IFlashLoanRecipient {
    IVault public immutable vault;

    event FlashLoan(address token, uint256 amount, uint256 fee);

    constructor() payable {
        // Balancer Vault address for the specific network
        vault = IVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);
    }

    function getFlashloan(address flashToken, uint256 flashAmount) external {
        require(flashToken != address(0), "Invalid token address");
        require(flashAmount > 0, "Invalid loan amount");

        uint256 balanceBefore = IERC20(flashToken).balanceOf(address(this));
        bytes memory data = abi.encode(flashToken, flashAmount, balanceBefore);

        // Token to flash loan, by default we are flash loaning 1 token.
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = IERC20(flashToken);

        // Flash loan amount.
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = flashAmount;

        vault.flashLoan(this, tokens, amounts, data); // execution goes to `receiveFlashLoan`
    }

    function receiveFlashLoan(
        IERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(
            msg.sender == address(vault),
            "FlashLoanTemplate: Caller not Balancer Vault"
        );

        (address flashToken, uint256 flashAmount, uint256 balanceBefore) = abi
            .decode(userData, (address, uint256, uint256));

        uint256 balanceAfter = IERC20(flashToken).balanceOf(address(this));

        require(
            balanceAfter - balanceBefore == flashAmount,
            "FlashLoanTemplate: Contract did not get loan"
        );

        // Emit flash loan event
        emit FlashLoan(flashToken, flashAmount, feeAmounts[0]);

        // Repay loan + fee
        uint256 amountOwed = flashAmount + feeAmounts[0];
        require(
            IERC20(flashToken).balanceOf(address(this)) >= amountOwed,
            "FlashLoanTemplate: Insufficient balance to repay"
        );

        IERC20(flashToken).transfer(address(vault), amountOwed);
    }
}
