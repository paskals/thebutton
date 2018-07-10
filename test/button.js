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
    if (n>1.5) {
      withCommas = Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
    } else {
      withCommas = Number(n).toLocaleString(undefined, { maximumFractionDigits: 4 });
    }
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

        return true;
        
    });



});