// dev-server.ts
import { TestClass, CustomCanvas } from '../components/canvas';

customElements.define('custom-canvas', CustomCanvas, {extends: "canvas"});

let element = document.querySelector("#test-element") as CustomCanvas;

element.testMethod();