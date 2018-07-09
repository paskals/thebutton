var userAccount;

var animationID;
var winner = false;

var desiredNetwork = "3";
var curNetwork = 1;
var timesUp = new Event('over');

window.mobileAndTabletcheck = function() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};

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
  priceMul: 0,
  nParameter: 0,
  charityFraction: 0,
  jackpotFraction: 0,
  devFraction: 0,
  totalWon: 0,
  totalCharity: 0,
  totalPresses: 0,

  /**
   * x Add button press animation when transaction is mined
   * 
   * 
   * TODO 1.0
   * v Add reddit page link
   * v Add contract address to footer
   * - automated tests for smart contract
   * - use only ABI and address - delete TheButton.json
   * - Add FAQ Page/ quick rules popup (link to medium article)
   * - Add stats page
   * v Social sharing image
   * - suggest better gas prices
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
      setPressButtonStyle();
    } else {
      // If no injected web3 instance is detected, fall back to Infura
      App.noInjectedWeb3 = true;
      App.web3Provider = new Web3.providers.HttpProvider('https://ropsten.infura.io/47xPqLd4I69lkOUz61YF');

    }

    myWeb3 = new Web3(App.web3Provider);

    myWeb3.version.getNetwork(checkNetwork);


    myWeb3.version.getNetwork((err, netId) => {
      curNetwork = netId;
      switch (netId) {
        case "1":
          console.log('This is mainnet')
          break
        case "2":
          console.log('This is the deprecated Morden test network.')
          break
        case "3":
          console.log('This is the Ropsten test network.')
          break
        case "4":
          console.log('This is the Rinkeby test network.')
          break;
        case "42":
          console.log('This is the Kovan test network.')
          break;
        case "5777":
          console.log('This is the Ganache test network.')
          break;
        default:
          console.log('This is an unknown network.')
      }
    });

    return App.initContract();
  },

  initContract: function () {

    $.getJSON('TheButton.json', function (data) {
      var TheButtonArtifact = data;
      App.contracts.TheButton = TruffleContract(TheButtonArtifact);

      App.contracts.TheButton.setProvider(App.web3Provider);

      App.contracts.TheButton.deployed().then(function (instance) {
        contract = instance;

        pressedEvent = contract.Pressed();
        wonEvent = contract.Winrar();
        startedEvent = contract.Started();

        ethSentEvent = contract.ETHSent();

        //Events:
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
          myWeb3.version.getNetwork(checkNetwork);
          if (typeof myWeb3.eth.defaultAccount !== 'undefined')
            if (myWeb3.eth.accounts[0] !== userAccount) {
              userAccount = myWeb3.eth.accounts[0];
              App.refresh();
            }
        }, 500);

        var updateInterval = setInterval(function () {
          App.refresh();
        }, 2000);

      });

      return App.getData();
    });

    return App.bindEvents();
  },

  refresh: function () {
    App.checkWinner();
    App.getData();

  },

  handlePress: function (event) {
    event.preventDefault();

    if (App.noInjectedWeb3) {
      var link;
      if(mobileAndTabletcheck()) {
        link = "https://links.trustwalletapp.com/a/key_live_lfvIpVeI9TFWxPCqwU8rZnogFqhnzs4D?&event=openURL&url=https://thebutton.co"
      } else {
        link = "https://metamask.io";
      }
      //
      toastr.error("Get it here...", "You need a web3 browser to press the button!", 
        {onclick: function(){window.open(link, '_blank')}
      });
      return;
    }

    var buttonInstance;
    let toast;
    App.contracts.TheButton.deployed().then(function (instance) {
      buttonInstance = instance;

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
      if (typeof toast !== 'undefined') {
        if (toast.text().includes('jackpot')) {
          toast.hide(200);
          toastr.success("Jackpot withdrawn!");
        } else {
          toast.hide(200);
          toastr.success("You pressed the button!");
        }
      }

      if (typeof result == 'undefined') {
        return;
      }

      if (result.receipt.status == "0x1") {
        if (winner) {
          winner = false;
        }
        App.refresh();
      }
    }).catch(function (err) {
      if (typeof toast !== 'undefined')
        toast.hide(200);

      toastr.error("Possibly rejected transaction.", "Problem pressing the button!");
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

      return buttonInstance.latestParams.call();
    }).then(function (result) {
      jackpotFraction = result[0];
      devFraction = result[1];
      charityFraction = result[2];
      priceMul = result[3];
      nParameter = result[4];

      return buttonInstance.lastWinner.call();
    }).then(function (result) {
      lastWinner = result;

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
    let presser = lastPresser;
    let winner = lastWinner;
    let mul = formatPercentageString(priceMul) * 100 - 100;
    let charF = formatPercentageString(charityFraction) * 100;
    let jackF = formatPercentageString(jackpotFraction) * 100;
    let devF = formatPercentageString(devFraction) * 100;

    if (lastPresser != '0x0000000000000000000000000000000000000000') {
      if (presser.length > 26) {
        presser = presser.substring(0, 22) + "...";
      }

      var presserIcon = blockies.create({ // All options are optional
        seed: lastPresser, // seed used to generate icon data, default: random
        size: 7, // width/height of the icon in blocks, default: 8
        scale: 3, // width/height of each block in pixels, default: 4
      });

      setElementValue('last-presser', presser);
    }

    if (lastWinner != '0x0000000000000000000000000000000000000000') {
      var iconElement = document.getElementById('presser-identicon');
      iconElement.replaceChild(presserIcon, iconElement.childNodes[0]);

      if (winner.length > 26) {
        winner = winner.substring(0, 22) + "...";
      }
      var winnerIcon = blockies.create({ // All options are optional
        seed: lastWinner, // seed used to generate icon data, default: random
        size: 7, // width/height of the icon in blocks, default: 8
        scale: 3, // width/height of each block in pixels, default: 4
      });
      setElementValue('last-winner', winner);
      var iconElement = document.getElementById('winner-identicon');
      iconElement.replaceChild(winnerIcon, iconElement.childNodes[0]);
    }

    setElementValue('jackpot', jack);
    setElementValue('price', pri);
    setElementValue('press-count', presses);
    setElementValue('charity', char);
    setElementValue('totalWon', totWon);
    setElementValue('totalCharity', totChar);
    setElementValue('totalPresses', totalPresses);
    setElementValue('priceMultiplier', mul);
    setElementValue('nParameter', nParameter);
    setElementValue('jackpotFraction', jackF);
    setElementValue('charityFraction', charF);
    setElementValue('devFraction', devF);
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

function setPressButtonStyle() {
  $('#main-button').addClass('active-style');
}

function formatETHString(n) {
  n = myWeb3.fromWei(n, 'ether');
  var withCommas = Number(n).toLocaleString(undefined, { maximumFractionDigits: 4 });
  return withCommas;
};

function formatPercentageString(n) {
  n = myWeb3.fromWei(n, 'ether');
  var withCommas = Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
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