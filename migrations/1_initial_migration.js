var Migrations = artifacts.require("./Migrations.sol");
var Remittance = artifacts.require("./Remittance.sol");

module.exports = function(deployer) {

	var maxBlocksNumber = 20;

	deployer.deploy(Migrations);
	deployer.deploy(Remittance, maxBlocksNumber);
};
