// dev-server.ts
import { TestClass, CustomCanvas, TypeWriterComponent } from '../components';

customElements.define('custom-canvas', CustomCanvas, {extends: "canvas"});
customElements.define('type-writer', TypeWriterComponent);

// let element = document.querySelector("#test-element") as CustomCanvas;

// element.testMethod();