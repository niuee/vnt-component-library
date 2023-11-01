import { World } from "../../2dphysics";
import { PointCal, point } from "point2point";
import { VisualRigidBody } from "./VisualRigidBody";
import { workerScript } from "../../workerscripts/phyworker";

export interface NonInteractiveUIComponent {
    draw(context: CanvasRenderingContext2D): void;
}

export interface UIComponent {
    draw(context: CanvasRenderingContext2D, cameraZoom: number): void;
}

export class CustomCanvas extends HTMLCanvasElement {

    private context: CanvasRenderingContext2D;
    private requestRef: number;

    private cameraOffset: {x: number, y: number} = {x: 0, y: 300};
    private cameraZoom: number = 1;
    private cameraAngle: number = 45 * Math.PI / 180;
    private targetCameraAngle: number;
    private targetCameraOffset: point;
    private cameraRotationSpeed: number = 600 * Math.PI / 180; // radians per second
    private MAX_ZOOM: number = 5;
    private MIN_ZOOM: number = 0.01;
    private SCROLL_SENSITIVITY: number = 0.001;
    private isDragging: boolean = false;
    private dragStart: {x: number, y: number} = {x: 0, y: 0};
    private dragOffset: {x: number, y: number} = {x: 0, y: 0};
    private lastZoom = this.cameraZoom;
    private maxTransWidth: number;
    private maxTransHeight: number;

    private uiList: Map<string, UIComponent>;
    private nonInteractiveUILists: NonInteractiveUIComponent[];
    private prevTime: number;
    private simWorld: World;
    private lastTimeUpdate: number;
    private keyController: Map<string, boolean>;
    private tempForce: number = 300;

    private worker: Worker;

    constructor(){
        super();
        this.tabSwitchingHandler = this.tabSwitchingHandler.bind(this);
        this.step = this.step.bind(this);

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.context = this.getContext("2d");
        this.style.overflowY = "hidden";
        this.style.background = "white";
        

        this.context.save();

        this.addEventListener('mousedown', this.onPointerDown);
        this.addEventListener('mouseup', this.onPointerUp);
        this.addEventListener('mousemove', this.onPointerMove);
        this.addEventListener( 'wheel', (e) => this.scrollHandler(e, e.deltaY*this.SCROLL_SENSITIVITY, 0.1));

        this.worker = new Worker(workerScript);
        this.lastTimeUpdate = Date.now();
        this.worker.onmessage = (data)=>{
            let nowTime = Date.now();
            let deltaTime = nowTime - this.lastTimeUpdate;
            this.lastTimeUpdate = nowTime; 
            this.simWorld.step(deltaTime / 1000);
            console.log("received message from web worker");
        }

        document.addEventListener("visibilitychange", this.tabSwitchingHandler);

        window.addEventListener('keypress', (e) => {
            if (this.keyController.has(e.code)){
                this.keyController.set(e.code, true);
            }
        });

        window.addEventListener('keyup', (e)=>{
            if (this.keyController.has(e.code)){
                this.keyController.set(e.code, false);
            }
        });

        this.maxTransHeight = 25000;
        this.maxTransWidth = 25000;
        this.uiList = new Map<string, UIComponent>();
        this.nonInteractiveUILists = [];
        this.prevTime = 0;
        this.simWorld = new World();
        this.keyController = new Map<string, boolean>();

        this.keyController.set("KeyA", false);
        this.keyController.set("KeyW", false);
        this.keyController.set("KeyS", false);
        this.keyController.set("KeyD", false);
        this.keyController.set("KeyQ", false);
        this.keyController.set("KeyE", false);

    }

    connectedCallback(){
        console.log(this.targetCameraAngle !== undefined);
        this.requestRef = requestAnimationFrame(this.step);
    }

    disconnectedCallback(){
        cancelAnimationFrame(this.requestRef);
    }

    insertNIUIComponent(niUIComp: NonInteractiveUIComponent){
        this.nonInteractiveUILists.push(niUIComp);
    }

    insertUIComponent(uiComponent: UIComponent) {
        this.uiList.set(crypto.randomUUID(), uiComponent);
    }

    removeUIComponent(uiComponentIdent: string) {
        if (this.uiList.has(uiComponentIdent)) {
            this.uiList.delete(uiComponentIdent);
        }
    }

    testMethod() {
        console.log("test method");
    }

