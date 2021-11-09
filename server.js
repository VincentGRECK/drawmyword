import express from "express";
import path from "path";
import reload from "reload";
import expressWs from "express-ws";
import { v4 } from "uuid";
import cookieParser from "cookie-parser";
import fs, { fchownSync } from 'fs';
import nunjucks from "nunjucks";

const app = express();
const port = 3000;
let time = 90;
let interDelay = 10;
let onInter = true;
let currentWord = "void";
let initGame = true;
let selectedPlayer;
let gameRow = 3;


const words = fs.readFileSync("./words.txt", { encoding: "utf-8" }).split(";");

expressWs(app);
app.use(cookieParser());
app.use(express.urlencoded());
nunjucks.configure("client", { autoescape: true, express: app });

var oSocketMap = [];
var oSocketLobbyMap = [];

var intervalID = setInterval(myCallback, 1000);

function myCallback() {
    // Your code here
    // Parameters are purely optional.
    if (onInter === false) {
        time = time - 1;
        // if time < 0
        if (time < 0) {
            // we reset at 90
            time = 90;
            // we start the inter-game delay
            onInter = true
            // we announce that nobody found the word
        }
        else {
            var messageData = new Object();
            messageData.type = "time";
            messageData.value = time.toString();
            var jsonString = JSON.stringify(messageData);
            oSocketMap.forEach(element => element.send(jsonString));
        }
    }
    else {
        interDelay = interDelay - 1;
        console.log(interDelay);
        console.log(onInter);
        if (interDelay < 0) {
            // if the interdelay is ended

            // we check the founders 
            if (initGame === false) {
                let founder = 0;
                let gameMessage = "Game is finished! ";
                // if true, we go on intergame
                gameMessage = gameMessage + "Lets start a new game";

                oSocketMap.forEach(element => {
                    if (element.found === true) {
                        founder = founder + 1;
                    }
                });
                if (founder > 0) {
                    selectedPlayer.score = selectedPlayer.score + 30;
                }


                var messageData = new Object();
                messageData.type = "chat";
                messageData.text = gameMessage;
                var jsonString = JSON.stringify(messageData);
                oSocketMap.forEach(element => element.send(jsonString));
                // we update the score
                let scoreMessage = "";
                oSocketMap.forEach(element => {
                    scoreMessage = scoreMessage + element.name + ": " + element.score.toString() + "\n" + "\n";
                });
                console.log(scoreMessage);

                var scoreData = new Object();
                scoreData.type = "score";
                scoreData.text = scoreMessage;
                var jsonStringScore = JSON.stringify(scoreData);
                oSocketMap.forEach(element => element.send(jsonStringScore));

                gameRow = gameRow - 1;
                console.log("game - 1 ");
                if(gameRow <= 0)
                {
                    console.log("end game");
                    gameRow = 3;
                    initGame = true;
                    var messageData = new Object();
                    messageData.type = "end-game";
                    var jsonString = JSON.stringify(messageData);
                    oSocketMap.forEach(element => element.send(jsonString));
                    // we clear the socket tab
                }
                
            }
            else {
                console.log("init end??");
                console.log(oSocketMap.length);
                if(oSocketMap.length > 0)
                {
                    initGame = false;
                }
            }

            oSocketMap.forEach(element => element.found = false);
            oSocketMap.forEach(element => element.isDrawer = false);
            interDelay = 10;
            if (oSocketMap.length > 0) {
                onInter = false;
                // we launch a new match
                // we randomize the turn 
                // we read the word file and send it
                currentWord = words[getRandomInt(words.length)];
                console.log(currentWord);
                // for the others
                // {type: "game", turn: "false"}
                var messageData = new Object();
                messageData.type = "game";
                messageData.turn = "false";
                var jsonString = JSON.stringify(messageData);
                oSocketMap.forEach(element => element.send(jsonString));
                // for the picked player
                selectedPlayer = oSocketMap[getRandomInt(oSocketMap.length)];
                selectedPlayer.isDrawer = true;
                // {type: "game", turn: "true" , word: "ananas"}
                var messageData = new Object();
                messageData.type = "game";
                messageData.turn = "true";
                messageData.word = currentWord;
                var jsonString = JSON.stringify(messageData);
                selectedPlayer.send(jsonString);
            }
            else
            {
                console.log("nobody is on game");
            }
        }
    }

}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

// --------------------------

