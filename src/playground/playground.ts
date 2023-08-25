// dev-server.ts
import { CustomCanvas, TypeWriterComponent} from '../components';
import { VisualPolygon } from '../components/canvas/VisualRigidBody';

customElements.define('custom-canvas', CustomCanvas, {extends: "canvas"});
customElements.define('type-writer', TypeWriterComponent);

let element = document.querySelector("#test-element") as CustomCanvas;
let button = document.querySelector("button");
let testPolygon = new VisualPolygon({x: 0, y: 0}, [{x: 10, y: 10}, {x: 10, y: -10}, {x: -10, y: -10}, {x: -10, y: 10}], 0, 50, false, true);
let testStaticPolygon = new VisualPolygon({x: 50, y: 0}, [{x: 5, y: 5}, {x: 5, y: -5}, {x: -5, y: -5}, {x: -5, y: 5}], 0, 50, false, true);
element.addRigidBody(testPolygon);
element.addRigidBody(testStaticPolygon);
element.addRigidBody(new VisualPolygon({x: 650, y: 0}, [{x: 10, y: 10}, {x: 10, y: -10}, {x: -10, y: -10}, {x: -10, y: 10}], Math.PI / 4, 50, false, true))
element.addRigidBody(new VisualPolygon({x: -1250, y: 0}, [{x: 10, y: 10}, {x: 10, y: -10}, {x: -10, y: -10}, {x: -10, y: 10}], -Math.PI / 4, 50, false, true))
element.addRigidBody(new VisualPolygon({x: 0, y: 780}, [{x: 10, y: 10}, {x: 10, y: -10}, {x: -10, y: -10}, {x: -10, y: 10}], 0, 50, false, true))
element.addRigidBody(new VisualPolygon({x: 0, y: -180}, [{x: 10, y: 10}, {x: 10, y: -10}, {x: -10, y: -10}, {x: -10, y: 10}], 0, 50, false, true))
if (button) {
    button.onclick = () => element.resetCamera();
}
