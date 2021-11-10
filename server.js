import express from "express";
import path from "path";
import reload from "reload";
import expressWs from "express-ws";
import { v4 } from "uuid";
import cookieParser from "cookie-parser";
import fs, { copyFileSync, fchownSync } from 'fs';
import nunjucks from "nunjucks";

const app = express();
const port = 3000;

const words = fs.readFileSync("./words.txt", { encoding: "utf-8" }).split(";");

expressWs(app);
app.use(cookieParser());
app.use(express.urlencoded());
nunjucks.configure("client", { autoescape: true, express: app });


let oPartyMap = new Map();
let oPlayerMap = new Map();
let oPlayerLobbyMap = new Map();
let cachePlayerMap = new Map();

const POS_GAME_ID = 0;
const POS_TIME = 1;
const POS_INTERDELAY = 2;
const POS_ON_INTER = 3;
const POS_CURRENT_WORD = 4;
const POS_INIT_GAME= 5;
const POS_SELECTED_PLAYER = 6;
const POS_GAME_ROW = 7;


var intervalID = setInterval(myCallback, 1000);

function myCallback() {

    const iterator1 = oPartyMap[Symbol.iterator]();
    // iterator on each games on the game map
    for (const item of iterator1) {
        if (item[1][POS_ON_INTER] === false) {
            item[1][POS_TIME] = item[1][POS_TIME] - 1;
            // if time < 0
            if (item[1][POS_TIME] < 0) {
                // we reset at 90
                item[1][POS_TIME] = 90;
                // we start the inter-game delay
                item[1][POS_ON_INTER] = true
                // we announce that nobody found the word
            }
            else {
                var messageData = new Object();
                messageData.type = "time";
                messageData.value = item[1][POS_TIME].toString();
                var jsonString = JSON.stringify(messageData);
                oPlayerMap.get(item[1][POS_GAME_ID]).forEach(element => element.send(jsonString));
            }
        }
        else {
            item[1][POS_INTERDELAY] = item[1][POS_INTERDELAY]  - 1;
            // console.log(this.interDelay);
            if (item[1][POS_INTERDELAY]  < 0) {
                // if the interdelay is ended

                // we check the founders 
                if (item[1][POS_INIT_GAME]  === false) {
                    let founder = 0;
                    let gameMessage = "Game is finished! ";
                    // if true, we go on intergame
                    gameMessage = gameMessage + "Lets start a new game";

                    oPlayerMap.get(item[1][POS_GAME_ID] ).forEach(element => {
                        if (element.found === true) {
                            founder = founder + 1;
                        }
                    });
                    if (founder > 0) {
                        item[1][POS_SELECTED_PLAYER].score = item[1][POS_SELECTED_PLAYER].score + 30;
                    }


                    var messageData = new Object();
                    messageData.type = "chat";
                    messageData.text = gameMessage;
                    var jsonString = JSON.stringify(messageData);
                    oPlayerMap.get(item[1][POS_GAME_ID]).forEach(element => element.send(jsonString));
                    // we update the score
                    let scoreMessage = "";
                    oPlayerMap.get(item[1][POS_GAME_ID]).forEach(element => {
                        scoreMessage = scoreMessage + element.name + ": " + element.score.toString() + "\n" + "\n";
                    });

                    var scoreData = new Object();
                    scoreData.type = "score";
                    scoreData.text = scoreMessage;
                    var jsonStringScore = JSON.stringify(scoreData);
                    oPlayerMap.get(item[1][POS_GAME_ID]).forEach(element => element.send(jsonStringScore));

                    item[1][POS_GAME_ROW] = item[1][POS_GAME_ROW] - 1;
                    if (item[1][POS_GAME_ROW] <= 0) {
                        item[1][POS_GAME_ROW] = 3;
                        item[1][POS_INIT_GAME] = true;
                        var messageData = new Object();
                        messageData.type = "end-game";
                        messageData.gameId = item[1][POS_GAME_ID];
                        var jsonString = JSON.stringify(messageData);
                        oPlayerMap.get(item[1][POS_GAME_ID]).forEach(element => element.send(jsonString));
                    }
                }
                else {
                    if (oPlayerMap.get(item[1][POS_GAME_ID]).length > 0) {
                        item[1][POS_INIT_GAME] = false;
                    }
                }

                oPlayerMap.get(item[1][POS_GAME_ID]).forEach(element => element.found = false);
                oPlayerMap.get(item[1][POS_GAME_ID]).forEach(element => element.isDrawer = false);
                item[1][POS_INTERDELAY] = 10;
                if (oPlayerMap.get(item[1][POS_GAME_ID]).length > 0) {
                    item[1][POS_ON_INTER] = false;
                    // we launch a new match
                    // we randomize the turn 
                    // we read the word file and send it
                    item[1][POS_CURRENT_WORD] = words[getRandomInt(words.length)];
                    // for the others
                    // {type: "game", turn: "false"}
                    var messageData = new Object();
                    messageData.type = "game";
                    messageData.turn = "false";
                    var jsonString = JSON.stringify(messageData);
                    oPlayerMap.get(item[1][POS_GAME_ID]).forEach(element => element.send(jsonString));
                    // for the picked player
                    item[1][POS_SELECTED_PLAYER] = oPlayerMap.get(item[1][POS_GAME_ID])[getRandomInt(oPlayerMap.get(item[1][POS_GAME_ID]).length)];
                    item[1][POS_SELECTED_PLAYER].isDrawer = true;
                    // {type: "game", turn: "true" , word: "ananas"}
                    var messageData = new Object();
                    messageData.type = "game";
                    messageData.turn = "true";
                    messageData.word = item[1][POS_CURRENT_WORD];
                    var jsonString = JSON.stringify(messageData);
                    item[1][POS_SELECTED_PLAYER].send(jsonString);
                }
                else {
                    console.log("nobody is on game : " + item[1][POS_GAME_ID]);
                }
            }
        }

    }
}

