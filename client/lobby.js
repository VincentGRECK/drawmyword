var btn = document.getElementById('play-button');
btn.addEventListener('click', updateBtn);

function updateBtn() {
    console.log("- - - button event");
    var messageData = new Object();
    messageData.type = "party-launch";
    messageData.url =   "/client.html";
    var jsonString= JSON.stringify(messageData);
    socket.send(jsonString);
    console.log("- - - button event end");
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function connectWebSocket() {
    console.log("connection on progress . . . ");
    const url = `ws://${window.location.host}/ws-lobby`;
    const socket = new WebSocket(url);

    socket.onopen = () => {
        console.log("socket connected!");
        // we check if we received cookies
        if(getCookie('name') !== undefined)
        {
            var messageData = new Object();
            messageData.type = "client-info";
            messageData.id = getCookie('id');
            messageData.name = getCookie('name');
            var jsonString = JSON.stringify(messageData);
            socket.send(jsonString);
        }

    };

    socket.onmessage = (message) => {
        console.log("got message from socket", message);
        console.log(message.data);
        const oData = JSON.parse(message.data);
        console.log(oData.type);
        if(oData.type === "server-lobby-list")
        {
            document.getElementById('text-area').innerHTML = oData.data;
        }
        if(oData.type === "party-launch")
        {
            console.log("page changer");
            location.assign(oData.url);

        }

        console.log("end of on Message");
    };

    socket.onerror = (error) => console.error("socket error", error);

    return socket;
}
console.log("script");
const socket = connectWebSocket();