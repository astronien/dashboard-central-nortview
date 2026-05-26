const handler = require('../api/sync-sheets.js');

// Mock request and response
const req = {
  method: 'POST',
  query: {
    branch: 'iStudio Mega Bangna'
  }
};

const res = {
  setHeader: () => {},
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    console.log(`Response Code: ${this.statusCode}`);
    console.log("Response Body:", JSON.stringify(data, null, 2));
  },
  end: function() {
    console.log(`Response Ended with Code: ${this.statusCode}`);
  }
};

async function run() {
  console.log("Running local sync debug for all kinds with branch 'iStudio Mega Bangna'...");
  await handler(req, res);
}

run().catch(console.error);