function makeid(length) {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
    }
    return result;
};


function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

// -------------------------

// this function allow user to join the lobby and check who is on lobby [PART 6 INCLUDED]
app.ws('/ws-lobby', (socket, req) => {
    console.log(" - - - ws lobby request - - -");
    // we store the socket on a array
    if (socket.id === undefined) {
        socket.name = "null";
    }

    socket.on("message", (message) => {
        console.log("socket message received from lobby", message);
        const oData = JSON.parse(message);
        if (oData.type === "client-info") {
            socket.id = oData.id;
            socket.name = oData.name;
            socket.gameId = oData.gameId;
            if (socket.gameId === "") {
                console.log("- - - - - - - -  - -- ");
                let gameId = makeid(5);
                socket.gameId = gameId;
                console.log(gameId);
                // if the player didn't select a game id we create a new one
                
                oPartyMap.set(gameId, [gameId, 90, 10, true, "void", true, undefined, 3])
                oPlayerMap.set(gameId, []);
                oPlayerLobbyMap.set(gameId, []);
                // we join the game
                oPlayerLobbyMap.get(gameId).push(socket);
                // we send the list of players to the front end
                let listOfPlayersMessage = "";
                oPlayerLobbyMap.get(gameId).forEach(element => {
                    listOfPlayersMessage = listOfPlayersMessage + element.name + "\n";
                });

                var messageData = new Object();
                messageData.type = "server-lobby-list";
                messageData.data = listOfPlayersMessage;
                messageData.gameId = gameId;
                var jsonString = JSON.stringify(messageData);
                oPlayerLobbyMap.get(gameId).forEach(element => element.send(jsonString));
                console.log("- - - - - - - -  - -- ");
            }
            else {
                // if the player select a game
                // if the game dont exist we dont do things
                if (oPartyMap.get(socket.gameId) === undefined) {

                }
                // else we join the game
                else {
                    // we join the game
                    oPlayerLobbyMap.get(socket.gameId).push(socket);
                    // we send the list of players to the front end
                    let listOfPlayersMessage = "";
                    oPlayerLobbyMap.get(socket.gameId).forEach(element => {
                        listOfPlayersMessage = listOfPlayersMessage + element.name + "\n";
                    });

                    var messageData = new Object();
                    messageData.type = "server-lobby-list";
                    messageData.data = listOfPlayersMessage;
                    var jsonString = JSON.stringify(messageData);
                    oPlayerLobbyMap.get(socket.gameId).forEach(element => element.send(jsonString));

                }
            }
        }
        else {
            console.log("Party : " + socket.gameId + " lauched!")
            oPlayerLobbyMap.get(socket.gameId).forEach(element => element.send(message));
        }
    });

    socket.on("close", (code) => {
        console.log("socket closed", code);
        console.log(socket.gameId);
        let playersArray = oPlayerLobbyMap.get(socket.gameId);
        cachePlayerMap.set(socket.id, socket.gameId);
        playersArray = playersArray.filter(function (obj) {
            return obj.id !== socket.id;
        });
        oPlayerLobbyMap.set(socket.gameId, playersArray);
        // we send the list of players to the front end

        let listOfPlayersMessage = "";
        oPlayerLobbyMap.get(socket.gameId).forEach(element => {
            listOfPlayersMessage = listOfPlayersMessage + element.name + "\n";
        });

        var messageData = new Object();
        messageData.type = "server-lobby-list";
        messageData.data = listOfPlayersMessage;
        var jsonString = JSON.stringify(messageData);
        oPlayerLobbyMap.get(socket.gameId).forEach(element => element.send(jsonString));
    });

    socket.on("error", (error) => console.log("socket error", error));
});

