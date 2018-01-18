pragma solidity ^0.4.13;

import "./Runnable.sol";

contract Remittance is Runnable {

	event LogChangeMaxBlockNumber(uint newMaxBlockNumber);
	event LogNewRemittance(address who, address recipient, uint amount, uint deadlineBlock);
	event LogWithdrawn(address who, uint amount);
	event LogRefund(address who, uint amount);
	event LogNewExchange(address exchange);

	struct RemittanceStruct{
		address from;
		uint amount;
		uint deadlineBlock; //how much blocks the recipient can wait before losing right to withdraw
	}


	/*****************************************/
	mapping(bytes32 => RemittanceStruct) public remittanceBook;
	uint private maxBlocksNumber;

	function Remittance(uint _maxBlocksNumber, bool initialState) Runnable(initialState){
		require(_maxBlocksNumber >= 1);
		maxBlocksNumber = _maxBlocksNumber;
	}


	function changeMaxBlockNumber(uint newMaxBlocksNumber)
	onlyIfRunning
	onlyOwner
	public
	returns(bool success)
	{
		require(newMaxBlocksNumber > 0);
		require(newMaxBlocksNumber != maxBlocksNumber);
		
		maxBlocksNumber = newMaxBlocksNumber;
		LogChangeMaxBlockNumber(newMaxBlocksNumber);
		return true;
	}

	//this could be a problem, but i couldn't use the web3 sha3 function because the 
	//result was always different from this
	function computeKeccak256(bytes32 password1, bytes32 password2, address exchangeAddr)
	public
    constant 
    returns(bytes32 hash) 
    {
        return keccak256(password1, password2, exchangeAddr);
    }


	function getMaxBlockNumber() 
	constant 
	public
	returns(uint)
	{
		return maxBlocksNumber;
	}


	//now the information regarding the exchange is hashed directly in the password
	function addRemittance(address recipientAddr, uint blocksNumberDuration, bytes32 passwordHash)
	payable
	onlyIfRunning
	public
	returns(bool success)
	{
		//check values
		require(recipientAddr != 0x0);
		require(blocksNumberDuration <= maxBlocksNumber);
		require(blocksNumberDuration > 0);
		require(msg.value > 0);
		require(passwordHash != 0x0);
		
		//compute deadline in blocks number
		uint deadlineBlock = block.number + blocksNumberDuration;
		
		//passwordHash is the hash of the passwords + the exchange address
		RemittanceStruct storage r = remittanceBook[passwordHash];
		//check if it is empty
		require(r.amount == 0);
		r.from = msg.sender;
		r.amount = msg.value;
		r.deadlineBlock = deadlineBlock;

		//recipient address is used only for event log
		LogNewRemittance(msg.sender, recipientAddr, msg.value, deadlineBlock);
		return true;
	}

	//to be sure that only the exchange could withdraw, i put the msg.sender in the keccak256 function
	function withdraw(bytes32 passwordRecipient, bytes32 passwordExchange)
	onlyIfRunning
	public
	returns(bool success)
	{
		require(passwordRecipient != 0x0);
		require(passwordExchange != 0x0);

		//using the msg.sender let me manage multiple exchanges
		bytes32 remittanceId = keccak256(passwordRecipient, passwordExchange, msg.sender);
		RemittanceStruct storage r = remittanceBook[remittanceId];		
		//if the sender is not the exchange this will fail automatically, not finding the entry in the mapping
		require(r.amount > 0);
		require(block.number <= r.deadlineBlock);

		uint amount = r.amount;
		r.amount = 0;
		msg.sender.transfer(amount);

		LogWithdrawn(msg.sender, amount);


		return true;
	}


	function refund(bytes32 passwordHash)
	onlyIfRunning
	public
	returns(bool success)
	{
		require(passwordHash != 0x0);

		RemittanceStruct storage r = remittanceBook[passwordHash];

		// this is important, cause after the addRemittance the password hash is known
		// so if i do not check the sender, anybody could refunds.
		require(r.from == msg.sender); 
		require(r.amount > 0);
		require(block.number > r.deadlineBlock);

		uint amount = r.amount;
		r.amount = 0;
		msg.sender.transfer(amount);

		LogRefund(msg.sender, amount);
		return true;
	}


}