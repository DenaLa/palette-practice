/*
1. request from pixabay
2. once pixaby request is received, request from x-colors
4. Display what you need to on the screen.
*/


/*
Pixaby: GET from
https://pixabay.com/api/
with API Key
APIKEY absent from GITHUB version for obvious reasons.
 
X-Colors: GET from
https://x-colors.herokuapp.com/api/random 
 */


//require
const fs = require("fs");
const http = require("http");
const https = require("https");
const { apikey } = require("./auth/auth.json");

//Variables
const port = 3000;
const server = http.createServer();
const amount = 20;
var imagesURL = [];
var prevTopic = "";

//Server prereq
server.on("listening", listeningHandler);
server.listen(port);

//Listener confirmation
function listeningHandler() {
    console.log(`Listening on Port: ${port}`);
}

server.on("request", requestHandler);

//request handler
function requestHandler(req, res) {
    console.log(`New request for ${req.url} from ${req.socket.RemoteURL}`);

    if (req.url === "/") {
        const form = fs.createReadStream("html/main.html");
        res.writeHead(200, { "Content-Type": "text/html" });
        form.pipe(res);
    }

    else if (req.url.startsWith("/site-images/")) {
        const imgStream = fs.createReadStream(`.${req.url}`)
        imgStream.on("error", imgErrorHandler);
        imgStream.on("ready", deliverImg);

        function deliverImg() {
            res.writeHead(200, { "Content-Type": "image/jpg" });
            imgStream.pipe(res);
        }

        function imgErrorHandler(err) {
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.write("404 Not Found", () => res.end());

        }

    }
    else if (req.url === "/favicon.ico") {
        const favicon = fs.createReadStream('site-images/favicon.ico');
        res.writeHead(200, { "Content-Type": "image/x-icon" });
        favicon.pipe(res);
    }
    else if (req.url.startsWith("/search")) {
        const UserInput = new URL(req.url, "https://localhost:3000").searchParams;
        const topic = UserInput.get("topic");
        if (topic === null || topic === "") {
            res.writeHead(404, { "Content-Type": "text/html" });
            res.end("<h1>No Input</h1>");
        }
        else if (topic != prevTopic) {
            const pixabyEndpoint = `https://pixabay.com/api/?key=${apikey}&q=${topic}`;
            const pixabyRequest = https.request(pixabyEndpoint, { method: "GET" });
            prevTopic = topic;

            //Start fetching api data
            pixabyRequest.on("response", (pixabyResponse) => parseStream(pixabyResponse, fetchPixabyURL, topic, res));
            pixabyRequest.end();
        }
        else {
            console.log(`Repeat topic ${topic}.`);
            XColorsAPIGet(imagesURL, prevTopic, res)
        }
    }
    else {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end(`<h1>404 Not Found</h1>`);
    }

}

//parse datastream
function parseStream(stream, callback, ...args) {
    let body = "";
    stream.on("data", chunk => body += chunk);
    stream.on("end", () => callback(body, ...args));
}

//get urls from Pixabay
function fetchPixabyURL(data, topic, res) {
    console.log(`Now fetching image URLS for ${topic}. Please wait.`);
    const response = JSON.parse(data);
    if (response.totalHits === 0) {
        res.end(`<h1>404 Not Found</h1>`);
    }
    else {
        imagesURL = [];
        var syncCheck = 0;
        for (let i = 0; i < amount; i++) {
            imagesURL.push(response.hits[i].pageURL);
            syncCheck++;
            if (syncCheck === amount) {
                XColorsAPIGet(imagesURL, topic, res);
            }
        }
    }
}


//get XColors colors
function XColorsAPIGet(imagesURL, topic, res) {
    console.log(`Now creating color palette for chosen ${topic} image. Please wait.`)
    const XCendpoint = `https://x-colors.herokuapp.com/api/random?number=5`;
    const XCRequest = https.request(XCendpoint, { method: "GET" });
    XCRequest.on("response", (clResponse) => parseStream(clResponse, createPalette, imagesURL, topic, res));
    XCRequest.end();

}

//Get XColors hexes
function createPalette(data, imagesURL, topic, res) {
    const response = JSON.parse(data);
    const hexes = [];
    var syncCheck = 0;
    for (let i = 0; i < 5; i++) {
        hexes.push(response[i].hex);
        syncCheck++;
        if (syncCheck === 5) {
            displayWebpage(imagesURL, topic, hexes, res);
        }
    }

}


//Displays webpage
function displayWebpage(imagesURL, topic, hexes, res) {
    let min = Math.ceil(0);
    let max = Math.floor(19);
    let chosenURL = imagesURL[Math.floor(Math.random() * (max - min) + min)];

    res.end(`<h1>Image and Palette for ${topic}</h1><a href="${chosenURL}">${topic} Image</a>` +
        `<html>
        <body>
        <canvas id="canvas" width="490" height="90" style="border:1px solid #000000;">
        </canvas>

        <script>
        var c = document.getElementById("canvas");
        var ctx = c.getContext("2d");

        c.style.left = "0px";
        c.style.top = "100px";
        c.style.position = "absolute";
        ctx.fillStyle = "${hexes[0]}";
        ctx.fillRect(0, 0, 100, 100);
        ctx.fillStyle = "${hexes[1]}";
        ctx.fillRect(100, 0, 100, 100);
        ctx.fillStyle = "${hexes[2]}";
        ctx.fillRect(200, 0, 100, 100);
        ctx.fillStyle = "${hexes[3]}";
        ctx.fillRect(300, 0, 100, 100);
        ctx.fillStyle = "${hexes[4]}";
        ctx.fillRect(400, 0, 100, 100);
        </script>

        </body>
        </html>`);

}
