addEventListener('message', event => {
    console.log("test worker recieved message with data", event.data);
});