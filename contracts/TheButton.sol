pragma solidity^0.4.23;

import "./lib/ds-auth/src/auth.sol";
import "./accounting/contracts/Accounting.sol";

///Base contract with all the events, getters, and simple logic
contract ButtonBase is DSAuth, Accounting {
    ///Using a the original DSMath as a library
    using DSMath for uint;

    uint constant ONE_PERCENT_WAD = 10 ** 16;// 1 wad is 10^18, so 1% in wad is 10^16
    uint constant ONE_WAD = 10 ** 18;

    uint public totalRevenue;
    uint public totalCharity;
    uint public totalWon;

    uint public totalPresses;

    ///Button parameters
    uint public startingPrice = 1 finney;
    uint internal _priceMultiplier = 105 * 10 **16;
    uint32 internal _n = 3; //increase the price after every n presses
    uint32 internal _period = 3 minutes;// what's the period for pressing the button
    uint internal _newCampaignFraction = ONE_PERCENT_WAD; //1%
    uint internal _devFraction = 10 * ONE_PERCENT_WAD - _newCampaignFraction; //9%
    uint internal _charityFraction = 5 * ONE_PERCENT_WAD; //5%
    uint internal _jackpotFraction = 85 * ONE_PERCENT_WAD; //85%
    
    address public charityBeneficiary;

    ///Internal accounts to hold value:
    Account revenue = 
    Account({
        name: "Revenue",
        balanceETH: 0
    });

    Account nextCampaign = 
    Account({
        name: "Next Campaign",
        balanceETH: 0       
    });

    Account charity = 
    Account({
        name: "Charity",
        balanceETH: 0
    });

    ///Accounts of winners
    mapping (address => Account) winners;

    /// Function modifier to put limits on how values can be set
    modifier limited(uint value, uint min, uint max) {
        require(value >= min && value <= max);
        _;
    }

    /// A function modifier which limits how often a function can be executed
    mapping (bytes4 => uint) internal _lastExecuted;
    modifier timeLimited(uint _howOften) {
        require(_lastExecuted[msg.sig].add(_howOften) <= now);
        _lastExecuted[msg.sig] = now;
        _;
    }

    ///Button events
    event Pressed(address by, uint paid, uint64 timeLeft);
    event Started(uint startingETH, uint32 period, uint i);
    event Winrar(address guy, uint jackpot);
    ///Settings changed events
    event CharityChanged(address newCharityBeneficiary);
    event ButtonParamsChanged(uint startingPrice, uint32 n, uint32 period, uint priceMul);
    event AccountingParamsChanged(uint devFraction, uint charityFraction, uint jackpotFraction);

    ///Struct that represents a button champaign
    struct ButtonCampaign {
        uint price; ///Every campaign starts with some price  
        uint priceMultiplier;/// Price will be increased by this much every n presses
        uint devFraction; /// this much will go to the devs (10^16 = 1%)
        uint charityFraction;/// This much will go to charity
        uint jackpotFraction;/// This much will go to the winner (last presser)
        uint newCampaignFraction;/// This much will go to the next campaign starting balance

        address lastPresser;
        uint64 deadline;
        uint40 presses;
        uint32 n;
        uint32 period;
        bool finalized;

        Account total;/// base account to hold all the value until the campaign is finalized 
    }

    uint public lastCampaignID;
    ButtonCampaign[] campaigns;

    /// implemented in the child contract
    function press() public payable;
    
    function () public payable {
        press();
    }

    ///Getters:

    function latestData() external view returns(
        uint price, uint jackpot, uint char, uint64 deadline, uint presses, address lastPresser
        ) {
        price = this.price();
        jackpot = this.jackpot();
        char = this.charityBalance();
        deadline = this.deadline();
        presses = this.presses();
        lastPresser = this.lastPresser();
    }

    function latestParams() external view returns(
        uint jackF, uint revF, uint charF, uint priceMul, uint nParam
    ) {
        jackF = this.jackpotFraction();
        revF = this.revenueFraction();
        charF = this.charityFraction();
        priceMul = this.priceMultiplier();
        nParam = this.n();
    }

    function lastWinner() external view returns(address) {
        if(campaigns.length == 0) {
            return address(0x0);
        } else {
            if(active()) {
                return this.winner(lastCampaignID - 1);
            } else {
                return this.winner(lastCampaignID);
            }
        }
    }

    function totalsData() external view returns(uint _totalWon, uint _totalCharity, uint _totalPresses) {
        _totalWon = totalWon;
        _totalCharity = totalCharity;
        _totalPresses = this.totalPresses();
    }
   
    function price() external view returns(uint) {
        if(active()) {
            return campaigns[lastCampaignID].price;
        } else {
            return startingPrice;
        }
    }

    function jackpotFraction() public view returns(uint) {
        if(active()) {
            return campaigns[lastCampaignID].jackpotFraction;
        } else {
            return _jackpotFraction;
        }
    }

    function revenueFraction() public view returns(uint) {
        if(active()) {
            return campaigns[lastCampaignID].devFraction;
        } else {
            return _devFraction;
        }
    }

    function charityFraction() public view returns(uint) {
        if(active()) {
            return campaigns[lastCampaignID].charityFraction;
        } else {
            return _charityFraction;
        }
    }

    function priceMultiplier() public view returns(uint) {
        if(active()) {
            return campaigns[lastCampaignID].priceMultiplier;
        } else {
            return _priceMultiplier;
        }
    }

    function period() public view returns(uint) {
        if(active()) {
            return campaigns[lastCampaignID].period;
        } else {
            return _period;
        }
    }

    function n() public view returns(uint) {
        if(active()) {
            return campaigns[lastCampaignID].n;
        } else {
            return _n;
        }
    }

    function timeLeft() external view returns(uint) {
        if (active()) {
            return campaigns[lastCampaignID].deadline - now;
        } else {
            return 0;
        }
    }

    function deadline() external view returns(uint64) {
        return campaigns[lastCampaignID].deadline;
    }

    function jackpot() external view returns(uint) {
        if(!campaigns[lastCampaignID].finalized) {
            return campaigns[lastCampaignID].total.balanceETH.wmul(campaigns[lastCampaignID].jackpotFraction);
        } else {
            return nextCampaign.balanceETH.wmul(_jackpotFraction);
        }
    }

    function presses() external view returns(uint) {
        if(active()) {
            return campaigns[lastCampaignID].presses;
        } else {
            return 0;
        }
    }

    function lastPresser() external view returns(address) {
        // if(campaigns.length != 0) {
        return campaigns[lastCampaignID].lastPresser;
        // } else {
        //     return address(0);
        // }
    }

    function winner(uint campaignID) external view returns(address) {
        return campaigns[campaignID].lastPresser;
    }

    function totalPresses() external view returns(uint) {
        if (!campaigns[lastCampaignID].finalized) {
            return totalPresses.add(campaigns[lastCampaignID].presses);
        } else {
            return totalPresses;
        }
    }

    function charityBalance() external view returns(uint) {
        if(!campaigns[lastCampaignID].finalized) {
            return campaigns[lastCampaignID].total.balanceETH.wmul(campaigns[lastCampaignID].charityFraction);
        } else {
            return nextCampaign.balanceETH.wmul(_charityFraction);
        }
    }

    function revenueBalance() external view returns(uint) {
        if(!campaigns[lastCampaignID].finalized) {
            return campaigns[lastCampaignID].total.balanceETH.wmul(campaigns[lastCampaignID].devFraction);
        } else {
            return nextCampaign.balanceETH.wmul(_devFraction);
        }
    }

    function nextCampaignBalance() external view returns(uint) {
        if(active()) {
            return campaigns[lastCampaignID].total.balanceETH.wmul(campaigns[lastCampaignID].newCampaignFraction);
        } else {
            return nextCampaign.balanceETH;
        }
    }

    function totalCharity() external view returns(uint) {
        return totalCharity.add(this.charityBalance());
    }

    function totalRevenue() external view returns(uint) {
        return totalRevenue.add(this.revenueBalance());
    }

    function active() public view returns(bool) {
        if(campaigns.length == 0) { 
            return false;
        } else {
            return campaigns[lastCampaignID].deadline >= now;
        }
    }

    function hasWon(address _guy) external view returns(uint) {
        return winners[_guy].balanceETH;
    }

    function withdrawJackpot() public {
        require(winners[msg.sender].balanceETH > 0, "Nothing to withdraw!");
        sendETH(winners[msg.sender], msg.sender, winners[msg.sender].balanceETH);
    }

    function donateJackpot() public {
        require(winners[msg.sender].balanceETH > 0, "Nothing to donate!");
        transferETH(winners[msg.sender], charity, winners[msg.sender].balanceETH);
    }

    function withdrawRevenue() public auth {
        sendETH(revenue, owner, revenue.balanceETH);
    }

    function sendCharityETH(bytes callData) public auth {
        // donation receiver might be a contract, so transact instead of a simple send
        transact(charity, charityBeneficiary, charity.balanceETH, callData);
    }

    ///Setters

    function setButtonParams(uint startingPrice_, uint priceMul_, uint32 period_, uint32 n_) public 
    auth
    limited(startingPrice_, 1 szabo, 10 ether) ///Parameters are limited
    limited(priceMul_, ONE_WAD, 10 * ONE_WAD)
    limited(period_, 30 seconds, 1 weeks)
    {
        startingPrice = startingPrice_;
        _priceMultiplier = priceMul_;
        _period = period_;
        _n = n_;
        emit ButtonParamsChanged(startingPrice_, n_, period_, priceMul_);
    }

    /// Fractions must add up to 100%, and can only be set every 2 weeks
    function setAccountingParams(uint _devF, uint _charityF, uint _newCampF) public 
    auth
    limited(_devF.add(_charityF).add(_newCampF), 0, ONE_WAD) // up to 100% - charity fraction could be set to 100% for special occasions
    timeLimited(2 weeks) { // can only be changed once every 4 weeks
        require(_charityF <= ONE_WAD); // charity fraction can be up to 100%
        require(_devF <= 20 * ONE_PERCENT_WAD); //can't set the dev fraction to more than 20%
        require(_newCampF <= 10 * ONE_PERCENT_WAD);//less than 10%
        _devFraction = _devF;
        _charityFraction = _charityF;
        _newCampaignFraction = _newCampF;
        _jackpotFraction = ONE_WAD.sub(_devF).sub(_charityF).sub(_newCampF);
        emit AccountingParamsChanged(_devF, _charityF, _jackpotFraction);
    }

    ///Charity beneficiary can only be changed every 25 weeks
    function setCharityBeneficiary(address _charity) public 
    auth
    timeLimited(5 weeks) 
    {   
        require(_charity != address(0));
        charityBeneficiary = _charity;
        emit CharityChanged(_charity);
    }

    /// This allows the owner to withdraw surplus ETH
    function redeemSurplusETH() public auth {
        uint surplus = address(this).balance.sub(totalETH);
        balanceETH(base, surplus);
    }

    /// This allows the owner to withdraw surplus Tokens
    function redeemSurplusERC20(address token) public auth {
        uint realTokenBalance = ERC20(token).balanceOf(this);
        uint surplus = realTokenBalance.sub(totalTokenBalances[token]);
        balanceToken(base, token, surplus);
    }

    /// withdraw surplus ETH
    function withdrawBaseETH() public auth {
        sendETH(base, msg.sender, base.balanceETH);
    }

    /// withdraw surplus tokens
    function withdrawBaseERC20(address token) public auth {
        sendToken(base, token, msg.sender, base.tokenBalances[token]);
    }

}

