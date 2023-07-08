import {Test} from "./canvas.specs";
import { PointCal, point } from "point2point";

export class TestClass {
    private testField: Test;

    constructor(){
        this.testField = {numberField: 10, stringField: "test"}
    }

    testMethod(){
        console.log("test method: ", this.testField.numberField);
    }
}

export interface CanvasUIComponent {
    draw(context: CanvasRenderingContext2D): void
}

export class CustomCanvas extends HTMLCanvasElement {

    private context: CanvasRenderingContext2D;
    private requestRef: number;
    // private cameraOffset: {x: number, y: number} = {x: -window.innerWidth / 2, y: -window.innerHeight / 2};
    private cameraOffset: {x: number, y: number} = {x: 0, y: 0};
    private cameraZoom: number = 1;
    private MAX_ZOOM: number = 5;
    private MIN_ZOOM: number = 0.1;
    private SCROLL_SENSITIVITY: number = 0.0005;
    private isDragging: boolean = false;
    private dragStart: {x: number, y: number} = {x: 0, y: 0};
    private lastZoom = this.cameraZoom;
    private maxTransWidth: number;
    private maxTransHeight: number;
    private uiList: Map<string, CanvasUIComponent>;


    constructor(){
        super();
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.context = this.getContext("2d");
        this.context.save();
        this.addEventListener('mousedown', this.onPointerDown);
        this.addEventListener('mouseup', this.onPointerUp);
        this.addEventListener('mousemove', this.onPointerMove);
        this.addEventListener( 'wheel', (e) => this.scrollHandler(e, e.deltaY*this.SCROLL_SENSITIVITY, 0.1))
        this.maxTransHeight = window.innerHeight / 2;
        this.maxTransWidth = window.innerWidth / 2;
        this.uiList = new Map<string, CanvasUIComponent>();
        this.step = this.step.bind(this);
    }

    connectedCallback(){
        this.requestRef = requestAnimationFrame(this.step);
    }

    disconnectedCallback(){
        cancelAnimationFrame(this.requestRef);
    }

    insertUIComponent(uiComponent: CanvasUIComponent) {
        this.uiList.set(crypto.randomUUID(), uiComponent);
    }

    removeUIComponent(uiComponentIdent: string) {
        if (this.uiList.has(uiComponentIdent)) {
            this.uiList.delete(uiComponentIdent);
        }
    }

    resetCameraOffset(){
        this.cameraOffset = {x: 0, y: 0};
    }

    testMethod() {
        console.log("test method");
    }

    step(timestamp) {
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.context.restore();
        this.context.translate( window.innerWidth / 2, window.innerHeight / 2 );
        this.context.scale(this.cameraZoom, this.cameraZoom);
        this.context.translate(this.cameraOffset.x,  this.cameraOffset.y);

        this.uiList.forEach((uiComponent, ident)=>{
            uiComponent.draw(this.context);
        })
        this.requestRef = requestAnimationFrame(this.step);
    }

    drawCircles(context: CanvasRenderingContext2D, centerx: number, centery: number, size: number):void {
        context.strokeStyle = "rgb(0, 0, 0)";
        context.moveTo(centerx, centery);
        context.beginPath();
        context.arc(centerx, centery, size, 0, Math.PI * 2, true); // Outer circle
        context.stroke();
    }

    getEventLocation(e: UIEvent):point {
        // if (e instanceof TouchEvent && e.touches.length == 1) {
        //     return { x:e.touches[0].clientX, y: e.touches[0].clientY };
        // }
        if (e instanceof MouseEvent){
            return { x: e.clientX, y: e.clientY };
        }
    }

    getDragOriginPos(e: MouseEvent): point {
        let onScreenPos = this.getEventLocation(e);
        return {x: onScreenPos.x / this.cameraZoom - this.cameraOffset.x, y: onScreenPos.y / this.cameraZoom - this.cameraOffset.y};
    }

    getAbsPos(point: point): point {
        return {x: point.x/this.cameraZoom - this.cameraOffset.x - (window.innerWidth / 2 / this.cameraZoom), y: point.y/this.cameraZoom - this.cameraOffset.y - (window.innerHeight / 2 / this.cameraZoom)};
    }

    onPointerUp(e: MouseEvent) {
        if (e.button == 0) {
            this.isDragging = false;
            this.lastZoom = this.cameraZoom;
            let convertCoord = this.getEventLocation(e);
        }
    }

