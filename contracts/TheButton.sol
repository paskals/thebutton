// SPDX-License-Identifier: agpl-3.0

pragma solidity >=0.8.0 <0.9.0;
import "./lib/auth.sol";
import "./accounting/contracts/Accounting.sol";

///Base contract with all the events, getters, and simple logic
abstract contract ButtonBase is DSAuth, Accounting {
    ///Using a the original DSMath as a library
    using DSMath for uint256;

    uint256 constant ONE_PERCENT_WAD = 10**16; // 1 wad is 10^18, so 1% in wad is 10^16
    uint256 constant ONE_WAD = 10**18;

    uint256 _totalRevenue;
    uint256 _totalCharity;
    uint256 public totalWon;

    uint256 _totalPresses;

    ///Button parameters - note that these can change
    uint256 public startingPrice = 2 * 10**15;
    uint256 internal _priceMultiplier = 106 * 10**16;
    uint32 internal _n = 4; //increase the price after every n presses
    uint32 internal _period = 30 minutes; // what's the period for pressing the button
    uint256 internal _newCampaignFraction = ONE_PERCENT_WAD; //1%
    uint256 internal _devFraction = 10 * ONE_PERCENT_WAD - _newCampaignFraction; //9%
    uint256 internal _charityFraction = 5 * ONE_PERCENT_WAD; //5%
    uint256 internal _jackpotFraction = 85 * ONE_PERCENT_WAD; //85%

    address public charityBeneficiary;

    ///Internal accounts to hold value:
    Account revenue;

    Account nextCampaign;

    Account charity;

    ///Accounts of winners
    mapping(address => Account) winners;

    /// Function modifier to put limits on how values can be set
    modifier limited(
        uint256 value,
        uint256 min,
        uint256 max
    ) {
        require(value >= min && value <= max);
        _;
    }

    /// A function modifier which limits how often a function can be executed
    mapping(bytes4 => uint256) internal _lastExecuted;
    modifier timeLimited(uint256 _howOften) {
        require(_lastExecuted[msg.sig].add(_howOften) <= block.timestamp);
        _lastExecuted[msg.sig] = block.timestamp;
        _;
    }

    ///Button events
    event Pressed(address by, uint256 paid, uint64 timeLeft);
    event Started(uint256 startingETH, uint32 period, uint256 i);
    event Winrar(address guy, uint256 jackpot);
    ///Settings changed events
    event CharityChanged(address newCharityBeneficiary);
    event ButtonParamsChanged(
        uint256 startingPrice,
        uint32 n,
        uint32 period,
        uint256 priceMul
    );
    event AccountingParamsChanged(
        uint256 devFraction,
        uint256 charityFraction,
        uint256 jackpotFraction
    );

    ///Struct that represents a button champaign
    struct ButtonCampaign {
        uint256 price; ///Every campaign starts with some price
        uint256 priceMultiplier; /// Price will be increased by this much every n presses
        uint256 devFraction; /// this much will go to the devs (10^16 = 1%)
        uint256 charityFraction; /// This much will go to charity
        uint256 jackpotFraction; /// This much will go to the winner (last presser)
        uint256 newCampaignFraction; /// This much will go to the next campaign starting balance
        address lastPresser;
        uint64 deadline;
        uint40 presses;
        uint32 n;
        uint32 period;
        bool finalized;
        Account total; /// base account to hold all the value until the campaign is finalized
    }

    uint256 public lastCampaignID;
    ButtonCampaign[] campaigns;

    /// implemented in the child contract
    function press() public payable virtual;

    fallback() external payable {
        press();
    }

    ///Getters:

    ///Check if there's an active campaign
    function active() public view returns (bool) {
        if (campaigns.length == 0) {
            return false;
        } else {
            return campaigns[lastCampaignID].deadline >= block.timestamp;
        }
    }

    ///Get information about the latest campaign or the next campaign if the last campaign has ended, but no new one has started
    function latestData()
        external
        view
        returns (
            uint256 price,
            uint256 jackpot,
            uint256 char,
            uint64 deadline,
            uint256 presses,
            address lastPresser
        )
    {
        price = this.price();
        jackpot = this.jackpot();
        char = this.charityBalance();
        deadline = this.deadline();
        presses = this.presses();
        lastPresser = this.lastPresser();
    }

    ///Get the latest parameters
    function latestParams()
        external
        view
        returns (
            uint256 jackF,
            uint256 revF,
            uint256 charF,
            uint256 priceMul,
            uint256 nParam
        )
    {
        jackF = this.jackpotFraction();
        revF = this.revenueFraction();
        charF = this.charityFraction();
        priceMul = this.priceMultiplier();
        nParam = this.n();
    }

    ///Get the last winner address
    function lastWinner() external view returns (address) {
        if (campaigns.length == 0) {
            return address(0x0);
        } else {
            if (active()) {
                return this.winner(lastCampaignID - 1);
            } else {
                return this.winner(lastCampaignID);
            }
        }
    }

    ///Get the total stats (cumulative for all campaigns)
    function totalsData()
        external
        view
        returns (
            uint256 totalWon_,
            uint256 totalCharity_,
            uint256 totalPresses_
        )
    {
        totalWon_ = this.totalWon();
        totalCharity_ = this.totalCharity();
        totalPresses_ = this.totalPresses();
    }

    /// The latest price for pressing the button
    function price() external view returns (uint256) {
        if (active()) {
            return campaigns[lastCampaignID].price;
        } else {
            return startingPrice;
        }
    }

    /// The latest jackpot fraction - note the fractions can be changed, but they don't affect any currently running campaign
    function jackpotFraction() public view returns (uint256) {
        if (active()) {
            return campaigns[lastCampaignID].jackpotFraction;
        } else {
            return _jackpotFraction;
        }
    }

    /// The latest revenue fraction
    function revenueFraction() public view returns (uint256) {
        if (active()) {
            return campaigns[lastCampaignID].devFraction;
        } else {
            return _devFraction;
        }
    }

    /// The latest charity fraction
    function charityFraction() public view returns (uint256) {
        if (active()) {
            return campaigns[lastCampaignID].charityFraction;
        } else {
            return _charityFraction;
        }
    }

    /// The latest price multiplier
    function priceMultiplier() public view returns (uint256) {
        if (active()) {
            return campaigns[lastCampaignID].priceMultiplier;
        } else {
            return _priceMultiplier;
        }
    }

    /// The latest preiod
    function period() public view returns (uint256) {
        if (active()) {
            return campaigns[lastCampaignID].period;
        } else {
            return _period;
        }
    }

    /// The latest N - the price will increase every Nth presses
    function n() public view returns (uint256) {
        if (active()) {
            return campaigns[lastCampaignID].n;
        } else {
            return _n;
        }
    }

    /// How much time is left in seconds if there's a running campaign
    function timeLeft() external view returns (uint256) {
        if (active()) {
            return campaigns[lastCampaignID].deadline - block.timestamp;
        } else {
            return 0;
        }
    }

    /// What is the latest campaign's deadline
    function deadline() external view returns (uint64) {
        return campaigns[lastCampaignID].deadline;
    }

    /// The number of presses for the current campaign
    function presses() external view returns (uint256) {
        if (active()) {
            return campaigns[lastCampaignID].presses;
        } else {
            return 0;
        }
    }

    /// Last presser
    function lastPresser() external view returns (address) {
        return campaigns[lastCampaignID].lastPresser;
    }

    /// Returns the winner for any given campaign ID
    function winner(uint256 campaignID) external view returns (address) {
        return campaigns[campaignID].lastPresser;
    }

    /// The current (or next) campaign's jackpot
    function jackpot() external view returns (uint256) {
        if (active()) {
            return
                campaigns[lastCampaignID].total.balanceETH.wmul(
                    campaigns[lastCampaignID].jackpotFraction
                );
        } else {
            if (!campaigns[lastCampaignID].finalized) {
                return
                    campaigns[lastCampaignID]
                        .total
                        .balanceETH
                        .wmul(campaigns[lastCampaignID].jackpotFraction)
                        .wmul(campaigns[lastCampaignID].newCampaignFraction);
            } else {
                return nextCampaign.balanceETH.wmul(_jackpotFraction);
            }
        }
    }

    /// Current/next campaign charity balance
    function charityBalance() external view returns (uint256) {
        if (active()) {
            return
                campaigns[lastCampaignID].total.balanceETH.wmul(
                    campaigns[lastCampaignID].charityFraction
                );
        } else {
            if (!campaigns[lastCampaignID].finalized) {
                return
                    campaigns[lastCampaignID]
                        .total
                        .balanceETH
                        .wmul(campaigns[lastCampaignID].charityFraction)
                        .wmul(campaigns[lastCampaignID].newCampaignFraction);
            } else {
                return nextCampaign.balanceETH.wmul(_charityFraction);
            }
        }
    }

    /// Revenue account current balance
    function revenueBalance() external view returns (uint256) {
        return revenue.balanceETH;
    }

    /// The starting balance of the next campaign
    function nextCampaignBalance() external view returns (uint256) {
        if (!campaigns[lastCampaignID].finalized) {
            return
                campaigns[lastCampaignID].total.balanceETH.wmul(
                    campaigns[lastCampaignID].newCampaignFraction
                );
        } else {
            return nextCampaign.balanceETH;
        }
    }

    /// Total cumulative presses for all campaigns
    function totalPresses() external view returns (uint256) {
        if (!campaigns[lastCampaignID].finalized) {
            return _totalPresses.add(campaigns[lastCampaignID].presses);
        } else {
            return _totalPresses;
        }
    }

    /// Total cumulative charity for all campaigns
    function totalCharity() external view returns (uint256) {
        if (!campaigns[lastCampaignID].finalized) {
            return
                _totalCharity.add(
                    campaigns[lastCampaignID].total.balanceETH.wmul(
                        campaigns[lastCampaignID].charityFraction
                    )
                );
        } else {
            return _totalCharity;
        }
    }

    /// Total cumulative revenue for all campaigns
    function totalRevenue() external view returns (uint256) {
        if (!campaigns[lastCampaignID].finalized) {
            return
                _totalRevenue.add(
                    campaigns[lastCampaignID].total.balanceETH.wmul(
                        campaigns[lastCampaignID].devFraction
                    )
                );
        } else {
            return _totalRevenue;
        }
    }

    /// Returns the balance of any winner
    function hasWon(address _guy) external view returns (uint256) {
        return winners[_guy].balanceETH;
    }

    /// Functions for handling value

    /// Withdrawal function for winners
    function withdrawJackpot() public {
        require(winners[msg.sender].balanceETH > 0, "Nothing to withdraw!");
        sendETH(
            winners[msg.sender],
            payable(msg.sender),
            winners[msg.sender].balanceETH
        );
    }

    /// Any winner can chose to donate their jackpot
    function donateJackpot() public {
        require(winners[msg.sender].balanceETH > 0, "Nothing to donate!");
        transferETH(
            winners[msg.sender],
            charity,
            winners[msg.sender].balanceETH
        );
    }

    /// Dev revenue withdrawal function
    function withdrawRevenue() public auth {
        sendETH(revenue, payable(owner), revenue.balanceETH);
    }

    /// Dev charity transfer function - sends all of the charity balance to the pre-set charity address
    /// Note that there's nothing stopping the devs to wait and set the charity beneficiary to their own address
    /// and drain the charity balance for themselves. We would not do that as it would not make sense and it would
    /// damage our reputation, but this is the only "weak" spot of the contract where it requires trust in the devs
    function sendCharityETH(bytes memory callData) public auth {
        // donation receiver might be a contract, so transact instead of a simple send
        transact(charity, charityBeneficiary, charity.balanceETH, callData);
    }

    /// This allows the owner to withdraw surplus ETH
    function redeemSurplusETH() public auth {
        uint256 surplus = address(this).balance.sub(totalETH);
        balanceETH(base, surplus);
        sendETH(base, payable(msg.sender), base.balanceETH);
    }

    /// This allows the owner to withdraw surplus Tokens
    function redeemSurplusERC20(address token) public auth {
        uint256 realTokenBalance = ERC20(token).balanceOf(payable(this));
        uint256 surplus = realTokenBalance.sub(totalTokenBalances[token]);
        balanceToken(base, token, surplus);
        sendToken(base, token, msg.sender, base.tokenBalances[token]);
    }

    /// withdraw surplus ETH
    function withdrawBaseETH() public auth {
        sendETH(base, payable(msg.sender), base.balanceETH);
    }

    /// withdraw surplus tokens
    function withdrawBaseERC20(address token) public auth {
        sendToken(base, token, msg.sender, base.tokenBalances[token]);
    }

    ///Setters

    /// Set button parameters
    function setButtonParams(
        uint256 startingPrice_,
        uint256 priceMul_,
        uint32 period_,
        uint32 n_
    )
        public
        auth
        limited(startingPrice_, 10**12, 10 ether) ///Parameters are limited
        limited(priceMul_, ONE_WAD, 10 * ONE_WAD) // 100% to 10000% (1x to 10x)
        limited(period_, 30 seconds, 1 weeks)
    {
        startingPrice = startingPrice_;
        _priceMultiplier = priceMul_;
        _period = period_;
        _n = n_;
        emit ButtonParamsChanged(startingPrice_, n_, period_, priceMul_);
    }

    /// Fractions must add up to 100%, and can only be set every 2 weeks
    function setAccountingParams(
        uint256 _devF,
        uint256 _charityF,
        uint256 _newCampF
    )
        public
        auth
        limited(_devF.add(_charityF).add(_newCampF), 0, ONE_WAD) // up to 100% - charity fraction could be set to 100% for special occasions
        timeLimited(2 weeks)
    {
        // can only be changed once every 4 weeks
        require(_charityF <= ONE_WAD); // charity fraction can be up to 100%
        require(_devF <= 20 * ONE_PERCENT_WAD); //can't set the dev fraction to more than 20%
        require(_newCampF <= 10 * ONE_PERCENT_WAD); //less than 10%
        _devFraction = _devF;
        _charityFraction = _charityF;
        _newCampaignFraction = _newCampF;
        _jackpotFraction = ONE_WAD.sub(_devF).sub(_charityF).sub(_newCampF);
        emit AccountingParamsChanged(_devF, _charityF, _jackpotFraction);
    }

    ///Charity beneficiary can only be changed every 13 weeks
    function setCharityBeneficiary(address _charity)
        public
        auth
        timeLimited(13 weeks)
    {
        require(_charity != address(0));
        charityBeneficiary = _charity;
        emit CharityChanged(_charity);
    }
}

