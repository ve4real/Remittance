var Remittance = artifacts.require("./Remittance.sol");


module.exports = function(deployer, network, accounts) {

    const initialState = true;
    const maxBlocksNumber = 20;
    deployer.deploy(Remittance, maxBlocksNumber, initialState);

};