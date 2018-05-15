pragma solidity^0.4.21;

import "./lib/ds-auth/auth.sol";
import "./lib/DSMathLib.sol";

contract SimpleAccounting {

    using DSMath for uint;

    bool internal _in;
    
    modifier noReentrance() {
        require(!_in);
        _in = true;
        _;
        _in = false;
    }
    
    uint public totalETH;

    struct Account {
        uint balance;
        bytes32 name;
    }

    Account base = Account({
        balance: 0,
        name: "Base"
    });

    // event ETHDeposited(bytes32 indexed account, address indexed from, uint value);
    event ETHSent(bytes32 indexed account, address indexed to, uint value);
    event ETHTransferred(bytes32 indexed fromAccount, bytes32 indexed toAccount, uint value);

    function () public payable {
        depositETH(base, msg.sender, msg.value);
    }

    function baseETHBalance() public constant returns(uint) {
        return base.balance;
    }

    function depositETH(Account storage a, address _from, uint _value) internal {
        a.balance = a.balance.add(_value);
        totalETH = totalETH.add(_value);
        // emit ETHDeposited(a.name, _from, _value); remove deposit events to save gas
    }

    function sendETH(Account storage a, address _to, uint _value) 
    internal noReentrance 
    {
        require(a.balance >= _value);
        require(_to != address(0));
        
        a.balance = a.balance.sub(_value);
        totalETH = totalETH.sub(_value);

        _to.transfer(_value);
        
        emit ETHSent(a.name, _to, _value);
    }

    function transact(Account storage a, address _to, uint _value, bytes data) 
    internal noReentrance 
    {
        require(a.balance >= _value);
        require(_to != address(0));
        
        a.balance = a.balance.sub(_value);
        totalETH = totalETH.sub(_value);

        require(_to.call.value(_value)(data));
        
        emit ETHSent(a.name, _to, _value);
    }

    function transferETH(Account storage _from, Account storage _to, uint _value) 
    internal 
    {
        require(_from.balance >= _value);
        _from.balance = _from.balance.sub(_value);
        _to.balance = _to.balance.add(_value);
        emit ETHTransferred(_from.name, _to.name, _value);
    }

    function balance(Account storage toAccount,  uint _value) internal {
        require(address(this).balance >= totalETH.add(_value));
        depositETH(toAccount, 0x0, _value);
    }

}

