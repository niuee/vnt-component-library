// dev-server.ts
import { CustomCanvas, NonInteractiveUIComponent} from '../components';
import { VisualPolygon } from '../components/canvas/VisualRigidBody';
import { getLineIntersection } from "../algos";
import { point } from 'point2point';


class NICircle implements NonInteractiveUIComponent {
    private center: point;

    constructor(center: point){
        this.center = center;
    }

    draw(context: CanvasRenderingContext2D): void {
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

    draw(ctx: CanvasRenderingContext2D) {
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

const testLine = new NILine({x: 0, y: 100}, {x: 100, y: 200});
const testLine2 = new NILine({x: 0, y: 200}, {x: 100, y: 100});
const intersectRes = getLineIntersection(testLine.getStartPoint(), testLine.getEndPoint(), testLine2.getStartPoint(), testLine2.getEndPoint());
let element = document.querySelector("#test-element") as CustomCanvas;
if (intersectRes.intersects){
    const intersectionPoint = new NICircle(intersectRes.intersection);
    element.insertNIUIComponent(intersectionPoint);
}
let button = document.querySelector("button");
let testPolygon = new VisualPolygon({x: 300, y: 300}, [{x: 10, y: 10}, {x: 10, y: -10}, {x: -10, y: -10}, {x: -10, y: 10}], 0, 50, false, true);
let testStaticPolygon = new VisualPolygon({x: 50, y: 0}, [{x: 5, y: 5}, {x: 5, y: -5}, {x: -5, y: -5}, {x: -5, y: 5}], 0, 50, false, true);
element.addRigidBody(testPolygon);
element.addRigidBody(testStaticPolygon);
element.insertNIUIComponent(testLine);
element.insertNIUIComponent(testLine2);


if (button) {
    button.onclick = () => element.resetCamera();
}

