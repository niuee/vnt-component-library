// dev-server.ts
import { CustomCanvas, NonInteractiveUIComponent} from '../components';
import { Dial, CustomCanvasWebkit } from '../components';
import { point } from 'point2point';
import { Track } from '../railsystem';

class NICircle implements NonInteractiveUIComponent {
    private center: point;

    constructor(center: point){
        this.center = center;
    }

    getCenter(): point{
        return this.center;
    }

    draw(context: CanvasRenderingContext2D, cameraZoom: number): void {
        context.beginPath();
        context.arc(this.center.x, -this.center.y, 3, 0, Math.PI * 2);
        context.stroke();
    }
}

class NILine implements NonInteractiveUIComponent {

    private startPoint: point;
    private endPoint: point;

    constructor(startPoint: point, endPoint: point){
        this.startPoint = startPoint;
        this.endPoint = endPoint;
    }

    getStartPoint(): point{
        return this.startPoint;
    }

    getEndPoint(): point{
        return this.endPoint;
    }

    draw(ctx: CanvasRenderingContext2D, cameraZoom: number) {
        ctx.beginPath();
        ctx.moveTo(this.startPoint.x, -this.startPoint.y);
        ctx.lineTo(this.endPoint.x, -this.endPoint.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(this.startPoint.x, -this.startPoint.y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(this.endPoint.x, -this.endPoint.y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("S", this.startPoint.x, -this.startPoint.y);
        ctx.fillText("E", this.endPoint.x, -this.endPoint.y);
    }
}

customElements.define('custom-canvas', CustomCanvas, {extends: "canvas"});
customElements.define('wheel-dial', Dial);
customElements.define('canvas-webkit', CustomCanvasWebkit);

let element = document.getElementById("test-graph") as CustomCanvasWebkit;
let button = document.querySelector("button");
if (button) {
    button.onclick = (e) => element.resetCamera();
}

const testWorker = new Worker("./playgroundWorker.js");

// let testTrack = new Track({x: 100, y: 25}, {x: 10, y: 90}, {x: 110, y: 100}, {x: 132, y: 192});
// console.time();
// for (let index = 0; index < 5000; index++){
//     testTrack.advanceTrack(0, 0, 16.4);
// }
// console.timeEnd();

// function getRandomInt(min, max) {
//     min = Math.ceil(min);
//     max = Math.floor(max);
//     return Math.floor(Math.random() * (max - min + 1)) + min;
// }

// function getRandom(min, max){
//     return Math.random() * (max - min) + min;
// }