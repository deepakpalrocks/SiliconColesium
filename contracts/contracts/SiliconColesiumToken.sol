// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IERC20Minimal {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract SiliconColesiumToken is ERC20, Ownable {
    IERC20Minimal public usdtToken;

    // Tier pricing: USDT amount => SCT tokens received
    // Tier 1:   1 USDT  =>   1 SCT
    // Tier 10:  10 USDT =>  20 SCT
    // Tier 100: 100 USDT => 250 SCT

    event TokensPurchased(address indexed buyer, uint256 tier, uint256 usdtSpent, uint256 sctReceived);

    constructor(address _usdtAddress) ERC20("SiliconColesium Token", "SCT") Ownable(msg.sender) {
        require(_usdtAddress != address(0), "Invalid USDT address");
        usdtToken = IERC20Minimal(_usdtAddress);
    }

    function purchaseTokens(uint256 tier) external {
        uint256 usdtAmount;
        uint256 sctAmount;

        if (tier == 1) {
            usdtAmount = 1 * 10 ** 6;   // 1 USDT (6 decimals)
            sctAmount = 1 * 10 ** 18;    // 1 SCT
        } else if (tier == 10) {
            usdtAmount = 10 * 10 ** 6;   // 10 USDT
            sctAmount = 20 * 10 ** 18;   // 20 SCT
        } else if (tier == 100) {
            usdtAmount = 100 * 10 ** 6;  // 100 USDT
            sctAmount = 250 * 10 ** 18;  // 250 SCT
        } else {
            revert("Invalid tier: use 1, 10, or 100");
        }

        require(
            usdtToken.transferFrom(msg.sender, address(this), usdtAmount),
            "USDT transfer failed. Approve USDT spending first."
        );

        _mint(msg.sender, sctAmount);

        emit TokensPurchased(msg.sender, tier, usdtAmount, sctAmount);
    }

    /// @notice Returns whole token balance (no decimals) for agent-slot counting
    function wholeTokenBalance(address account) external view returns (uint256) {
        return balanceOf(account) / (10 ** 18);
    }

    /// @notice Owner can withdraw collected USDT
    function withdrawUSDT(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        require(usdtToken.transfer(to, amount), "USDT withdrawal failed");
    }
}
