var userAccount;
App = {
    web3Provider: null,
    contracts: {},
    price: null,
    deadline: null,
    
  
    init: function() {
      // Load data.
    
  
      return App.initWeb3();
    },
  
    initWeb3: function() {
      // Is there an injected web3 instance?
      if (typeof web3 !== 'undefined') {
        App.web3Provider = web3.currentProvider;
      } else {
        // If no injected web3 instance is detected, fall back to Ganache
        App.web3Provider = new Web3.providers.HttpProvider('http://127.0.0.1:7545');
      }
      web3 = new Web3(App.web3Provider);

      var accountInterval = setInterval(function() {
        // Check if account has changed
        if (web3.eth.accounts[0] !== userAccount) {
          userAccount = web3.eth.accounts[0];
          // Call a function to update the UI with the new account
          
        }
      }, 100);

      var dataInterval = setInterval(function() {
        // Check if account has changed
        App.getData();
      }, 1000);
  
      return App.initContract();
    },
  
    //init contracts
    initContract: function() {
      $.getJSON('TheButton.json', function(data) {
    //     // Get the necessary contract artifact file and instantiate it with truffle-contract
        var TheButtonArtifact = data;
        App.contracts.TheButton = TruffleContract(TheButtonArtifact);
      
    //     // Set the provider for our contract
        App.contracts.TheButton.setProvider(App.web3Provider);
      
    //     // Use our contract to retrieve and mark the adopted pets
        return App.getData();
      });
  
      return App.bindEvents();
    },
  
    bindEvents: function() {
      $(document).on('click', '.button', App.handlePress);
    }, 
  
    getData: function() {
      var buttonInstance;
  
      App.contracts.TheButton.deployed().then(function(instance) {
        buttonInstance = instance;
  
        return buttonInstance.deadline.call();
      }).then(function(result) {
        deadline = result;
        //do stuff with the data to update the UI
        console.log(deadline.toNumber());
        return buttonInstance.price.call(); 
      }).then(function(result) {
        price = result;
        console.log(price.toNumber());
      }).catch(function(err) {
        console.log(err.message);
      });
    },
  
    handlePress: function(event) {
      event.preventDefault();
  
      var buttonInstance;
  
      // web3.eth.getAccounts(function(error, accounts) {
      //   if (error) {
      //     console.log(error);
      //   }
  
        // var account = accounts[0];
  
        App.contracts.TheButton.deployed().then(function(instance) {
          buttonInstance = instance;
  
          // Execute adopt as a transaction by sending account
          
          return App.getData();
        }).then(function(result) {
          return buttonInstance.press({from: userAccount, value: price.toNumber()});
        }).catch(function(err) {
          console.log(err.message);
        });
      // });
    }
  
  };
  
  $(function() {
    $(window).load(function() {
      App.init();
    });
  });
  