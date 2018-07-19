var userAccount;
var gasPrice = 5000000000;
var animationID;
var winner = false;

var desiredNetwork = "1";
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
  dead: 0,
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
      App.web3Provider = new Web3.providers.HttpProvider('https://mainnet.infura.io/47xPqLd4I69lkOUz61YF');

    }

    App.myWeb3 = new Web3(App.web3Provider);

    App.myWeb3.version.getNetwork(checkNetwork);

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
            App.lastPresser = name;
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
            let jackpot = result.args["jackpot"];
            if (name == userAccount) {
              toastr.success("You won the jackpot of " + formatETHString(jackpot) + " ETH!");
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
            let startingETH = result.args["startingETH"];

            toastr.info("Starting jackpot: " + formatETHString(startingETH) + "ETH, Period: " + period/60 + " minutes", 'New Campaign started! ID: ' + i);

          }
          App.refresh();
        })

        ethSentEvent.watch(function (error, result) {
          if (error) {
            console.log(error);
          }
          else {
            let to = result.args["to"];
            App.lastPresser = name;
            if (to == userAccount) {

            }
          }
          App.refresh();
        })

        var accountInterval = setInterval(function () {
          App.myWeb3.version.getNetwork(checkNetwork);
          if (typeof App.myWeb3.eth.defaultAccount !== 'undefined')
            if (App.myWeb3.eth.accounts[0] !== userAccount) {
              userAccount = App.myWeb3.eth.accounts[0];
              App.refresh();
            }
        }, 1000);

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
        link = "https://links.trustwalletapp.com/a/key_live_lfvIpVeI9TFWxPCqwU8rZnogFqhnzs4D?&event=openURL&url=http://thebutton.co"
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

    }).then(function () {
      return App.getData();
    }).then(function () {
      if (typeof userAccount !== 'undefined') {
        if (winner) {
          toast = toastr.info("Withdrawing jackpot...", "",
            {
              "timeOut": "0",
              "extendedTimeOut": "0"
            });

          return buttonInstance.withdrawJackpot({ from: userAccount, gasPrice: gasPrice});
        } else {
          toast = toastr.info("Pressing the button...", "",
            {
              "timeOut": "0",
              "extendedTimeOut": "0"
            });
          return buttonInstance.press({from: userAccount, value: App.price, gasPrice: gasPrice});
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

    App.myWeb3.eth.getGasPrice(function (error, result) {
      if (!error) {
        let minutes = minutesLeft();
        if(minutes > 0) {
          if(minutes > 15.5) {
            gasPrice = result*1.5;
          } else if (minutes > 5.5) {
            gasPrice = result * 2;
          } else if (minutes > 1.5){
            gasPrice = result*3;
          } else {
            gasPrice = result*4;
          }
        } else {
          gasPrice = result;
        }
        // console.log(gasPrice);
      }
      else {
        console.error(error);
      }
    });

    var buttonInstance;

    App.contracts.TheButton.deployed().then(function (instance) {
      buttonInstance = instance;

      return buttonInstance.latestData.call();
    }).then(function (result) {

      if(result[3].toNumber() < App.dead) {
        throw new Error("Wrong data")
      }

      App.price = result[0];
      App.jackpot = result[1];
      App.charity = result[2];
      App.dead = result[3];
      App.presses = result[4];
      App.lastPresser = result[5];

      return buttonInstance.latestParams.call()
      .then(function (result) {
        App.jackpotFraction = result[0];
        App.devFraction = result[1];
        App.charityFraction = result[2];
        App.priceMul = result[3];
        App.nParameter = result[4];
  
        return buttonInstance.totalsData.call();
      }).then(function (result) {
        if (winner) {
          setDeadline(new Date(0));
        } else {
          setDeadline(new Date( App.dead * 1000));
        }
  
        App.totalWon = result[0];
        App.totalCharity = result[1];
        App.totalPresses = result[2];
        App.setUIData();
      })
    })
    .catch(function (err) {
      console.log(err.message);
    });;
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
      App.won = result;
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
    let jack = formatETHString(App.jackpot);
    let pri = formatETHString(App.price);
    let char = formatETHString(App.charity);
    let totWon = formatETHString(App.totalWon);
    let totChar = formatETHString(App.totalCharity);
    let presser = App.lastPresser;
    // let winner = lastWinner;
    let mul = formatPercentageString(App.priceMul) * 100 - 100;
    let charF = formatPercentageString(App.charityFraction) * 100;
    let jackF = formatPercentageString(App.jackpotFraction) * 100;
    let devF = formatPercentageString(App.devFraction) * 100;

    if (App.lastPresser != '0x0000000000000000000000000000000000000000') {
      if (presser.length > 26) {
        presser = presser.substring(0, 22) + "...";
      }

      var presserIcon = blockies.create({ // All options are optional
        seed: App.lastPresser, // seed used to generate icon data, default: random
        size: 7, // width/height of the icon in blocks, default: 8
        scale: 3, // width/height of each block in pixels, default: 4
      });
      
      var iconElement = document.getElementById('presser-identicon');
      iconElement.replaceChild(presserIcon, iconElement.childNodes[0]);
      setElementValue('last-presser', presser);
    }

    setElementValue('jackpot', jack);
    setElementValue('price', pri);
    setElementValue('press-count', App.presses);
    setElementValue('charity', char);
    setElementValue('totalWon', totWon);
    setElementValue('totalCharity', totChar);
    setElementValue('totalPresses', App.totalPresses);
    setElementValue('priceMultiplier', mul);
    setElementValue('nParameter', App.nParameter);
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

      let winning = formatETHString(App.won);
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
  n = App.myWeb3.fromWei(n, 'ether');
  var withCommas;
  if (n>1.5) {
    withCommas = Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  } else {
    withCommas = Number(n).toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return withCommas;
};

function formatPercentageString(n) {
  n = App.myWeb3.fromWei(n, 'ether');
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

function minutesLeft() {
  var now = (new Date()).getTime();
  return (App.dead - now/1000)/60;
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