    step(timestamp: number) {
        // console.log("Stepping in step tab step function");
        let deltaTime = timestamp - this.prevTime;
        deltaTime = Math.min(Date.now() - this.lastTimeUpdate, deltaTime);
        deltaTime /= 1000;
        this.prevTime = timestamp;


        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.context.restore();
        this.context.translate( window.innerWidth / 2, window.innerHeight / 2 );
        this.context.scale(this.cameraZoom, this.cameraZoom);
        this.context.rotate(this.cameraAngle);
        this.context.translate(this.cameraOffset.x,  this.cameraOffset.y);

        // draw the x and y axis
        this.drawAxis(this.context);

        // draw outer perimeter of the map
        this.context.beginPath();
        this.context.strokeStyle = "blue";
        this.context.lineWidth = 300;
        this.context.roundRect(-this.maxTransWidth, -this.maxTransHeight, this.maxTransWidth * 2, this.maxTransHeight * 2, 5);
        this.context.stroke();
        this.context.lineWidth = 3;

        if (this.keyController.get("KeyD")) {
            this.moveRightward();
        }

        if (this.keyController.get("KeyW")) {
            this.moveForward();
        }

        if (this.keyController.get("KeyS")) {
            this.moveBackward();
        }

        if (this.keyController.get("KeyA")) {
            this.moveLeftward();
        }

        if (this.keyController.get("KeyQ")){
            this.rotateCCW();
        }
        
        if (this.keyController.get("KeyE")){
            this.rotateCW();
        }

        this.uiList.forEach((uiComponent, ident)=>{
            uiComponent.draw(this.context, this.cameraZoom);
        });

        this.nonInteractiveUILists.forEach((nuiComp)=>{
            nuiComp.draw(this.context);
        });

        // step and draw elements
        this.simWorld.step(deltaTime);
        this.simWorld.getRigidBodyList().forEach((body, index)=> {
            let vBody = body as VisualRigidBody;
            vBody.draw(this.context, this.cameraZoom);
        });

        // camera transition
        if (this.targetCameraAngle !== null && this.targetCameraAngle !== undefined) {
            // console.log("transitioning");
            let diff = Math.abs(this.targetCameraAngle - this.cameraAngle) > Math.PI ? this.cameraAngle - this.targetCameraAngle : this.targetCameraAngle - this.cameraAngle;
            if (Math.abs(diff) <= this.cameraRotationSpeed * deltaTime){
                this.cameraAngle = this.targetCameraAngle;
                this.targetCameraAngle = null;
            } else {
                const rotationDelta = this.cameraRotationSpeed * deltaTime * (diff >= 0 ? 1 : -1);
                console.log(rotationDelta);
                this.cameraAngle += rotationDelta;
            }
        }

        this.requestRef = requestAnimationFrame(this.step);
    }

    drawAxis(context: CanvasRenderingContext2D): void{
        // y axis
        context.beginPath();
        context.strokeStyle = `rgba(87, 173, 72, 0.8)`;
        context.moveTo(0, 0);
        context.lineTo(0, -this.maxTransHeight);
        context.stroke();
        
        // x axis
        context.beginPath();
        context.strokeStyle = `rgba(220, 59, 59, 0.8)`;
        context.moveTo(0, 0);
        context.lineTo(this.maxTransWidth, 0);
        context.stroke();
    }

    drawCircles(context: CanvasRenderingContext2D, centerx: number, centery: number, size: number): void {
        context.strokeStyle = "rgb(0, 0, 0)";
        context.moveTo(centerx, centery);
        context.beginPath();
        context.arc(centerx, centery, size, 0, Math.PI * 2, true); // Outer circle
        context.stroke();
    }

    getEventLocation(e: UIEvent): point {
        // if (e instanceof TouchEvent && e.touches.length == 1) {
        //     return { x:e.touches[0].clientX, y: e.touches[0].clientY };
        // }
        if (e instanceof MouseEvent){
            return { x: e.clientX, y: e.clientY };
        }
    }

    getWorldPos(point: point): point {
        // transform window frame coordinate (top left corner is origin y axis positive is down x axis positive is right) to the window world coordinate
        // to convert to the physics world coordinate need to call convertCoord(res) with the result as parameter
        let translateScalePoint = {x: point.x / this.cameraZoom - (window.innerWidth / 2 / this.cameraZoom), y: point.y / this.cameraZoom - (window.innerHeight / 2 / this.cameraZoom)};
        return PointCal.subVector(PointCal.transform2NewAxis(translateScalePoint, this.cameraAngle), this.cameraOffset);
    }