// -------------------------

// this function allow user to find word and chat and joi the party [PART 6 INCLUDED]
app.ws('/socket', (socket, req) => {
    console.log("new socket connection /socket");
    // we store the socket on a array

    if (socket.id === undefined) {
        socket.id = v4();
        socket.name = "null";
        socket.gameId = "null";
        socket.score = 0;
    }

    socket.on("message", (message) => {
        console.log("socket message received", message);
        const oData = JSON.parse(message);
        let response = false;
        if (oData.type === "client-info") {
            console.log("identity gived");
            socket.id = oData.id;
            socket.name = oData.name;
            socket.gameId = oData.gameId;
            if (socket.gameId === "") {
                socket.gameId = cachePlayerMap.get(socket.id);
            }
            console.log(socket.gameId);
            console.log(oPlayerMap.get(socket.gameId));
            // we add the player to the party
            oPlayerMap.get(socket.gameId).push(socket);
            console.log(oPlayerMap.get(socket.gameId));
        }
        if (oData.type === "chat") {
            // we save the current time
            const localTime = oPartyMap.get(socket.gameId)[POS_TIME];
            // we check if we are not on inter game
            // if the message == selected word
            if (oPartyMap.get(socket.gameId)[POS_ON_INTER] === false && oData.text === oPartyMap.get(socket.gameId)[POS_CURRENT_WORD]) {
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
                    oPlayerMap.get(socket.gameId).forEach(element => element.send(jsonString));
                    // score calc
                    socket.score = socket.score + localTime;
                    // we send the score update
                }
                // we check if everyone found the word
                let founder = 0;
                oPlayerMap.get(socket.gameId).forEach(element => {
                    if (element.found === false) {
                        founder = founder + 1;
                    }
                });
                // if true, we go on intergame
                if (founder <= 1) {
                    // we go on intergame
                    console.log("everybody found the word");
                    // we reset at 90
                    oPartyMap.get(socket.gameId)[POS_TIME] = 90;
                    // we start the inter-game delay
                    oPartyMap.get(socket.gameId)[POS_ON_INTER] = true;
                }
            }
        }
        if (response === false) {
            oPlayerMap.get(socket.gameId).forEach(element => element.send(message));
        }
    });

    socket.on("close", (code) => {
        console.log("socket closed", code)

        let playersArray = oPlayerMap.get(socket.gameId);
        cachePlayerMap.set(socket.id, socket.gameId);
        playersArray = playersArray.filter(function (obj) {
            return obj.id !== socket.id;
        });
        oPlayerMap.set(socket.gameId, playersArray);

        console.log(oPlayerMap.get(socket.gameId).length);
    });

    socket.on("error", (error) => console.log("socket error", error));
});

// -------------------------

// this function return the start page to the user when he want to start the game [ PART 6 COMPLIANT]
app.get("/", (req, res) => {
    console.log("got request");

    const filePath = path.resolve("client/start.html");
    res.sendFile(filePath);
});

app.get("/result", (req, res) => {
    const scores = [];

    const iteratorPlayers = oPlayerMap[Symbol.iterator]();
    // iterator on each games on the game map
    for (const item of iteratorPlayers) {
        scores.push({ name: "GAME ID: ", points: item[0] })
        item[1].forEach(element => {
            scores.push({ name: element.name, points: element.score })
        });
    }
    res.render("result.html", { scores });
});

// This function allow the user to ask to join the lobby and get personal informations on cookies [PART 6 INCLUDED]
app.post("/join", (req, res) => {
    console.log(" - - - join request - - -");
    res.cookie("id", v4());
    res.cookie("gameId", req.body.gameId)
    res.cookie("name", req.body.userName);
    res.redirect("lobby.html");
})

app.use(express.static("client"));

// start function for the back end
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


