var userAccount;
var networkID;

var animationID;
var winner = false;

var desiredNetwork = "3";
var curNetwork = 0;
var timesUp = new Event('over');

$(function () {
  $(window).load(function () {
    App.init();
  });
});

App = {
  web3Provider: null,
  noInjectedWeb3: false,
  myWeb3: null,
  contracts: {},
  price: 0,
  dead: null,
  jackpot: 0,
  charity: 0,
  presses: 0,
  lastPresser: '-',
  won: 0,
  totalWon: 0,
  totalCharity: 0,
  totalPresses: 0,

  /**
   * TODO 0.5
   * v Keep notification visible until transaction is mined
   * v Update data/UI on timer end
   * v Check result after press transaction instead of at event
   * v Work with Infura when web3 provider is unavailable
   * 
   * TODO 0.6
   * - Add N and price increase % in the details
   * - Add charity beneficiary to details
   * - Add accounting (fractions) to details/footer
   * - Improve animation - test on mobile
   *  
   * - Adjust colors? Change colors like the original button
   * - Adjust button animation? Disable when no web3
   * - Add button press animation when transaction is mined
   * 
   * TODO 1.0
   * - Add reddit page link
   * - Add contract address to footer
   * - Add FAQ Page/ quick rules popup
   * - Add stats page
   * - Social sharing image
   * ---
   * - Set nicknames
   * - USD prices
   */


  init: function () {
    // Load data.
    toastr.options = {
      "closeButton": true,
      "debug": false,
      "newestOnTop": true,
      "progressBar": false,
      "positionClass": "toast-bottom-right",
      "preventDuplicates": true,
      "showDuration": "300",
      "hideDuration": "1000",
      "timeOut": "5000",
      "extendedTimeOut": "10000",
      "showEasing": "swing",
      "hideEasing": "swing",
      "showMethod": "fadeIn",
      "hideMethod": "fadeOut"
    };

    setupTimer();

    animationID = requestAnimationFrame(drawTimer);

    return App.initWeb3();
  },

  bindEvents: function () {
    $(document).on('click', '.button', App.handlePress);
    // window.addEventListener('over', debounce(App.refresh, 5000), false);
  },

  initWeb3: function () {
    // Is there an injected web3 instance?
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
    } else {
      // If no injected web3 instance is detected, fall back to Infura
      App.noInjectedWeb3 = true;
      App.web3Provider = new Web3.providers.HttpProvider('https://ropsten.infura.io/47xPqLd4I69lkOUz61YF');
    }

    myWeb3 = new Web3(App.web3Provider);

    // if (myWeb3.isConnected()) {
    //     userAccount = myWeb3.eth.accounts[0];
    myWeb3.version.getNetwork(checkNetwork);
    // }

    myWeb3.version.getNetwork((err, netId) => {
      networkID = netId;
      switch (netId) {
        case "1":
          console.log('This is mainnet')
          break
        case "2":
          console.log('This is the deprecated Morden test network.')
          break
        case "3":
          console.log('This is the ropsten test network.')
          break
        case "4":
          networkName = "Rinkeby";
          break;
        case "42":
          networkName = "Kovan";
          break;
        case "5777":
          networkName = "Ganache";
          break;
        default:
          console.log('This is an unknown network.')
      }
    });

    return App.initContract();
  },

  //init contracts
  initContract: function () {

    $.getJSON('TheButton.json', function (data) {
      //     // Get the necessary contract artifact file and instantiate it with truffle-contract
      var TheButtonArtifact = data;
      App.contracts.TheButton = TruffleContract(TheButtonArtifact);

      //     // Set the provider for our contract
      App.contracts.TheButton.setProvider(App.web3Provider);

      App.contracts.TheButton.deployed().then(function (instance) {
        contract = instance;

        pressedEvent = contract.Pressed();
        wonEvent = contract.Winrar();
        startedEvent = contract.Started();

        ethSentEvent = contract.ETHSent();

        pressedEvent.watch(function (error, result) {
          if (error) {
            console.log(error);
          }
          else {
            let name = result.args["by"];
            lastPresser = name;
            if (name == userAccount) {

            } else {
              if (name.length > 25) {
                name = name.substring(0, 21) + "...";
              }
              toastr.info("By: " + name,
                "Button Pressed");
            }
          }
          App.refresh();
        })

        wonEvent.watch(function (error, result) {
          if (error) {
            console.log(error);
          }
          else {
            let name = result.args["guy"];
            let jackpot = myWeb3.fromWei(result.args["jackpot"], 'ether');
            if (name == userAccount) {
              toastr.success("You won the jackpot of " + jackpot + " ETH!");
            } else {
              if (name.length > 25) {
                name = name.substring(0, 21) + "...";
              }
              toastr.info("By: " + name,
                "Jackpot won");
            }

          }
          App.refresh();
        })

        startedEvent.watch(function (error, result) {
          if (error) {
            console.log(error);
          }
          else {
            let i = result.args["i"];
            let period = result.args["period"];
            let startingETH = myWeb3.fromWei(result.args["startingETH"], 'ether');

            toastr.info("Starting jackpot: " + startingETH + "ETH, Period: " + period, 'New Campaign started! ID: ' + i);

          }
          App.refresh();
        })

        ethSentEvent.watch(function (error, result) {
          if (error) {
            console.log(error);
          }
          else {
            let to = result.args["to"];
            lastPresser = name;
            if (to == userAccount) {

            }
          }
          App.refresh();
        })

        var accountInterval = setInterval(function () {
          // if (myWeb3.isConnected()) {
          myWeb3.version.getNetwork(checkNetwork);
          if (typeof myWeb3.eth.defaultAccount !== 'undefined')
            if (myWeb3.eth.accounts[0] !== userAccount) {
              userAccount = myWeb3.eth.accounts[0];
              // Call a function to update the UI with the new account
              App.refresh();
            }
          // } else {
          //   clearInterval(accountInterval);
          // }
        }, 500);

        var updateInterval = setInterval(function () {
          App.getData();
        }, 5000);

      });

      return App.getData();
    });

    return App.bindEvents();
  },

  refresh: function () {

    if (typeof App.contracts.TheButton !== 'undefined') {
      App.checkWinner();
      App.getData();
    }
  },

  handlePress: function (event) {
    // event.preventDefault();

    if (App.noInjectedWeb3) {
      toastr.error("You need a web3 enabled browser to press the button!");
      return;
    }

    var buttonInstance;
    let toast;
    App.contracts.TheButton.deployed().then(function (instance) {
      buttonInstance = instance;

      App.checkWinner();
      return App.getData();
    }).then(function (result) {
      if (typeof userAccount !== 'undefined') {

        if (winner) {
          toast = toastr.info("Withdrawing jackpot...", "",
            {
              "timeOut": "0",
              "extendedTimeOut": "0"
            });

          return buttonInstance.withdrawJackpot({ from: userAccount });
        } else {
          toast = toastr.info("Pressing the button...", "",
            {
              "timeOut": "0",
              "extendedTimeOut": "0"
            });
          return buttonInstance.press({ from: userAccount, value: price });
        }
      } else {
        toastr.warning("You need to unlock your account!");
      }
    }).then(function (result) {
      //success (should be logged in the event handling)
      // console.log(result);
      if (typeof toast !== 'undefined') {
        if (toast.text().includes('jackpot')) {
          toast.hide(200);
          toastr.success("Jackpot withdrawn!");
        } else {
          toast.hide(200);
          toastr.success("You pressed the button!");
        }


      }

      if (result.receipt.status == "0x1") {
        if (winner) {
          winner = false;
        }
        App.refresh();
      }


    }).catch(function (err) {
      if (typeof toast !== 'undefined')
        toast.hide();
      toastr.error("Possibly rejected transaction.", "Problem pressing the button!")
      console.log(err.message);
    });
  },

  getData: function () {
    if (curNetwork != desiredNetwork) {
      return;
    }

    var buttonInstance;

    App.contracts.TheButton.deployed().then(function (instance) {
      buttonInstance = instance;

      return buttonInstance.latestData.call();
    }).then(function (result) {

      price = result[0];
      jackpot = result[1];
      charity = result[2];
      dead = result[3];
      presses = result[4];
      lastPresser = result[5];

      return buttonInstance.totalsData.call();
    }).then(function (result) {
      if (winner) {
        setDeadline(new Date(0));
      } else {
        setDeadline(new Date(dead * 1000));
      }

      totalWon = result[0];
      totalCharity = result[1];
      totalPresses = result[2];
      App.setUIData();
    }).catch(function (err) {
      console.log(err.message);
    });
  },

  checkWinner: function () {
    if (typeof userAccount == 'undefined') {
      return;
    }

    if (App.noInjectedWeb3 || curNetwork !== desiredNetwork) {
      return;
    }

    var buttonInstance;

    App.contracts.TheButton.deployed().then(function (instance) {
      buttonInstance = instance;


      return buttonInstance.hasWon(userAccount);
    }).then(function (result) {
      won = result;
      if (result > 0) {
        winner = true;
      } else {
        winner = false;
      }

    }).catch(function (err) {
      console.log(err.message);
    });
  },

  setUIData: function () {
    let jack = formatETHString(jackpot);
    let pri = formatETHString(price);
    let char = formatETHString(charity);
    let totWon = formatETHString(totalWon);
    let totChar = formatETHString(totalCharity);
    let name;

    if (lastPresser.length > 20) {
      name = lastPresser.substring(0, 16) + "...";
    }

    var icon = blockies.create({ // All options are optional
      seed: lastPresser, // seed used to generate icon data, default: random
      size: 7, // width/height of the icon in blocks, default: 8
      scale: 3, // width/height of each block in pixels, default: 4
      // that look like eyes, mouths and noses.
    });

    // document.body.appendChild(icon); // icon is a canvas element

    var iconElement = document.getElementById('identicon');
    iconElement.replaceChild(icon, iconElement.childNodes[0]);

    setElementValue('jackpot', jack);
    setElementValue('price', pri);
    setElementValue('press-count', presses);
    setElementValue('last-presser', name);
    setElementValue('charity', char);
    setElementValue('totalWon', totWon);
    setElementValue('totalCharity', totChar);
    setElementValue('totalPresses', totalPresses);

  }

};

