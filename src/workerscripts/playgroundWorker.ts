import { Track } from "../railsystem";

let testTrack = new Track({x: 100, y: 25}, {x: 10, y: 90}, {x: 110, y: 100}, {x: 132, y: 192});
console.time();
for (let index = 0; index < 5000; index++){
    testTrack.advanceTrack(0, 0, 16.4);
}
console.timeEnd();

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandom(min, max){
    return Math.random() * (max - min) + min;
}
const timerInterval = setInterval(() => {
    // console.time();
    for (let index = 0; index < 5000; index++){
        testTrack.advanceTrack(0, 0, 16.4);
    }
    // console.timeEnd();
    
    // postMessage({deltaTime: deltaTime});
}, 33);