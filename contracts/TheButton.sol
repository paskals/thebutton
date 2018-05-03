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
        
        a.balance = a.balance.sub(_value);
        totalETH = totalETH.sub(_value);

        _to.transfer(_value);
        
        emit ETHSent(a.name, _to, _value);
    }

    function transact(Account storage a, address _to, uint _value, bytes data) 
    internal noReentrance 
    {
        require(a.balance >= _value);
        
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

    uint public startingPrice;
    uint public priceMultiplier;//formula for calculating every next price
    uint32 public n = 1; //increase the price after every n presses
    uint32 public period = 1 hours;// what's the period for pressing the button
    uint public devFraction = 10 * ONE_PERCENT_WAD; //10%
    uint public charityFraction = 5 * ONE_PERCENT_WAD; //5%
    address public charityBeneficiary;

    Account public revenue = 
    Account({
        balance: 0,
        name: "Revenue"
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
    event Started(uint startingETH, uint32 period, uint32 i);
    event Winrar(address guy, uint jackpot);

    event CharityChanged(address newCharityBeneficiary);
    event ButtonParamsChanged(uint startingPrice, uint32 n, uint32 period, uint priceMul);
    event AccountingParamsChanged(uint devFraction, uint charityFraction);

    function press() public payable;
    function price() public view returns(uint);
    function timeLeft() external view returns(uint);
    function jackpot() external view returns(uint);
    function active() public view returns(bool);
    
    function () public payable {
        press();
    }

    function hasWon(address _guy) external view returns(uint) {
        return winners[_guy].balance;
    }

    function withdrawJackpot() public {
        require(winners[msg.sender].balance > 0);
        sendETH(winners[msg.sender], msg.sender, winners[msg.sender].balance);
    }

    function donateJackpot() public {
        require(winners[msg.sender].balance > 0);
        transferETH(winners[msg.sender], charity, winners[msg.sender].balance);
    }

    function withdrawRevenue() public auth {
        sendETH(revenue, owner, revenue.balance);
    }

    function sendCharityETH(bytes callData) public {
        require(charityBeneficiary != address(0));
        // donation receiver might be a contract, so transact instead of a simple send...
        transact(charity, charityBeneficiary, charity.balance, callData);
    }

    function jackpotFraction() public view returns(uint) {
        return ONE_WAD.sub(devFraction).sub(charityFraction);
    }

    function setButtonParams(uint _startingPrice, uint _priceMul, uint32 _period, uint32 _n) public 
    auth
    limited(_startingPrice, 1 szabo, 10 ether)
    limited(_priceMul, ONE_WAD, 10 * ONE_WAD)
    limited(period, 30 seconds, 1 weeks)
    {
        startingPrice = _startingPrice;
        priceMultiplier = _priceMul;
        period = _period;
        n = _n;
        emit ButtonParamsChanged(_startingPrice, _n, _period, _priceMul);
    }

    function setAccountingParams(uint _devF, uint _charityF) public 
    auth
    limited(_devF, 0, 20 * ONE_PERCENT_WAD) //can't set the dev fraction to more than 20%
    limited(_charityF, 0, 100 * ONE_PERCENT_WAD) // charity fraction can be up to 100%
    limited(_devF.add(_charityF), 0, ONE_WAD) // up to 100% - charity fraction could be set to 100% for special occasions
    timeLimited(4 weeks) { // can only be changed once every 4 weeks
        devFraction = _devF;
        charityFraction = _charityF;
        emit AccountingParamsChanged(_devF, _charityF);
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

    struct ButtonCampaign {
        uint price;        
        uint priceMultiplier;
        uint devFraction;
        uint charityFraction;

        address lastPresser;
        uint64 deadline;
        uint40 presses;
        uint32 n;
        uint32 period;
        bool finalized;

        Account total;       
    }

    uint32 public numCampaigns;
    ButtonCampaign[] public campaigns;

    constructor() public {

    }

    function press() public payable {
        ButtonCampaign storage c = campaigns[numCampaigns];
        if (active()) {
            _press(c);
        } else {            
            if(!c.finalized) {
                _finalizeCampaign(c);
            }
            _newCampaign();
            c = campaigns[numCampaigns];
                       
            _press(c);
        } 
    }

    function price() public view returns(uint) {
        if(active()) {
            return campaigns[numCampaigns].price;
        } else {
            return startingPrice;
        }
    }

    function timeLeft() external view returns(uint) {
        if (active()) {
            return campaigns[numCampaigns].deadline - now;
        } else {
            return 0;
        }
    }

    function deadline() external view returns(uint64) {
        return campaigns[numCampaigns].deadline;
    }

    function jackpot() external view returns(uint) {
        if(active()) {
            campaigns[numCampaigns].total.balance.wmul(jackpotFraction());
        } else {
            return 0;
        }
    }

    function active() public view returns(bool) {
        return campaigns[numCampaigns].deadline >= now;
    }

    function _press(ButtonCampaign storage c) internal {
        require(c.deadline >= now);
        require(msg.value >= c.price);
        c.presses += 1;//no need for safe math, as it is not a critical calculation
        c.lastPresser = msg.sender;
        emit Pressed(msg.sender, msg.value, c.deadline - uint64(now));
        c.deadline = uint64(now.add(c.period));        
        depositETH(c.total, msg.sender, msg.value);
    }

    function _newCampaign() internal {
        assert(!active());
        assert(devFraction.add(charityFraction).add(jackpotFraction()) == ONE_WAD);
        
        uint _campaignID = campaigns.length++;
        ButtonCampaign storage c = campaigns[_campaignID];
        numCampaigns++;

        c.price = startingPrice;
        c.priceMultiplier = priceMultiplier;
        c.devFraction = devFraction;
        c.charityFraction = charityFraction;
        c.deadline = uint64(now.add(period));
        c.n = n;
        c.period = period;
        c.total.name = keccak256("Jackpot ", numCampaigns);       
        emit Started(msg.value, period, numCampaigns); 
    }

    function _finalizeCampaign(ButtonCampaign storage c) internal {
        require(c.deadline < now);
        require(!c.finalized);
        uint total = c.total.balance;
        transferETH(c.total, winners[c.lastPresser], total.wmul(jackpotFraction()));
        winners[c.lastPresser].name = bytes32(c.lastPresser);
        transferETH(c.total, revenue, total.wmul(c.devFraction));
        transferETH(c.total, charity, total.wmul(c.charityFraction));

        c.finalized = true;
        emit Winrar(c.lastPresser, total.wmul(jackpotFraction()));
    }
}