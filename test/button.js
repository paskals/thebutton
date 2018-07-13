var TheButton = artifacts.require("TheButton");

const increaseTime = addSeconds => {
    web3.currentProvider.send({
        jsonrpc: "2.0", 
        method: "evm_increaseTime", 
        params: [addSeconds], id: 0
    })
}

function formatETHString(n) {
    n = web3.fromWei(n, 'ether');
    var withCommas;
    withCommas = Number(n).toLocaleString(undefined, { maximumFractionDigits: 6 });
    
    return withCommas;
  };

contract('TheButton', function (accounts) {

    var button;
    var price = 0;

    var account_one = accounts[0];

    var account_two = accounts[1];

    var account_three = accounts[2];

    var account_four = accounts[3];

    it("Shouldn't be able to start if you're not the owner.", async function () {   
        button = await TheButton.deployed();
        console.log(button.address);
        price = await button.price.call({from: account_one});

        try {
            await button.start({ from: account_two, value: price });
        } catch(e) { 
            // console.log(e);
            return true;
        }
        throw new Error("Anyone can start the button!");
    });

    it("Shouldn't be able to set the charity address if you're not the owner.", async function () {   
        try {
            await button.setCharityBeneficiary(account_three, { from: account_two});
        } catch(e) { 
            // console.log(e);
            return true;
        }
        throw new Error("Anyone can set the charity!");
    });

    it("Should be able to set the charity address.", async function () {   
        
        await button.setCharityBeneficiary(account_three, { from: account_one});
        var charity = await button.charityBeneficiary.call({ from: account_one});
        assert.equal(charity, account_three, "Charity address is wrong");
    });

    it("Should start correctly.", async function () {        
        price = await button.price.call({from: account_one});

        await button.start({ from: account_one, value: price*100 });               
    });

    it("Should be able to press.", async function () {        
        price = await button.price.call({from: account_two});

        await button.press({ from: account_two, value: price });
               
    });

    it("Should be able to stop and finalize.", async function () {    
        await button.stop({from: account_one});    
        let period = await button.period.call();
        await increaseTime(period.toNumber() + 1);

        await button.finalizeLastCampaign({from: account_one});
               
    });

    it("Correct accounting.", async function () {    
        var totalCharity = await button.totalCharity.call({from: account_one});
        var totalWon = await button.totalWon.call({from: account_one});
        var won = await button.hasWon.call(account_two, {from: account_two});
        var totalRevenue = await button.totalRevenue.call({from: account_one});
        var leftover = await button.baseETHBalance.call({from: account_one});
         
        var presserStartingBalance = await web3.eth.getBalance(account_two);
        var charityStartingBalance = await web3.eth.getBalance(account_three);  
        var contractStartingBalance = await web3.eth.getBalance(button.address);

        assert.equal(totalWon.toNumber(), won.toNumber(), "Actual jackpot is wrong!");
        assert.equal(contractStartingBalance.toNumber(),
         totalCharity.toNumber() + totalWon.toNumber() + totalRevenue.toNumber() + leftover.toNumber(),
          "Total accounting is wrong!");

        await button.withdrawJackpot({from: account_two, gasPrice: 0});
        var finalPresserBalance = await web3.eth.getBalance(account_two);

        assert.equal(presserStartingBalance.toNumber() + won.toNumber(), finalPresserBalance.toNumber(),
        "Jackpot not withdrawn correctly!");

        var ownerStartingBalance = await web3.eth.getBalance(account_one);
        await button.withdrawRevenue({from: account_one, gasPrice: 0});
        var finalOwnerBalance = await web3.eth.getBalance(account_one);

        assert.equal(ownerStartingBalance.toNumber() + totalRevenue.toNumber(), finalOwnerBalance.toNumber(),
        "Revenue not withdrawn correctly!");

        await button.sendCharityETH("0x0", {from: account_one, gasPrice: 0});
        var finalCharityBalance = await web3.eth.getBalance(account_three);

        assert.closeTo(charityStartingBalance.toNumber() + totalCharity.toNumber(), finalCharityBalance.toNumber(),
        1,
        "Charity not withdrawn correctly!");

        await button.withdrawBaseETH({from: account_one});
        var finalContractBalance = await web3.eth.getBalance(button.address);

        assert.equal(finalContractBalance.toNumber(), 0, "Leftover not withdrawn correctly!");
               
    });

    it("Should start correctly.", async function () {        
        price = await button.price.call({from: account_one});

        await button.start({ from: account_one, value: price });               
    });

    it("Should be able to press 500 times.", async function () {  
        let nAccounts = 10;      
        await increaseTime(1);
        for(var i = 0; i < 500; i++) {
            price = await button.price.call();
            await increaseTime(1);
            await button.press({ from: accounts[i%nAccounts], value: price });
        }    

        await increaseTime(1);

        let stats = await button.latestData.call();
        console.log("Price: " + formatETHString(stats[0]));
        console.log("Jackpot: " + formatETHString(stats[1]));
        console.log("Charity: " + formatETHString(stats[2]));
        console.log("Deadline: " + stats[3].toNumber());
        console.log("Presses: " + stats[4].toNumber());
        console.log("Last Presser: " + stats[5])

        let totals = await button.totalsData.call();
        console.log("Total Won: " + formatETHString(totals[0]));
        console.log("Total Charity: " + formatETHString(totals[1]));
        console.log("Total Presses: " + totals[2].toNumber());

        return true;
        
    });

    it("Should be able to press 500 times MORE.", async function () {  
        let nAccounts = 10;      
        await increaseTime(1);
        for(var i = 0; i < 500; i++) {
            price = await button.price.call();
            await increaseTime(1);
            await button.press({ from: accounts[i%nAccounts], value: price });
        }    

        await increaseTime(1);

        let stats = await button.latestData.call();
        console.log("Price: " + formatETHString(stats[0]));
        console.log("Jackpot: " + formatETHString(stats[1]));
        console.log("Charity: " + formatETHString(stats[2]));
        console.log("Deadline: " + stats[3].toNumber());
        console.log("Presses: " + stats[4].toNumber());
        console.log("Last Presser: " + stats[5])

        let totals = await button.totalsData.call();
        console.log("Total Won: " + formatETHString(totals[0]));
        console.log("Total Charity: " + formatETHString(totals[1]));
        console.log("Total Presses: " + totals[2].toNumber());

        return true;
        
    });

    var winner;
    it("Should be able to finalize", async function () {  
        
        let period = await button.period.call();
        await increaseTime(period.toNumber());
        price = await button.price.call();

        await button.stop({from: account_one})

        await button.finalizeLastCampaign({from: account_one});
        

        let stats = await button.latestData.call();
        console.log("Price: " + formatETHString(stats[0]));
        console.log("Jackpot: " + formatETHString(stats[1]));
        console.log("Charity: " + formatETHString(stats[2]));
        console.log("Deadline: " + stats[3].toNumber());
        console.log("Presses: " + stats[4].toNumber());
        console.log("Last Presser: " + stats[5])

        let totals = await button.totalsData.call();
        console.log("Total Won: " + formatETHString(totals[0]));
        console.log("Total Charity: " + formatETHString(totals[1]));
        console.log("Total Presses: " + totals[2].toNumber());

        winner = stats[5];

        return true;
        
    });

    it("Correct accounting again.", async function () {    
        await button.withdrawJackpot({from: accounts[9], gasPrice: 0});
        
        await button.withdrawRevenue({from: account_one, gasPrice: 0});
        
        await button.sendCharityETH("0x0", {from: account_one, gasPrice: 0});
        
        await button.withdrawBaseETH({from: account_one});
        var finalContractBalance = await web3.eth.getBalance(button.address);

        assert.equal(finalContractBalance.toNumber(), 0, "Incorrect accounting");               
    });



});