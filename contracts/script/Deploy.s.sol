// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/SiliconColesiumToken.sol";

contract DeployScript is Script {
    function run() external {
        // USDT on Arbitrum One
        address usdtAddress = vm.envAddress("USDT_CONTRACT_ADDRESS");

        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        SiliconColesiumToken sct = new SiliconColesiumToken(usdtAddress);

        vm.stopBroadcast();

        console.log("SiliconColesiumToken deployed to:", address(sct));
        console.log("USDT address:", usdtAddress);
    }
}
