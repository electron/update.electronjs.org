#!/usr/bin/env node

import { createServer } from '../test/helpers/create-server.ts';

async function main() {
  const { address } = await createServer();
  console.log(`Server running at ${address}`);
}

void main();