/// Main contract with key logic
contract TheButton is ButtonBase {
    using DSMath for uint256;

    ///If the contract is stopped no new campaigns can be started, but any running campaing is not affected
    bool public stopped;

    constructor() public {
        stopped = true;
        revenue.name = "Revenue";
        nextCampaign.name = "Next Campaign";
        charity.name = "Charity";
    }

    /// Press logic
    function press() public payable override {
        //the last campaign
        ButtonCampaign storage c = campaigns[lastCampaignID];
        if (active()) {
            // if active
            _press(c); //register press
            depositETH(c.total, msg.sender, msg.value); // handle ETH
        } else {
            //if inactive (after deadline)
            require(!stopped, "Contract stopped!"); //make sure we're not stopped
            if (!c.finalized) {
                //if not finalized
                _finalizeCampaign(c); // finalize last campaign
            }
            _newCampaign(); // start new campaign
            c = campaigns[lastCampaignID];

            _press(c); //resigter press
            depositETH(c.total, msg.sender, msg.value); //handle ETH
        }
    }

    function start() external payable auth {
        require(stopped, "Already started!");
        stopped = false;

        if (campaigns.length != 0) {
            //if there was a past campaign
            ButtonCampaign storage c = campaigns[lastCampaignID];
            require(c.finalized, "Last campaign not finalized!"); //make sure it was finalized
        }
        _newCampaign(); //start new campaign
        ButtonCampaign storage c = campaigns[lastCampaignID];
        c = campaigns[lastCampaignID];
        _press(c);
        depositETH(c.total, msg.sender, msg.value); // deposit ETH
    }

    ///Stopping will only affect new campaigns, not already running ones
    function stop() external auth {
        require(!stopped, "Already stopped!");
        stopped = true;
    }

    /// Anyone can finalize campaigns in case the devs stop the contract
    function finalizeLastCampaign() external {
        require(stopped);
        ButtonCampaign storage c = campaigns[lastCampaignID];
        _finalizeCampaign(c);
    }

    function finalizeCampaign(uint256 id) external {
        require(stopped);
        ButtonCampaign storage c = campaigns[id];
        _finalizeCampaign(c);
    }

    //Press logic
    function _press(ButtonCampaign storage c) internal {
        require(c.deadline >= block.timestamp, "After deadline!"); //must be before the deadline
        require(msg.value >= c.price, "Not enough value!"); // must have at least the price value
        c.presses += 1; //no need for safe math, as it is not a critical calculation
        c.lastPresser = msg.sender;

        if (c.presses % c.n == 0) {
            // increase the price every n presses
            c.price = c.price.wmul(c.priceMultiplier);
        }

        emit Pressed(
            msg.sender,
            msg.value,
            c.deadline - uint64(block.timestamp)
        );
        c.deadline = uint64(block.timestamp.add(c.period)); // set the new deadline
    }

    /// starting a new campaign
    function _newCampaign() internal {
        require(!active(), "A campaign is already running!");
        require(
            _devFraction.add(_charityFraction).add(_jackpotFraction).add(
                _newCampaignFraction
            ) == ONE_WAD,
            "Accounting is incorrect!"
        );

        ButtonCampaign storage c = campaigns.push();
        lastCampaignID = campaigns.length;

        c.price = startingPrice;
        c.priceMultiplier = _priceMultiplier;
        c.devFraction = _devFraction;
        c.charityFraction = _charityFraction;
        c.jackpotFraction = _jackpotFraction;
        c.newCampaignFraction = _newCampaignFraction;
        c.deadline = uint64(block.timestamp.add(_period));
        c.n = _n;
        c.period = _period;
        c.total.name = keccak256(abi.encodePacked("Total", lastCampaignID)); //setting the name of the campaign's accaount
        transferETH(nextCampaign, c.total, nextCampaign.balanceETH);
        emit Started(c.total.balanceETH, _period, lastCampaignID);
    }

    /// Finalize campaign logic
    function _finalizeCampaign(ButtonCampaign storage c) internal {
        require(c.deadline < block.timestamp, "Before deadline!");
        require(!c.finalized, "Already finalized!");

        if (c.presses != 0) {
            //If there were presses
            uint256 totalBalance = c.total.balanceETH;
            //Handle all of the accounting
            transferETH(
                c.total,
                winners[c.lastPresser],
                totalBalance.wmul(c.jackpotFraction)
            );
            winners[c.lastPresser].name = bytes32(
                abi.encodePacked(c.lastPresser)
            );
            totalWon = totalWon.add(totalBalance.wmul(c.jackpotFraction));

            transferETH(c.total, revenue, totalBalance.wmul(c.devFraction));
            _totalRevenue = _totalRevenue.add(totalBalance.wmul(c.devFraction));

            transferETH(c.total, charity, totalBalance.wmul(c.charityFraction));
            _totalCharity = _totalCharity.add(
                totalBalance.wmul(c.charityFraction)
            );

            //avoiding rounding errors - just transfer the leftover
            // transferETH(c.total, nextCampaign, c.total.balanceETH);

            _totalPresses = _totalPresses.add(c.presses);

            emit Winrar(c.lastPresser, totalBalance.wmul(c.jackpotFraction));
        }
        // if there will be no next campaign
        if (stopped) {
            //transfer leftover to devs' base account
            transferETH(c.total, base, c.total.balanceETH);
        } else {
            //otherwise transfer to next campaign
            transferETH(c.total, nextCampaign, c.total.balanceETH);
        }
        c.finalized = true;
    }
}