contract TheButton is ButtonBase {
    
    using DSMath for uint;

    ///If the contract is stopped no new campaigns can be started, but any running campaing is not affected
    bool public stopped;

    constructor() public {
        stopped = true;
    }

    /// Press logic
    function press() public payable {
        //the last campaign
        ButtonCampaign storage c = campaigns[lastCampaignID];
        if (active()) {// if active
            _press(c);//register press
            depositETH(c.total, msg.sender, msg.value);// handle ETH
        } else { //if inactive (after deadline)
            require(!stopped, "Contract stopped!");//make sure we're not stopped
            if(!c.finalized) {//if not finalized
                _finalizeCampaign(c);// finalize last campaign
            } 
            _newCampaign();// start new campaign
            c = campaigns[lastCampaignID];
                    
            _press(c);//resigter press
            depositETH(c.total, msg.sender, msg.value);//handle ETH
        } 
    }

    function start() external payable auth {
        stopped = false;
        
        if(campaigns.length != 0) {//if there was a past campaign
            ButtonCampaign storage c = campaigns[lastCampaignID];
            require(c.finalized, "Last campaign not finalized!");//make sure it was finalized
        }     

        if(!active()) {//if not active
            _newCampaign();//start new campaign
            c = campaigns[lastCampaignID];
            depositETH(c.total, msg.sender, msg.value);// deposit ETH
        }
    }

    ///Stopping will only affect new campaigns, not already running ones
    function stop() external auth {
        stopped = true;
    }

    function finalizeLastCampaign() external {//Anyone can finalize campaigns in case the devs stop the contract
        require(stopped);
        ButtonCampaign storage c = campaigns[lastCampaignID];
        _finalizeCampaign(c);
    }

    function finalizeCampaign(uint id) external {
        require(stopped);
        ButtonCampaign storage c = campaigns[id];
        _finalizeCampaign(c);
    }

    //Press 
    function _press(ButtonCampaign storage c) internal {
        require(c.deadline >= now, "After deadline!");//must be before the deadline
        require(msg.value >= c.price, "Not enough value!");// must have at least the price value
        c.presses += 1;//no need for safe math, as it is not a critical calculation
        c.lastPresser = msg.sender;
             
        if(c.presses % c.n == 0) {// increase the price every n presses
            c.price = c.price.wmul(c.priceMultiplier);
        }           

        emit Pressed(msg.sender, msg.value, c.deadline - uint64(now));
        c.deadline = uint64(now.add(c.period));// set the new deadline
    }

    function _newCampaign() internal {
        require(!active(), "A campaign is already running!");
        require(_devFraction.add(_charityFraction).add(_jackpotFraction).add(_newCampaignFraction) == ONE_WAD, "Accounting is incorrect!");
        
        uint _campaignID = campaigns.length++;
        ButtonCampaign storage c = campaigns[_campaignID];
        lastCampaignID = _campaignID;

        c.price = startingPrice;
        c.priceMultiplier = _priceMultiplier;
        c.devFraction = _devFraction;
        c.charityFraction = _charityFraction;
        c.jackpotFraction = _jackpotFraction;
        c.newCampaignFraction = _newCampaignFraction;
        c.deadline = uint64(now.add(_period));
        c.n = _n;
        c.period = _period;
        c.total.name = keccak256(abi.encodePacked("Total", lastCampaignID));       
        transferETH(nextCampaign, c.total, nextCampaign.balanceETH);
        emit Started(c.total.balanceETH, _period, lastCampaignID); 
    }

    function _finalizeCampaign(ButtonCampaign storage c) internal {
        require(c.deadline < now, "Before deadline!");
        require(!c.finalized, "Already finalized!");
        
        uint totalBalance = c.total.balanceETH;

        if(c.presses != 0) {//If there were presses

            //Handle all of the accounting
            
            transferETH(c.total, winners[c.lastPresser], totalBalance.wmul(c.jackpotFraction));
            winners[c.lastPresser].name = bytes32(c.lastPresser);
            totalWon = totalWon.add(totalBalance.wmul(c.jackpotFraction));

            transferETH(c.total, revenue, totalBalance.wmul(c.devFraction));
            totalRevenue = totalRevenue.add(totalBalance.wmul(c.devFraction));

            transferETH(c.total, charity, totalBalance.wmul(c.charityFraction));
            totalCharity = totalCharity.add(totalBalance.wmul(c.charityFraction));

            //avoiding rounding errors - just transfer the leftover
            transferETH(c.total, nextCampaign, c.total.balanceETH);

            totalPresses = totalPresses.add(c.presses);

            c.finalized = true;
            emit Winrar(c.lastPresser, totalBalance.wmul(c.jackpotFraction));
        } else {
            // else just transfer all of the balance to the next campaign
            transferETH(c.total, nextCampaign, totalBalance);
        }
    }
}