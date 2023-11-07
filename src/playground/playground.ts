// dev-server.ts
import { CustomCanvas, NonInteractiveUIComponent} from '../components';
import { VisualPolygon } from '../components';
import { Dial, CustomCanvasWebkit } from '../components';
import { point } from 'point2point';
import { Track } from '../track';


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
customElements.define('canvas-webkit', CustomCanvasWebkit)
let element = document.getElementById("test-graph") as CustomCanvasWebkit;

let testTrack = new Track({x: 0, y: 0}, {x: 100, y: 200}, {x: 300, y: 400}, {x: 500, y: 600});

let testPolygon = new VisualPolygon({x: 300, y: 300}, [{x: 10, y: 10}, {x: 10, y: -10}, {x: -10, y: -10}, {x: -10, y: 10}], 0, 50, false, true);
let testStaticPolygon = new VisualPolygon({x: 50, y: 0}, [{x: 5, y: 5}, {x: 5, y: -5}, {x: -5, y: -5}, {x: -5, y: 5}], 115 *  Math.PI / 180, 50, false, true);

element.addRigidBody(testPolygon);
element.addRigidBody(testStaticPolygon);
element.addRigidBody(new VisualPolygon({x: 80, y: 0}, [{x: 10, y: 10}, {x: 10, y: -10}, {x: -10, y: -10}, {x: -10, y: 10}], -85 * Math.PI/180, 50, false, true))

element.insertNIUIComponent(testTrack);

let button = document.querySelector("button");
if (button) {
    button.onclick = (e) => element.resetCamera();
}
const boundaries = element.getBoundaries();
for(let index = 0; index < 3000; index++){
    let xCoord = getRandomInt(boundaries.minX, boundaries.maxX);
    let yCoord = getRandomInt(boundaries.minY, boundaries.maxY);
    let rotation = getRandomInt(-180, 180);
    rotation = rotation * Math.PI / 180
    element.addRigidBody(new VisualPolygon({x: xCoord, y: yCoord}, [{x: 10, y: 10}, {x: 10, y: -10}, {x: -10, y: -10}, {x: -10, y: 10}], rotation, 50, false, true))
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
