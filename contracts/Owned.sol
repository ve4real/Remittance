pragma solidity 0.4.13;

contract Owned {

	address private _owner;
	event LogNewOwner(address sender, address ondOwner, address newOwner);

	function Owned(){
		_owner = msg.sender;
	}


	function getOwner()
	returns (address owner)
	{
		return _owner;
	}


	modifier onlyOwner{
		require(msg.sender == _owner);
		_;
	}

	function changeOwner(address newOwner) 
	public 
	onlyOwner 
	returns(bool success)
	{
		if(newOwner == 0) revert();

		if(newOwner != _owner){
			LogNewOwner(msg.sender, _owner, newOwner);
			_owner = newOwner;
		}

		return true;
	} 

}