var btn = document.getElementById('play-button');
btn.addEventListener('click', updateBtn);

function updateBtn() {
    console.log("- - - button event");
    window.location = "/start.html";
    //location.assign("/lobby");
    console.log("- - - button event end");
}