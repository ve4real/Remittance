pragma solidity 0.4.13;

import "./Owned.sol";

contract Runnable is Owned{

	bool public isRunning = true;

	function stop() public onlyOwner{
		if(isRunning)
			isRunning = false;
	}

	function run() public onlyOwner{
		if(!isRunning)
			isRunning = true;
	}

	modifier onlyIfRunning{
		require(isRunning);
		_;
	}
}