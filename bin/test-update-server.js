const { createServer } = require("../test/helpers/create-server");

async function main() {
  const { server, address } = await createServer();
  console.log(`Server running at ${address}`);
}

main();
