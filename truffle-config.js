module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!

  networks: {
    gan: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*", // Match any network id
    },
    ganc: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "5777", // Match any network id
    },
  },
  compilers: {
    solc: {
      version: "native",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};