app.ws('/ws-lobby', (socket, req) => {
    // we store the socket on a array
    if (socket.id === undefined) {
        socket.name = "null";
        oSocketLobbyMap.push(socket);
    }

    socket.on("message", (message) => {
        console.log("socket message received from lobby", message);
        const oData = JSON.parse(message);
        if (oData.type === "client-info") {
            socket.id = oData.id;
            socket.name = oData.name;

            // we send the list of players to the front end

            let listOfPlayersMessage = "";
            oSocketLobbyMap.forEach(element => {
                listOfPlayersMessage = listOfPlayersMessage + element.name + "\n";
            });

            var messageData = new Object();
            messageData.type = "server-lobby-list";
            messageData.data = listOfPlayersMessage;
            var jsonString = JSON.stringify(messageData);
            oSocketLobbyMap.forEach(element => element.send(jsonString));
        }
        else
        {
            oSocketLobbyMap.forEach(element => element.send(message));
        }
    });

    socket.on("close", (code) => {
        console.log("socket closed", code)

        oSocketLobbyMap = oSocketLobbyMap.filter(function (obj) {
            return obj.id !== socket.id;
        });
        console.log(oSocketLobbyMap.length);
        // we send the list of players to the front end

        let listOfPlayersMessage = "";
        oSocketLobbyMap.forEach(element => {
            listOfPlayersMessage = listOfPlayersMessage + element.name + "\n";
        });

        var messageData = new Object();
        messageData.type = "server-lobby-list";
        messageData.data = listOfPlayersMessage;
        var jsonString = JSON.stringify(messageData);
        oSocketLobbyMap.forEach(element => element.send(jsonString));
    });



    socket.on("error", (error) => console.log("socket error", error));
});

// -------------------------

app.ws('/socket', (socket, req) => {
    console.log("new socket connection /socket");
    // we store the socket on a array

    if (socket.id === undefined) {
        socket.id = v4();
        socket.name = "null";
        socket.score = 0;
        oSocketMap.push(socket);
    }

    socket.on("message", (message) => {
        console.log("socket message received", message);
        const oData = JSON.parse(message);
        let response = false;
        // if it's a chat message
        // if it's a chat message we display it
        if (oData.type === "client-info") {
            console.log("identity gived");
            socket.id = oData.id;
            socket.name = oData.name;
        }
        if (oData.type === "chat") {
            console.log("chat");
            // we save the current time
            const localTime = time;
            // we check if we are not on inter game
            // if the message == selected word
            if (onInter === false && oData.text === currentWord) {
                response = true;
                if (socket.found === false && socket.isDrawer === false) {
                    socket.found = true;
                    console.log("awnser found");
                    // score = score + current time
                    // we send the scores
                    // we send a message on chat from server
                    var messageData = new Object();
                    messageData.type = "chat";
                    messageData.text = "La réponse a été trouvé par joueur: " + socket.name;
                    var jsonString = JSON.stringify(messageData);
                    oSocketMap.forEach(element => element.send(jsonString));
                    // score calc
                    socket.score = socket.score + localTime;
                    // we send the score update
                }
                // we check if everyone found the word
                let founder = 0;
                oSocketMap.forEach(element => {
                    if (element.found === false) {
                        founder = founder + 1;
                    }
                });
                // if true, we go on intergame
                if (founder <= 1) {
                    // we go on intergame
                    console.log("everybody found the word");
                    // we reset at 90
                    time = 90;
                    // we start the inter-game delay
                    onInter = true
                }
            }
        }
        if (response === false) {
            oSocketMap.forEach(element => element.send(message));
        }
    });

    socket.on("close", (code) => {
        console.log("socket closed", code)

        oSocketMap = oSocketMap.filter(function (obj) {
            return obj.id !== socket.id;
        });
        console.log(oSocketMap.length);
    });

    socket.on("error", (error) => console.log("socket error", error));
});

app.get("/", (req, res) => {
    console.log("got request");

    const filePath = path.resolve("client/start.html");
    res.sendFile(filePath);
});

app.get("/result", (req, res) => {
    const scores = [];

    oSocketMap.forEach(element => {
        scores.push({ name: element.name, points: element.score })
    });
    
    res.render("result.html", { scores });
  });

app.post("/join", (req, res) => {
    res.cookie("id", v4());
    res.cookie("name", req.body.userName);
    res.redirect("lobby.html");
})

app.use(express.static("client"));

async function start() {
    try {
        await reload(app);
    } catch (err) {
        console.error("Error with reload", err);
    }

    app.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`);
    });
}

start();