function checkNetwork(err, currentNetwork) {
  if (err) {
    console.log(err);
  }
  curNetwork = currentNetwork;
  setElentVisibility();
}

function setElentVisibility() {
  if (curNetwork !== desiredNetwork) {
    $("#button").hide(500);
    $("#counter").hide(500);
    $("#totals-counter").hide(500);
    $("#network-warning").show(500);
    toastr.warning("You're not connected to the Ropsten Test network!");
  } else {
    $("#button").show(500);
    $("#network-warning").hide(500);

    if (winner) {
      var x = document.getElementById("winner-section");
      // x.style.display = "normal";
      // x.show();
      $("#winner-section").show(500);
      $("#counter").hide(500);
      $("#totals-counter").hide(500);
      $("#timer-text").hide(500);

      let winning = formatETHString(won);
      setElementValue('winner-jackpot', winning);
    } else {
      $("#winner-section").hide(500);
      $("#counter").show(500);
      $("#totals-counter").show(500);
      $("#timer-text").show(500);
    }
  }
}

function formatETHString(n) {
  n = myWeb3.fromWei(n, 'ether');
  var withCommas = Number(n).toLocaleString(undefined, { maximumFractionDigits: 4 });
  return withCommas;
};

function setElementValue(element, value) {
  if ($('#' + element).text() != value.toString()) {
    var duration = 250;
    $('#' + element).fadeOut(duration, function () {
      $(this).text(value).fadeIn(duration);
    });
  }
}

function debounce(func, wait) {
  var timeout;
  return function () {
    var context = this, args = arguments;
    var later = function () {
      timeout = null;
      func.apply(context, args);
    };
    var callNow = !timeout;

    timeout = setTimeout(later, wait);
    if (callNow) {
      func.apply(context, args);
    } else {
      clearTimeout(timeout);
    }
  };
};