    getWorldPosWithOffset(point: point, offset: point): point {
        // transform window frame coordinate to window world coordinate with a specified camera offset; this function is specifically for when translating the camera using mouse and keyboard to preserve previous cameraoffset
        let translateScalePoint = {x: point.x / this.cameraZoom - (window.innerWidth / 2 / this.cameraZoom), y: point.y / this.cameraZoom - (window.innerHeight / 2 / this.cameraZoom)};
        return PointCal.subVector(PointCal.transform2NewAxis(translateScalePoint, this.cameraAngle), offset);
    }

    onPointerUp(e: MouseEvent) {
        if (e.button == 0) {
            this.isDragging = false;
            this.lastZoom = this.cameraZoom;
            let convertCoord = this.getEventLocation(e);
        }
        let element = e.target as HTMLCanvasElement;
        element.style.cursor = "auto";
    }

    onPointerDown(e: MouseEvent) {
        console.log("mouse pos in view", this.getEventLocation(e));
        let convertedCoord = this.getWorldPos(this.getEventLocation(e));
        console.log("mouse pos in world space ", this.convertCoord(convertedCoord));
        this.simWorld.getRigidBodyMap().forEach((body, ident)=>{
            let vBody = body as VisualRigidBody;
            if(vBody.raycast(this.convertCoord(convertedCoord))){
                console.log("clicked in body with ident: ", ident);
                console.log("clicked body", vBody);
                this.focusCameraOnObj(vBody);
                this.alignCameraWithObjOrientation(vBody.getOrientationAngle());
                
            }
        })

        if (e.button == 0 && e.metaKey) {
            this.isDragging = true;
            this.dragStart = this.getWorldPos(this.getEventLocation(e));
            this.dragOffset = {...this.cameraOffset};
        } else if (e.button == 0) {
            let leftClickX = this.getEventLocation(e).x/this.cameraZoom - this.cameraOffset.x - (window.innerWidth / 2 / this.cameraZoom);
            let leftClickY = this.getEventLocation(e).y/this.cameraZoom - this.cameraOffset.y - (window.innerHeight / 2 / this.cameraZoom);
        }
    }


    onPointerMove(e:MouseEvent) {
        let convertCoord = this.getEventLocation(e);
        if (convertCoord == null){
            console.log("test");
            return;
        }
        if (this.isDragging) {
            // console.log("Dragging camera");
            // dragging cmaera
            let canvas = e.target as HTMLCanvasElement;
            canvas.style.cursor = "move";
            console.log("mouse in frame pos", this.getWorldPos(convertCoord));
            let diff = PointCal.subVector(this.getWorldPosWithOffset(convertCoord, this.dragOffset), this.dragStart);
            this.cameraOffset = PointCal.addVector(this.dragOffset, diff);

            this.limitCameraOffset();
        }
    }

