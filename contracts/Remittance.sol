pragma solidity ^0.4.13;

import "./Runnable.sol";

contract Remittance is Runnable {

	//event DebugIds(bytes32 id);
	event LogChangeMaxBlockNumber(uint newMaxBlockNumber);
	event LogNewRemittance(address who, address recipient, uint amount, uint deadlineBlock);
	event LogWithdrawn(address who, uint amount);
	event LogRefund(address who, uint amount);
	event LogNewExchange(address exchange);

	struct RemittanceStruct{
		address recipient;
		uint amount;
		uint deadlineBlock; //how much blocks the recipient can wait before losing right to withdraw
	}


	modifier onlyFromExchange(){
		require(msg.sender == exchange);
		_;
	}

	modifier onlyIfExchangeExists(){
		require(exchange != 0x0);
		_;
	}


	/*****************************************/
	mapping(bytes32 => RemittanceStruct) public remittanceBook;
	uint private maxBlocksNumber;
	address private exchange = 0x0;
	bytes32 private exchangePass = 0x0;



	function Remittance(uint _maxBlocksNumber){
		if(_maxBlocksNumber < 1) revert();
		maxBlocksNumber = _maxBlocksNumber;
	}

	//not sure about this...
	function changeExchange(address newExchange, bytes32 newExchangePasswordHash)
	onlyIfRunning
	onlyOwner
	public
	returns(bool success)
	{
		if(newExchange == 0x0) revert();
		if(newExchangePasswordHash == 0x0) revert();
		
		if(newExchange != exchange){
			exchange = newExchange;
			exchangePass = keccak256(newExchange, newExchangePasswordHash); 
			LogNewExchange(newExchange);
			return true;
		}

		return false;
	}

	function changeMaxBlockNumber(uint newMaxBlocksNumber)
	onlyIfRunning
	onlyOwner
	public
	returns(bool success)
	{
		if(newMaxBlocksNumber > 0 && newMaxBlocksNumber!=maxBlocksNumber){
			maxBlocksNumber = newMaxBlocksNumber;
			LogChangeMaxBlockNumber(newMaxBlocksNumber);
			return true;
		}

		return false;
	}

	function getMaxBlockNumber() public returns(uint){
		return maxBlocksNumber;
	}


	function addRemittance(address recipientAddr, uint blocksNumberDuration, bytes32 passwordHashRecipient)
	payable
	onlyIfRunning
	onlyIfExchangeExists
	public
	returns(bool success)
	{
		//check values
		if(recipientAddr == 0x0) revert();
		if(blocksNumberDuration > maxBlocksNumber || blocksNumberDuration < 1) revert();
		if(msg.value < 1) revert();
		if(passwordHashRecipient == 0x0) revert();
		
		//compute deadline in blocks number
		uint deadlineBlock = block.number + blocksNumberDuration;
		bytes32 remittanceId = keccak256(recipientAddr, passwordHashRecipient, exchangePass);

		//i should check if the remittanceId exists in the mapping...
		RemittanceStruct storage r = remittanceBook[remittanceId];
		r.recipient = recipientAddr;
		r.amount = msg.value;
		r.deadlineBlock = deadlineBlock;

		LogNewRemittance(msg.sender, recipientAddr, msg.value, deadlineBlock);
		return true;
	}


	function withdraw(bytes32 passwordHashRecipient, bytes32 passwordHashExchange, address recipientAddr)
	onlyIfRunning
	onlyFromExchange
	onlyIfExchangeExists
	public
	returns(bool success)
	{
		if(passwordHashRecipient == 0x0) revert();
		if(passwordHashExchange == 0x0) revert();
		if(recipientAddr == 0x0) revert();

		bytes32 pass = keccak256(exchange, passwordHashExchange);
		if(pass != exchangePass) revert();
		
		bytes32 remittanceId = keccak256(recipientAddr, passwordHashRecipient, exchangePass);
		

		RemittanceStruct storage r = remittanceBook[remittanceId];
		
		if(r.recipient != recipientAddr) revert();
		if(r.amount == 0) revert();
		if(block.number > r.deadlineBlock) revert();

		uint amount = r.amount;
		r.amount = 0;
		exchange.transfer(amount);

		LogWithdrawn(recipientAddr, amount);

		return true;
	}


	function refund(bytes32 passwordHashRecipient, address recipientAddr)
	onlyIfRunning
	onlyIfExchangeExists
	public
	returns(bool success)
	{
		if(passwordHashRecipient == 0x0) revert();

		bytes32 remittanceId = keccak256(recipientAddr, passwordHashRecipient, exchangePass);
		RemittanceStruct storage r = remittanceBook[remittanceId];

		if(r.recipient != recipientAddr) revert();
		if(r.amount == 0) revert();
		if(block.number <= r.deadlineBlock) revert();

		uint amount = r.amount;
		r.amount = 0;
		msg.sender.transfer(amount);

		LogRefund(msg.sender, amount);
		return true;
	}


}