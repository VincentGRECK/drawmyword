// create canvas element and append it to document body
var canvas = document.createElement('canvas');
document.getElementById("canvas-area").appendChild(canvas);

// canvas.style.position = 'fixed';

// get canvas 2D context and set him correct size
var ctx = canvas.getContext('2d');
resize();

// last known position
var pos = { x: 0, y: 0 };

let yourTurn = false;

window.addEventListener('resize', resize);
document.addEventListener('mousemove', draw);
document.addEventListener('mousedown', setPosition);
document.addEventListener('mouseenter', setPosition);

// new position from mouse event
function setPosition(e) {
  let boundingRectLocal = canvas.getBoundingClientRect() 
  pos.x = e.clientX - boundingRectLocal.x;
  pos.y = e.clientY - boundingRectLocal.y;
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// we connect the button for eraser

var btn = document.getElementById('eraserButton');

btn.addEventListener('click', updateBtn);

function updateBtn() {
    if(yourTurn === true)
    {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var messageData = new Object();
        messageData.type = "clear";
        var jsonString= JSON.stringify(messageData);
        socket.send(jsonString);
    }
}

function updatePos(x,y)
{
    let boundingRectLocal = canvas.getBoundingClientRect() 
    pos.x = x;
    pos.y = y;
}

// resize canvas
function resize() {
  ctx.canvas.width = window.innerWidth/2;
  ctx.canvas.height = window.innerHeight/2;
}

function draw(e) {
  // mouse left button must be pressed
  if (e.buttons !== 1 || yourTurn === false) return;

  ctx.beginPath(); // begin

  ctx.lineWidth = parseInt(document.getElementById('sizecursor').value);
  console.log(document.getElementById('sizecursor').value);
  ctx.lineCap = 'round';
  ctx.strokeStyle = document.getElementById('colorpicker').value;

  ctx.moveTo(pos.x, pos.y); // from
  setPosition(e);
  ctx.lineTo(pos.x, pos.y); // to

  ctx.stroke(); // draw it!
  // we send the position to the server
  var coords = new Object();
  coords.type = "draw";
  coords.x  = pos.x;
  coords.y = pos.y;
  coords.size = parseInt(document.getElementById('sizecursor').value);
  coords.color = document.getElementById('colorpicker').value;
  var jsonString= JSON.stringify(coords);
  socket.send(jsonString);

}


function connectWebSocket() {
    console.log("connection on progress . . . ");
    const url = `ws://${window.location.host}/socket`;
    const socket = new WebSocket(url);

    socket.onopen = () => {
        console.log("socket connected!");
        if(getCookie('name') !== undefined)
        {
            console.log("cookies are good");
            var messageData = new Object();
            messageData.type = "client-info";
            messageData.id = getCookie('id');
            messageData.name = getCookie('name');
            messageData.gameId = getCookie('gameId');
            var jsonString = JSON.stringify(messageData);
            socket.send(jsonString);
        }
    };

    socket.onmessage = (message) => {
        console.log("got message from socket", message);
        const oData = JSON.parse(message.data);
        console.log(oData.type);
        // if it's a chat message we display it
        if(oData.type === "chat")
        {
            document.getElementById('messageReceivedArea').value = document.getElementById('messageReceivedArea').value + "\n" + oData.text;
        }
        else if(oData.type === "score")
        {
            document.getElementById('scoreArea').value =  oData.text;
        }
        else if(oData.type === "draw")
        {
            console.log(oData); 
            ctx.beginPath(); // begin

            ctx.lineWidth = oData.size;
            ctx.lineCap = 'round';
            ctx.strokeStyle = oData.color;
            let oldX = pos.x;
            let oldY = pos.y;
            ctx.moveTo(pos.x, pos.y); // from
            updatePos(oData.x,oData.y);
            // -- patch
            // if the difference between the old and the new is bigger than 25
            if(Math.abs(oldX - pos.x) > 25 || Math.abs(oldY - pos.y) > 25 )
            {
                // we update the start point
                ctx.moveTo(pos.x, pos.y); // from
            }
            ctx.lineTo(pos.x, pos.y); // to
          
            ctx.stroke(); // draw it!
        }
        else if(oData.type === "clear")
        {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        else if(oData.type === "game")
        {
            if(oData.turn === "true")
            {
                yourTurn = true;
                document.getElementById('word-area').innerHTML = 'Word: ' + oData.word;
            }
            else
            {
                yourTurn = false;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                document.getElementById('word-area').innerHTML = 'Word: ???';
            }
        }
        else if(oData.type === "time")
        {
            console.log(oData.value);
            document.getElementById('time-zone').innerHTML = oData.value;
        }
        else if(oData.type === "end-game")
        {
            console.log("redirection to the score page");
            location.assign("/result");
        }
    };

    socket.onerror = (error) => console.error("socket error", error);

    return socket;
}

function onKeyDown(event) {
    // we catch the enter key
    if (event.code === 'Enter') {
        console.log("We send the message");
        var messageData = new Object();
        messageData.type = "chat";
        messageData.text  = document.getElementById('messageInput').value;
        var jsonString= JSON.stringify(messageData);
        socket.send(jsonString);
    }
    // we send the message thanks to the socket

}

function start() {
    const input = document.getElementsByTagName("input")[2];
    input.addEventListener("keydown", onKeyDown);
}

start();



const socket = connectWebSocket();