contract ButtonBase is DSAuth, SimpleAccounting {

    using DSMath for uint;

    uint constant ONE_PERCENT_WAD = 10 ** 16;// 1 wad is 10^18, so 1% in wad is 10^16
    uint constant ONE_WAD = 10 ** 18;

    uint public totalRevenue;
    uint public totalCharity;
    uint public totalWon;

    uint public totalPresses;

    uint public startingPrice = 1 finney;
    uint internal _priceMultiplier = 105 * 10 **16;
    uint32 internal _n = 3; //increase the price after every n presses
    uint32 internal _period = 3 minutes;// what's the period for pressing the button
    uint internal _newCampaignFraction = ONE_PERCENT_WAD / 2; //0.5%
    uint internal _devFraction = 10 * ONE_PERCENT_WAD - _newCampaignFraction; //9.5%
    uint internal _charityFraction = 5 * ONE_PERCENT_WAD; //5%
    uint internal _jackpotFraction = 85 * ONE_PERCENT_WAD;
    
    address public charityBeneficiary;

    Account public revenue = 
    Account({
        balance: 0,
        name: "Revenue"
    });

    Account public nextCampaign = 
    Account({
        balance: 0,
        name: "Next Campaign"
    });

    Account public charity = 
    Account({
        balance: 0,
        name: "Charity"
    });

    mapping (address => Account) winners;

    modifier limited(uint value, uint min, uint max) {
        require(value >= min && value <= max);
        _;
    }

    mapping (bytes4 => uint) internal _lastExecuted;
    modifier timeLimited(uint _howOften) {
        require(_lastExecuted[msg.sig].add(_howOften) <= now);
        _lastExecuted[msg.sig] = now;
        _;
    }

    event Pressed(address by, uint paid, uint64 timeLeft);
    event Started(uint startingETH, uint32 period, uint i);
    event Winrar(address guy, uint jackpot);

    event CharityChanged(address newCharityBeneficiary);
    event ButtonParamsChanged(uint startingPrice, uint32 n, uint32 period, uint priceMul);
    event AccountingParamsChanged(uint devFraction, uint charityFraction, uint jackpotFraction);

    struct ButtonCampaign {
        uint price;        
        uint priceMultiplier;
        uint devFraction;
        uint charityFraction;
        uint jackpotFraction;
        uint newCampaignFraction;

        address lastPresser;
        uint64 deadline;
        uint40 presses;
        uint32 n;
        uint32 period;
        bool finalized;

        Account total;       
    }

    uint public lastCampaignID;
    ButtonCampaign[] public campaigns;

    function press() public payable;
    
    function () public payable {
        press();
    }

    function latestData() external view returns(uint price, uint jackpot, uint charity, uint64 deadline, uint presses) {
        price = this.price();
        jackpot = this.jackpot();
        charity = this.charity();
        deadline = this.deadline();
        presses = this.presses();
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
        if(active()) {
            return campaigns[lastCampaignID].total.balance.wmul(campaigns[lastCampaignID].jackpotFraction);
        } else {
            return nextCampaign.balance.wmul(_jackpotFraction);
        }
    }

    function presses() external view returns(uint) {
        if(active()) {
            return campaigns[lastCampaignID].presses;
        } else {
            return 0;
        }
    }

    function totalPresses() external view returns(uint) {
        return totalPresses.add(this.presses());
    }

    function charity() external view returns(uint) {
        if(active()) {
            return campaigns[lastCampaignID].total.balance.wmul(campaigns[lastCampaignID].charityFraction);
        } else {
            return nextCampaign.balance.wmul(_charityFraction);
        }
    }

    function totalCharity() external view returns(uint) {
        return totalCharity.add(this.charity());
    }

    function active() public view returns(bool) {
        if(campaigns.length == 0) { 
            return false;
        } else {
            return campaigns[lastCampaignID].deadline >= now;
        }
    }

    function hasWon(address _guy) external view returns(uint) {
        return winners[_guy].balance;
    }

    function withdrawJackpot() public {
        require(winners[msg.sender].balance > 0, "Nothing to withdraw!");
        sendETH(winners[msg.sender], msg.sender, winners[msg.sender].balance);
    }

    function donateJackpot() public {
        require(winners[msg.sender].balance > 0, "Nothing to donate!");
        transferETH(winners[msg.sender], charity, winners[msg.sender].balance);
    }

    function withdrawRevenue() public auth {
        sendETH(revenue, owner, revenue.balance);
    }

    function sendCharityETH(bytes callData) public auth {
        // require(charityBeneficiary != address(0), "Charity address is 0x0!");
        // donation receiver might be a contract, so transact instead of a simple send...
        transact(charity, charityBeneficiary, charity.balance, callData);
    }

    function setButtonParams(uint startingPrice_, uint priceMul_, uint32 period_, uint32 n_) public 
    auth
    limited(startingPrice_, 1 szabo, 10 ether)
    limited(priceMul_, ONE_WAD, 10 * ONE_WAD)
    limited(period_, 30 seconds, 1 weeks)
    {
        startingPrice = startingPrice_;
        _priceMultiplier = priceMul_;
        _period = period_;
        _n = n_;
        emit ButtonParamsChanged(startingPrice_, n_, period_, priceMul_);
    }

    function setAccountingParams(uint _devF, uint _charityF, uint _newCampF) public 
    auth
    limited(_devF.add(_charityF).add(_newCampF), 0, ONE_WAD) // up to 100% - charity fraction could be set to 100% for special occasions
    timeLimited(4 weeks) { // can only be changed once every 4 weeks
        require(_charityF <= ONE_WAD); // charity fraction can be up to 100%
        require(_devF <= 20 * ONE_PERCENT_WAD); //can't set the dev fraction to more than 20%
        require(_newCampF <= 10 * ONE_PERCENT_WAD);//less than 10%
        _devFraction = _devF;
        _charityFraction = _charityF;
        _newCampaignFraction = _newCampF;
        _jackpotFraction = ONE_WAD.sub(_devF).sub(_charityF).sub(_newCampF);
        emit AccountingParamsChanged(_devF, _charityF, _jackpotFraction);
    }

    function setCharityBeneficiary(address _charity) public 
    auth
    timeLimited(25 weeks) 
    {   
        require(_charity != address(0));
        charityBeneficiary = _charity;
        emit CharityChanged(_charity);
    }
}


