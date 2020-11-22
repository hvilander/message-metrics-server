const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const port = process.env.PORT || 4001;
const index = require("./routes/index");

const fs = require('fs');
const readline = require('readline');

const SMALL_MOCK = 'mock/gps_can_data_small.csv';
const XXL_MOCK = 'mock/gps_can_data.csv';
const LINE_DELAY = 0;



const app = express();
app.use(index);

const server = http.createServer(app);

// CORS policy 'Access-Control-Allow-Origin' fix https://stackoverflow.com/questions/24058157/socket-io-node-js-cross-origin-request-blocked
// note this is not really a fix, in a production environment this would not be good. Really should require https, and better cross site security
const io = socketIo(server, { cors: { origin: '*' } });


/**
 * parses a line that was pulled out of the csv file 
 */
const parseLine = (line) => {
  const messageObj = {};
  const headers = ['message_id','dlc','payload','puc_id','ts','gps_id','latitude','longitude','groundspeed','truecourse'];
  const messageString = line.split(',');

  for(let i = 0; i < headers.length; i++) {
    const value = messageString[i];
    if(value && value != ''){
      messageObj[headers[i]] = messageString[i];
    }
  }

  return messageObj;
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// taken from example at https://nodejs.org/api/readline.html#readline_example_read_file_stream_line_by_line
async function processLineByLine(socket) {
  console.log('processLineByLine');
  try {
    const fileStream = fs.createReadStream(XXL_MOCK);

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    // Note: we use the crlfDelay option to recognize all instances of CR LF
    // ('\r\n') in input.txt as a single line break.

    for await (const line of rl) {
      // Each line in input.txt will be successively available here as `line`.

      // Electing to parse into json here. It could be done on the front end if desired.
      // The logic is the same in either place. Since there is likely a lot of expected messages,
      // I could also see where we would get a dumb of many lines to the front end too. 
      await sleep(LINE_DELAY);
      socket.emit("FromAPI", parseLine(line));
    }
  } catch (error) {
    console.log('error: ', error);
  }
}

io.on("connection", (socket) => {
  console.log("new client connected");

  processLineByLine(socket);

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
