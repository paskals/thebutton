var TheButton = artifacts.require("./TheButton.sol");

module.exports = function(deployer) {
  var button;
  deployer.deploy(TheButton)
  .then(function() {
    return TheButton.deployed();})
    .then(function(instance) {
    button = instance;})
    .then(function() {
      return button.start({value: web3.toWei(50, "ether")});});
};