    scrollHandler(e: WheelEvent, zoomAmount: number, zoomFactor: number) {

        e.preventDefault();
        // console.log("deltaY: ", e.deltaY);
        // console.log("result:", Math.abs(e.deltaY) % 8 == 0 && Math.abs(e.deltaY) !== 0 );
        
        if (e.shiftKey){
            return;
        }

        if (e.ctrlKey || e.metaKey){
            // console.log("Wheel with control key");
            // this is pinch zoom event from trackpad or scroll zoom event from a mouse
            // console.log("scrolling for zoom");
            let originalWorldPos = this.getWorldPos(this.getEventLocation(e));
            if (!this.isDragging) {
                if (zoomAmount) {
                    this.cameraZoom -= zoomAmount * 5;
                } else if (zoomFactor) {
                    // console.log(zoomFactor)
                    this.cameraZoom = zoomFactor * this.lastZoom;
                }
                
                this.cameraZoom = Math.min( this.cameraZoom, this.MAX_ZOOM );
                this.cameraZoom = Math.max( this.cameraZoom, this.MIN_ZOOM );
                // console.log("Diff in World Coordinate after zooming: ", PointCal.subVector(originalWorldPos, this.getWorldPos(this.getEventLocation(e))));
                let posDiff = PointCal.subVector(originalWorldPos, this.getWorldPos(this.getEventLocation(e)));
                
                if (originalWorldPos.x >= 0 && originalWorldPos.x <= this.maxTransWidth || originalWorldPos.x < 0 && originalWorldPos.x >= -this.maxTransWidth) {
                    this.cameraOffset.x -= posDiff.x;
                }
                if (originalWorldPos.y >= 0 && originalWorldPos.y <= this.maxTransHeight || originalWorldPos.y < 0 && originalWorldPos.y >= -this.maxTransHeight) {
                    this.cameraOffset.y -= posDiff.y;
                }
            }

            // this is the experimental calculations of drawing only stuff that lies within the viewport
            // below are screen boundaries
            // console.log("Camera Zoom: ", this.cameraZoom);
            // console.log("Center is ", this.cameraOffset);
            // console.log("left most:", -this.cameraOffset.x - ((this.width / 2) / this.cameraZoom));
            // console.log("right most:", -this.cameraOffset.x + ((this.width / 2) / this.cameraZoom));
            // console.log("up most:", this.cameraOffset.y - ((this.height / 2) / this.cameraZoom));
            // console.log("down most:", this.cameraOffset.y + ((this.height / 2) / this.cameraZoom));
            
        } 
        // console.log("wheelDeltaY:", e.wheelDeltaY, "deltaY:", e.deltaY); 
        // var isTouchPad = e.wheelDeltaY ? e.wheelDeltaY === -3 * e.deltaY : e.deltaMode === 0
        // your code
        // console.log("From" + isTouchPad? "touchpad" : "mouse");
        // console.log("absolute: ", Math.abs(e.deltaY));
        else{ //(Math.abs(e.deltaY) % 40 !== 0 || Math.abs(e.deltaY) == 0) {
            // when the scroll is actually a pan movement
            e.preventDefault();
            // console.log("This is the world coordinate when panning:", this.getWorldPos(this.getEventLocation(e)));
            let diff = PointCal.rotatePoint({x: e.deltaX, y: e.deltaY}, -this.cameraAngle);
            this.cameraOffset.x -= 0.5 * (diff.x/ this.cameraZoom);
            this.cameraOffset.y -= 0.5 * (diff.y / this.cameraZoom);

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

    private limitCameraOffset(){
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

    convertCoord(point: point){
        return {x: point.x, y: -point.y};
    }

    alignCameraWithObjOrientation(angle: number){
        this.targetCameraAngle = angle - (90 * Math.PI / 180);
    }

    focusCameraOnObj(body: VisualRigidBody){
        let windowFrameCoord = this.convertCoord(body.getCenter());
        this.setCameraPos(windowFrameCoord);
    }

    addRigidBody(rigidBody: VisualRigidBody): void{
        let ident = crypto.randomUUID();
        console.log("Adding body with ident: ", ident);
        this.simWorld.addRigidBody(ident, rigidBody);
    }

    resetCamera(): void{
        this.cameraOffset = {x: 0, y: 0};
        this.cameraZoom = 1;
        this.cameraAngle = 0;
    }

    setCameraPos(point: point): void{
        console.log("setting camera center to", point);
        this.cameraOffset = {x: -point.x, y: -point.y};
    }

    moveForward(): void{
        let bodies = this.simWorld.getRigidBodyList();
        if (bodies.length === 0) {
            return
        }
        let controlBody = bodies[0];
        let force: point = {x: this.tempForce, y: 0};
        controlBody.applyForceInOrientation(force);
    }

    moveBackward(): void{
        let bodies = this.simWorld.getRigidBodyList();
        if (bodies.length === 0) {
            return
        }
        let controlBody = bodies[0];
        let force: point = {x: -this.tempForce, y: 0};
        controlBody.applyForceInOrientation(force);
    }

    moveLeftward(): void{
        let bodies = this.simWorld.getRigidBodyList();
        if (bodies.length === 0) {
            return
        }
        let controlBody = bodies[0];
        let force: point = {y: this.tempForce, x: 0};
        controlBody.applyForceInOrientation(force);
    }

    moveRightward(): void{
        let bodies = this.simWorld.getRigidBodyList();
        if (bodies.length === 0) {
            return
        }
        let controlBody = bodies[0];
        let force: point = {y: -this.tempForce, x: 0};
        controlBody.applyForceInOrientation(force);
    }

    rotateCCW(): void{
        let bodies = this.simWorld.getRigidBodyList();
        if (bodies.length === 0) {
            return
        }
        let controlBody = bodies[0];
        controlBody.setAngularVelocity(0.087);
    }

    rotateCW(): void{
        let bodies = this.simWorld.getRigidBodyList();
        if (bodies.length === 0) {
            return
        }
        let controlBody = bodies[0];
        controlBody.setAngularVelocity(-0.087);
    }

   
    

    tabSwitchingHandler(){
        if (document.hidden){
            console.log("Browser tab is hidden");
            this.lastTimeUpdate = Date.now();
            this.worker.postMessage({turn: "on"});
        } else {
            console.log("Browser tab is visible");
            this.worker.postMessage({turn: "off"});
        }
    }
}