contract TheButton is ButtonBase {
    
    using DSMath for uint;

    bool public stopped;

    constructor() public {

    }

    function press() public payable {
        ButtonCampaign storage c = campaigns[lastCampaignID];
        if (active()) {
            _press(c);
            depositETH(c.total, msg.sender, msg.value);
        } else {  
            require(!stopped, "Contract stopped!");//the contract can be stopped 
            if(!c.finalized) {
                _finalizeCampaign(c);
            } 
            _newCampaign();
            c = campaigns[lastCampaignID];
                    
            _press(c);
            depositETH(c.total, msg.sender, msg.value);
        } 
    }

    function start() external payable auth {
        stopped = false;
        
        if(campaigns.length != 0) {//if there was a past campaign
            ButtonCampaign storage c = campaigns[lastCampaignID];
            require(c.finalized, "Last campaign not finalized!");//make sure it was finalized
        }     

        if(!active()) {
            _newCampaign();
            c = campaigns[lastCampaignID];
            depositETH(c.total, msg.sender, msg.value);
        }
    }

    ///Stopping will only affect new campaigns, not already running ones
    function stop() external auth {
        stopped = true;
    }

    function finalizeLastCampaign() external {
        ButtonCampaign storage c = campaigns[lastCampaignID];
        _finalizeCampaign(c);
    }

    function finalizeCampaign(uint id) external {
        ButtonCampaign storage c = campaigns[id];
        _finalizeCampaign(c);
    }

    function _press(ButtonCampaign storage c) internal {
        require(c.deadline >= now, "After deadline!");
        require(msg.value >= c.price, "Not enough value!");
        c.presses += 1;//no need for safe math, as it is not a critical calculation
        c.lastPresser = msg.sender;
             
        if(c.presses % c.n == 0) {
            c.price = c.price.wmul(c.priceMultiplier);
        }           

        emit Pressed(msg.sender, msg.value, c.deadline - uint64(now));
        c.deadline = uint64(now.add(c.period));
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
        c.total.name = keccak256("Jackpot ", lastCampaignID);       
        transferETH(nextCampaign, c.total, nextCampaign.balance);
        emit Started(c.total.balance, _period, lastCampaignID); 
    }

    function _finalizeCampaign(ButtonCampaign storage c) internal {
        require(c.deadline < now, "Before deadline!");
        require(!c.finalized, "Already finalized!");
        uint total = c.total.balance;

        transferETH(c.total, winners[c.lastPresser], total.wmul(c.jackpotFraction));
        winners[c.lastPresser].name = bytes32(c.lastPresser);
        totalWon = totalWon.add(total.wmul(c.jackpotFraction));

        transferETH(c.total, revenue, total.wmul(c.devFraction));
        totalRevenue = totalRevenue.add(total.wmul(c.devFraction));

        transferETH(c.total, charity, total.wmul(c.charityFraction));
        totalCharity = totalCharity.add(total.wmul(c.charityFraction));

        transferETH(c.total, nextCampaign, total.wmul(c.newCampaignFraction));

        totalPresses = totalPresses.add(c.presses);

        c.finalized = true;
        emit Winrar(c.lastPresser, total.wmul(c.jackpotFraction));
    }
}