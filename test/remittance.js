Remittance = artifacts.require('./Remittance.sol');
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

	let password;
	let anotherPassword;
	var maxBlocksNumber = 1000000;
	var exchangePassword = web3.sha3(web3.toHex("AStrongPassword"),{encoding:'hex'});
	var recipientPassword = web3.sha3(web3.toHex("AnotherStrongPassword"),{encoding:'hex'});
	var anotherRecipientPassword = web3.sha3(web3.toHex("AStrongerPassword"),{encoding:'hex'});

	var amount = "1000";

	before(function(){
		return Remittance.new(maxBlocksNumber, true, {from: owner})
		.then(_instance => contract = _instance);
	});

	describe("Add new remittance", () => {

		it("Should create a new password Hash", function(){
			return contract.computeKeccak256(recipientPassword, exchangePassword, exchange)
			.then( hash => {
				password = hash;
			});
		});



		it("Should add a new remittance", function(){
			return contract.addRemittance(user2, 500, password, {from: user1, value: amount})
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
				() => contract.withdraw("Wr0ngP4ssw0rd", exchangePassword, {from: exchange, gas:3000000}),
				3000000);
		});

		it("Should withdraws remittance", function(){
			return contract.withdraw(recipientPassword, exchangePassword, {from: exchange})
			.then(_txObject => {
				assert.strictEqual(_txObject.logs.length, 1);
	            assert.strictEqual(_txObject.logs[0].event, "LogWithdrawn");
	            assert.strictEqual(_txObject.logs[0].args.who, exchange);
	            assert.strictEqual(_txObject.logs[0].args.amount.toString(10), amount);
			})
		});

		it("Should fails withdrawing again the same remittance", function(){
			return expectedException(
				() => contract.withdraw(recipientPassword, exchangePassword, {from: exchange, gas:3000000}),
				3000000);
		});


	});


	describe("Refund funds", () => {
		var blockNumberDuration = 2;

		it("Should fail to create new remittance due to old password", function(){
			return expectedException(
				() => contract.addRemittance(user2, blockNumberDuration, password, {from: user1, value: amount, gas: 3000000}),
				3000000);
		});


		it("Should create a new password Hash", function(){
			return contract.computeKeccak256(anotherRecipientPassword, exchangePassword, exchange)
			.then( hash => {
				anotherPassword = hash;
			});
		});

		it("Should add a new remittance and fails to refund", function(){
			return contract.addRemittance(user2, blockNumberDuration, anotherPassword, {from: user1, value: amount})
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
					() => contract.refund(anotherPassword, {from: user1, gas:3000000}),
					3000000);
	        })
		});

		it("Should fails to refund because of wrong password again", function(){
			return expectedException(
				() => contract.refund("Wr0ngP4ssw0rd", {from: user1, gas:3000000}),
				3000000);
		});

		it("Should refund remittance", function(){
			
		   	return contract.refund(anotherPassword, {from: user1})
			.then(_txObject => {

				assert.strictEqual(_txObject.logs.length, 1);
	            assert.strictEqual(_txObject.logs[0].event, "LogRefund");
	            assert.strictEqual(_txObject.logs[0].args.who, user1);
	            assert.strictEqual(_txObject.logs[0].args.amount.toString(10), amount);
			})
		});
	});


})