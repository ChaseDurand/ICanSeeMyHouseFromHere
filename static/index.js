$(document).ready(function () {
    // Connect to the Socket.IO server.
    // The connection URL has the following format, relative to the current page:
    //     http[s]://<domain>:<port>[/<namespace>]
    var socket = io();

    // Event handler for new connections.
    // The callback function is invoked when a connection with the
    // server is established.
    socket.on('connect', function () {
        socket.emit('my_event', { data: 'I\'m connected!' });
    });

    // Event handler for server sent data.
    // The callback function is invoked whenever the server emits data
    // to the client. The data is then displayed in the 'Received'
    // section of the page.
    socket.on('my_response', function (msg, cb) {
        $('#log').append('<br>' + $('<div/>').text('Received #' + msg.count + ': ' + msg.data).html());
        if (cb)
            cb();
    });

    // Handler for submit button
    // Send inputs to backend
    $('.submit').click(function () {
       console.log("Submit!");
       house = document.getElementById('house').value;
       here = document.getElementById('here').value;
       console.log(house);
       console.log(here);
       socket.emit('submit_event', { 'house': house, 'here': here});
    });

    // Handler for results from backend
    socket.on('submit_response', function (msg) {
        result = msg["height"];
        if(result == "ERROR") {
            document.getElementById('result').innerHTML = msg["height"];
        }
        else {
            document.getElementById('result').innerHTML = msg["height"] + "m";
        }
        console.log(msg["height"]);
    });
});