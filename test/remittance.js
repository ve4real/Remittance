const Remittance = artifacts.require('./Remittance.sol');
const Pr = require("bluebird");
Pr.promisifyAll(web3.eth, { suffix: "Promise" });
web3.eth.getTransactionReceiptMined = require("./getTransactionReceiptMined.js");
const expectedException = require("./expectedException.js");


contract('Remittance', accounts => {
	let contract;
	const owner = accounts[0];
	const exchange = accounts[1];
	const user1 = accounts[2];
	const user2 = accounts[3];

	var maxBlocksNumber = 1000000;
	var exchangePasswordHash = "0x476032fdfce66e2426a1cce13746176239a6bb761eabf5fd298b872a32feddd6"; 
	var user1PasswordHash = "0xb67af5e18047a007879716c3a292d50ccdc0dfb81de2d492bbf5ed6426f0ae96";
	var amount = "1000";

	before(function(){
		return Remittance.new(maxBlocksNumber, {from: owner})
		.then(_instance => contract = _instance);
	});

	describe("Add new remittance", () => {

		it("Should reject because no exchange has been set", function(){
			return expectedException(
                () => contract.addRemittance(user2, 500, user1PasswordHash, {from: user1, value: amount, gas:3000000}),
                3000000);
		});

		it("Should add a new exchange", function(){
			return contract.changeExchange(exchange, exchangePasswordHash, {from: owner})
			.then(_txObject => {
	            assert.strictEqual(_txObject.logs.length, 1);
	            assert.strictEqual(_txObject.logs[0].event, "LogNewExchange");
	            assert.strictEqual(_txObject.logs[0].args.exchange, exchange);
	        })
		});

		it("Should add a new remittance", function(){
			return contract.addRemittance(user2, 500, user1PasswordHash, {from: user1, value: amount})
			.then(_txObject => {
	            assert.strictEqual(_txObject.logs.length, 1);
	            assert.strictEqual(_txObject.logs[0].event, "LogNewRemittance");
	            assert.strictEqual(_txObject.logs[0].args.who, user1);
	            assert.strictEqual(_txObject.logs[0].args.recipient, user2);
	            assert.strictEqual(_txObject.logs[0].args.amount.toString(10), amount);
	        })
		});
	});

	describe("Withdraw funds", () => {
		
		it("Should fails withdrawing because of wrong password", function(){
			return expectedException(
				() => contract.withdraw("Wr0ngP4ssw0rd", exchangePasswordHash, user2, {from: exchange, gas:3000000}),
				3000000);
		});

		it("Should withdraws remittance", function(){
			return contract.withdraw(user1PasswordHash, exchangePasswordHash, user2, {from: exchange})
			.then(_txObject =>{
				assert.strictEqual(_txObject.logs.length, 1);
	            assert.strictEqual(_txObject.logs[0].event, "LogWithdrawn");
	            assert.strictEqual(_txObject.logs[0].args.who, user2);
	            assert.strictEqual(_txObject.logs[0].args.amount.toString(10), amount);
			})
		});

		it("Should fails withdrawing again the same remittance", function(){
			return expectedException(
				() => contract.withdraw(user1PasswordHash, exchangePasswordHash, user2, {from: exchange, gas:3000000}),
				3000000);
		});


	});


	describe("Refund funds", () => {
		it("Should add a new remittance and fails to refund", function(){
			var blockNumberDuration = 2;

			return contract.addRemittance(user2, blockNumberDuration, user1PasswordHash, {from: user1, value: amount})
			.then(_txObject => {
				const currentBlock = new web3.BigNumber(_txObject.receipt.blockNumber);

	            assert.strictEqual(_txObject.logs.length, 1);
	            assert.strictEqual(_txObject.logs[0].event, "LogNewRemittance");
	            assert.strictEqual(_txObject.logs[0].args.who, user1);
	            assert.strictEqual(_txObject.logs[0].args.recipient, user2);
	            assert.strictEqual(_txObject.logs[0].args.amount.toString(10), amount);
	            assert.strictEqual(_txObject.logs[0].args.deadlineBlock.toString(10), currentBlock.plus(blockNumberDuration).toString(10));
	        })
	        .then(() => {
	        	return expectedException(
					() => contract.refund(user1PasswordHash, user2, {from: user1, gas:3000000}),
					3000000);
	        })
		});

		it("Should fails to refund because of wrong password again", function(){
			return expectedException(
				() => contract.refund("Wr0ngP4ssw0rd", user2, {from: user1, gas:3000000}),
				3000000);
		});

		it("Should withdraws remittance", function(){
			
		   	return contract.refund(user1PasswordHash, user2, {from: user1})
			.then(_txObject => {
				console.log(_txObject.receipt.blockNumber);

				assert.strictEqual(_txObject.logs.length, 1);
	            assert.strictEqual(_txObject.logs[0].event, "LogRefund");
	            assert.strictEqual(_txObject.logs[0].args.who, user1);
	            assert.strictEqual(_txObject.logs[0].args.amount.toString(10), amount);
			})
		});
	});


})