    onPointerDown(e: MouseEvent) {
        if (e.button == 0 && e.metaKey) {
            this.isDragging = true;
            this.dragStart = this.getDragOriginPos(e)
            this.dragStart.x = this.getEventLocation(e).x/this.cameraZoom - this.cameraOffset.x;
            this.dragStart.y = this.getEventLocation(e).y/this.cameraZoom - this.cameraOffset.y;
        } else if (e.button == 0) {
            let leftClickX = this.getEventLocation(e).x/this.cameraZoom - this.cameraOffset.x - (window.innerWidth / 2 / this.cameraZoom);
            let leftClickY = this.getEventLocation(e).y/this.cameraZoom - this.cameraOffset.y - (window.innerHeight / 2 / this.cameraZoom);
        }
    }


    onPointerMove(e:MouseEvent) {
        let convertCoord = this.getEventLocation(e);
        if (convertCoord == null){
            return;
        }
        if (this.isDragging) {
            // console.log("Dragging camera");
            // dragging cmaera
            this.cameraOffset.x = this.getEventLocation(e).x/this.cameraZoom - this.dragStart.x
            this.cameraOffset.y = this.getEventLocation(e).y/this.cameraZoom - this.dragStart.y
        }
    }

    scrollHandler(e: WheelEvent, zoomAmount: number, zoomFactor: number) {
        if (e.ctrlKey || (Math.abs(e.deltaY) % 40 == 0 && Math.abs(e.deltaY) !== 0)){
            // console.log("Wheel with control key");
            // this is pinch zoom event
            
            let originalWorldPos = this.getAbsPos(this.getEventLocation(e));
            e.preventDefault();
            if (!this.isDragging) {
                if (zoomAmount) {
                    this.cameraZoom -= zoomAmount* 5;
                } else if (zoomFactor) {
                    // console.log(zoomFactor)
                    this.cameraZoom = zoomFactor * this.lastZoom
                }
                
                this.cameraZoom = Math.min( this.cameraZoom, this.MAX_ZOOM )
                this.cameraZoom = Math.max( this.cameraZoom, this.MIN_ZOOM )
                // console.log("Diff in World Coordinate after zooming: ", PointCal.subVector(originalWorldPos, this.getAbsPos(this.getEventLocation(e))));
                let posDiff = PointCal.subVector(originalWorldPos, this.getAbsPos(this.getEventLocation(e)));
                if (originalWorldPos.x >= 0 && originalWorldPos.x <= this.maxTransWidth || originalWorldPos.x < 0 && originalWorldPos.x >= -this.maxTransWidth) {
                    this.cameraOffset.x -= posDiff.x;
                }
                if (originalWorldPos.y >= 0 && originalWorldPos.y <= this.maxTransHeight || originalWorldPos.y < 0 && originalWorldPos.y >= -this.maxTransHeight) {
                    this.cameraOffset.y -= posDiff.y;
                }
                // console.log(this.getEventLocation(e));
            }
            return;
        } 
        // console.log("wheelDeltaY:", e.wheelDeltaY, "deltaY:", e.deltaY); 
        // var isTouchPad = e.wheelDeltaY ? e.wheelDeltaY === -3 * e.deltaY : e.deltaMode === 0
        // your code
        // console.log("From" + isTouchPad? "touchpad" : "mouse");
        // console.log("absolute: ", Math.abs(e.deltaY));
        else { //(Math.abs(e.deltaY) % 40 !== 0 || Math.abs(e.deltaY) == 0) {
            // when the scroll is actually a pan movement
            e.preventDefault();
            // console.log("This is the world coordinate when panning:", this.getAbsPos(this.getEventLocation(e)));
            this.cameraOffset.x -= e.deltaX / this.cameraZoom;
            this.cameraOffset.y -= e.deltaY / this.cameraZoom;

            // clipping camera panning
            if (this.cameraOffset.x < 0){
                this.cameraOffset.x = this.maxTransWidth <= -this.cameraOffset.x ? -this.maxTransWidth : this.cameraOffset.x;
            } else {
                this.cameraOffset.x = Math.min(this.maxTransWidth, this.cameraOffset.x);
            }
            if (this.cameraOffset.y < 0){
                this.cameraOffset.y = this.maxTransHeight <= -this.cameraOffset.y ? -this.maxTransHeight : this.cameraOffset.y;
            } else {
                this.cameraOffset.y = Math.min(this.maxTransHeight, this.cameraOffset.y);
            }
        } 
    }


}