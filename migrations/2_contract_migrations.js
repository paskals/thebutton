var TheButton = artifacts.require("./TheButton.sol");

module.exports = function(deployer) {
  var button;
  deployer.deploy(TheButton).then(function(instance) {
    button = instance;})
    .then(function() {
      return button.start();});
};
