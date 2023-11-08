import { World } from "../../2dphysics";
import { PointCal, point } from "point2point";
import { VisualRigidBody } from "./VisualRigidBody";
import { workerScript } from "../../workerscripts/phyworker";
import { easeInOutQuint, easeInOutSine, linear } from "../../easeFunctions";

export interface NonInteractiveUIComponent {
    draw(context: CanvasRenderingContext2D, cameraZoom: number): void;
}

export interface UIComponent {
    draw(context: CanvasRenderingContext2D, cameraZoom: number): void;
}

export class CustomCanvas extends HTMLCanvasElement {

    private context: CanvasRenderingContext2D;
    private requestRef: number;

    private cameraOffset: {x: number, y: number} = {x: 0, y: 0};
    private cameraPanningPercentage: number = null; // from 0 to 1 camera panning operation percentage; used for animation purposes
    private cameraPanningOrigin: point = null;
    private cameraOffsetTargetDirection: point = null;
    private cameraOffsetTargetMagnitude: number = null;
    private cameraLockedOnPoint: point = null; // this is defined in the camera world space coordinate
    private cameraLockedOnObj: VisualRigidBody = null;

    private cameraAngle: number = 0 * Math.PI / 180;
    private cameraRotatingPercentage: number = null; // from 0 to 1 camera rotation operation percentage; used for animation purposes
    private cameraAngleOrigin: number = null; 
    private cameraAngleTargetSpan: number = null;
    
    private cameraZoom: number = 1;
    private cameraZoomingPercentage: number = null; // from 0 to 1 camera zoom operation percentage; used for animation purposes
    private cameraZoomOrigin: number = null;
    private cameraZoomDiff: number = null;
    private MAX_ZOOM: number = 5;
    private MIN_ZOOM: number = 0.01;
    private SCROLL_SENSITIVITY: number = 0.005;
    private isDragging: boolean = false;
    private dragStart: {x: number, y: number} = {x: 0, y: 0};
    private dragOffset: {x: number, y: number} = {x: 0, y: 0};
    private lastZoom = this.cameraZoom;
    private cameraTransitionEasingFn: (x: number)=>number;
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

    private topLeftCorner: point;

    private idGen: number = 0;

    private deltaTimeElement: HTMLElement;

    constructor(){
        super();

        this.deltaTimeElement = document.getElementById("delta-time");

        this.tabSwitchingHandler = this.tabSwitchingHandler.bind(this);
        this.step = this.step.bind(this);

        this.width = window.innerWidth ;
        this.height = window.innerHeight;
        this.context = this.getContext("2d");
        this.style.background = "gray";
        // this.topLeftCorner = {x: this.getBoundingClientRect().x, y: this.getBoundingClientRect().y};
        

        this.context.save();

        this.addEventListener('mousedown', this.onPointerDown);
        this.addEventListener('mouseup', this.onPointerUp);
        this.addEventListener('mousemove', this.onPointerMove);
        this.addEventListener( 'wheel', (e) => this.scrollHandler(e, e.deltaY*this.SCROLL_SENSITIVITY, 0.1));
        // this.addEventListener( 'touchstart', this.pointerDownHandler);

        this.worker = new Worker(workerScript);
        this.lastTimeUpdate = Date.now();
        this.worker.onmessage = (data)=>{
            let nowTime = Date.now();
            let deltaTime = nowTime - this.lastTimeUpdate;
            this.lastTimeUpdate = nowTime; 
            // this.simWorld.step(deltaTime / 1000);
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
        this.simWorld = new World(this.maxTransWidth, this.maxTransHeight);
        this.keyController = new Map<string, boolean>();

        this.keyController.set("KeyA", false);
        this.keyController.set("KeyW", false);
        this.keyController.set("KeyS", false);
        this.keyController.set("KeyD", false);
        this.keyController.set("KeyQ", false);
        this.keyController.set("KeyE", false);

        this.cameraTransitionEasingFn = easeInOutSine;
    }

    connectedCallback(){
        this.requestRef = requestAnimationFrame(this.step);
    }

    disconnectedCallback(){
        cancelAnimationFrame(this.requestRef);
    }

    insertNIUIComponent(niUIComp: NonInteractiveUIComponent){
        this.nonInteractiveUILists.push(niUIComp);
    }

    insertUIComponent(uiComponent: UIComponent) {
        this.uiList.set(this.idGen.toFixed(), uiComponent);
        this.idGen++;
    }

    removeUIComponent(uiComponentIdent: string) {
        if (this.uiList.has(uiComponentIdent)) {
            this.uiList.delete(uiComponentIdent);
        }
    }

    getBoundaries(){
        return {minX: -this.maxTransWidth, maxX: this.maxTransWidth, minY: -this.maxTransHeight, maxY: this.maxTransHeight};
    }

    step(timestamp: number) {
        let deltaTime = timestamp - this.prevTime;
        deltaTime = Math.min(Date.now() - this.lastTimeUpdate, deltaTime);
        deltaTime /= 1000;
        this.prevTime = timestamp;
        
        this.deltaTimeElement.innerText = deltaTime.toFixed(9);
        // setting width and height of the canvas resets the contents in the canvas
        // this.width = this.width;
        // this.height = this.height;
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.context.restore();
        this.context.translate( this.width / 2, this.height / 2 );
        this.context.scale(this.cameraZoom, this.cameraZoom);
        this.context.rotate(this.cameraAngle);
        this.context.translate(this.cameraOffset.x,  this.cameraOffset.y);

        // draw the x and y axis
        this.drawAxis(this.context);

        // draw outer perimeter of the map
        this.context.beginPath();
        this.context.strokeStyle = "blue";
        this.context.lineWidth = 100;
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
            nuiComp.draw(this.context, this.cameraZoom);
        });

        // step and draw elements
        this.simWorld.step(deltaTime);
        this.simWorld.getRigidBodyList().forEach((body, index)=> {
            let vBody = body as VisualRigidBody;
            vBody.draw(this.context, this.cameraZoom);
        });

        if (this.cameraLockedOnObj !== null){
            this.focusCameraOnObjWithoutTransition(this.cameraLockedOnObj);
        }
        // camera transition
        // rotation
        if (this.cameraRotatingPercentage !== null && this.cameraRotatingPercentage <= 1){
            this.cameraRotatingPercentage += 1 * deltaTime;
            let offset = this.cameraTransitionEasingFn(this.cameraRotatingPercentage);
            if (this.cameraRotatingPercentage > 1){
                offset = this.cameraTransitionEasingFn(1);
            }
            let offsetAngle = offset * this.cameraAngleTargetSpan;
            this.cameraAngle = this.cameraAngleOrigin + offsetAngle;
        }
        // translation
        if (this.cameraPanningPercentage !== null && this.cameraPanningPercentage <= 1){
            this.cameraPanningPercentage += 1 * deltaTime;
            let offsetValue = this.cameraTransitionEasingFn(this.cameraPanningPercentage);
            if (this.cameraPanningPercentage > 1){
                offsetValue = this.cameraTransitionEasingFn(1);
            }
            let offset = PointCal.multiplyVectorByScalar(this.cameraOffsetTargetDirection, this.cameraOffsetTargetMagnitude * offsetValue);
            this.cameraOffset = PointCal.addVector(this.cameraPanningOrigin, offset);
        }
        // zoom
        if (this.cameraZoomingPercentage !== null && this.cameraZoomingPercentage <= 1){
            this.cameraZoomingPercentage += 1 * deltaTime;
            let offsetValue = this.cameraTransitionEasingFn(this.cameraZoomingPercentage);
            if (this.cameraZoomingPercentage > 1){
                offsetValue = this.cameraTransitionEasingFn(1);
            }
            this.cameraZoom = this.cameraZoomOrigin + this.cameraZoomDiff * offsetValue;
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
        if (window.TouchEvent !== undefined && e instanceof TouchEvent && e.touches.length == 1) {
            return { x:e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if (e instanceof MouseEvent){
            return { x: e.clientX, y: e.clientY };
        }
    }

    getWorldPos(point: point): point {
        // transform window frame coordinate (top left corner is origin y axis positive is down x axis positive is right) to the window world coordinate
        // to convert to the physics world coordinate need to call convertCoord(res) with the result as parameter
        if (this.topLeftCorner !== null && this.topLeftCorner !== undefined){
            point = PointCal.subVector(point, this.topLeftCorner);
        }
        let translateScalePoint = {x: point.x / this.cameraZoom - (this.width / 2 / this.cameraZoom), y: point.y / this.cameraZoom - (this.height / 2 / this.cameraZoom)};
        return PointCal.subVector(PointCal.transform2NewAxis(translateScalePoint, this.cameraAngle), this.cameraOffset);
    }

    getWorldPosWithOffset(point: point, offset: point): point {
        // transform window frame coordinate to window world coordinate with a specified camera offset; this function is specifically for when translating the camera using mouse and keyboard to preserve previous cameraoffset
        if (this.topLeftCorner !== null && this.topLeftCorner !== undefined){
            point = PointCal.subVector(point, this.topLeftCorner);
        }
        let translateScalePoint = {x: point.x / this.cameraZoom - (this.width / 2 / this.cameraZoom), y: point.y / this.cameraZoom - (this.height / 2 / this.cameraZoom)};
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
                console.log("current body width in px on screen:", this.cameraZoom * vBody.getLargestDimension());
                let targetDimension = 0.05 * this.width;
                console.log("target zoom level would be:", targetDimension / vBody.getLargestDimension());
                this.cameraLockedOnPoint = this.convert2CameraCoord(this.convertCoord(vBody.getCenter()));
                this.cameraLockedOnObj = vBody;
                console.log("Camera Locked on Point", this.cameraLockedOnPoint);
                this.setCameraZoom(targetDimension / vBody.getLargestDimension());
                this.focusCameraOnObj(vBody);
                this.alignCameraWithObjOrientation(vBody);
            }
        })

        if (e.button == 0 && e.metaKey) {
            this.isDragging = true;
            this.dragStart = this.getWorldPos(this.getEventLocation(e));
            this.dragOffset = {...this.cameraOffset};
            this.cameraPanningPercentage = null;
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
            //NOTE Zooming
            // console.log("Wheel with control key");
            // this is pinch zoom event from trackpad or scroll zoom event from a mouse
            this.cameraZoomingPercentage = null;
            let originalWorldPos = this.getWorldPos(this.getEventLocation(e));
            if (this.cameraLockedOnObj !== null){
                originalWorldPos = this.convert2CameraCoord(this.convertCoord(this.cameraLockedOnObj.getCenter()));
            }
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
                if (this.cameraLockedOnObj !== null){
                    posDiff = PointCal.subVector(originalWorldPos, this.convert2CameraCoord(this.convertCoord(this.cameraLockedOnObj.getCenter())));
                    console.log("pos Diff", posDiff);
                }
                
                if (originalWorldPos.x >= 0 && originalWorldPos.x <= this.maxTransWidth || originalWorldPos.x < 0 && originalWorldPos.x >= -this.maxTransWidth) {
                    this.cameraOffset.x -= posDiff.x;
                }
                if (originalWorldPos.y >= 0 && originalWorldPos.y <= this.maxTransHeight || originalWorldPos.y < 0 && originalWorldPos.y >= -this.maxTransHeight) {
                    this.cameraOffset.y -= posDiff.y;
                }
            }
            
        } 
        // console.log("wheelDeltaY:", e.wheelDeltaY, "deltaY:", e.deltaY); 
        // var isTouchPad = e.wheelDeltaY ? e.wheelDeltaY === -3 * e.deltaY : e.deltaMode === 0
        // your code
        // console.log("From" + isTouchPad? "touchpad" : "mouse");
        // console.log("absolute: ", Math.abs(e.deltaY));
        else{ //(Math.abs(e.deltaY) % 40 !== 0 || Math.abs(e.deltaY) == 0) {
            // when the scroll is actually a pan movement
            //NOTE Panning
            this.cameraPanningPercentage = null;
            if (this.cameraLockedOnObj !== null){
                return;
            }
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
        console.log("Current Top left Corner:", this.getWorldPos({x: 0, y: 0}));
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

    private clampCameraOffset(offset: point): point{
        // clipping the intended camera offset position
        const res: point = {...offset};
        if (offset.x < 0){
            res.x = this.maxTransWidth <= -offset.x ? -this.maxTransWidth : offset.x;
        } else {
            res.x = Math.min(this.maxTransWidth, offset.x);
        }
        if (offset.y < 0){
            res.y = this.maxTransHeight <= -offset.y ? -this.maxTransHeight : offset.y;
        } else {
            res.y = Math.min(this.maxTransHeight, offset.y);
        }
        return res;
    }

    private cameraOffsetOutOfBound(offset: point): boolean{
        // clipping camera panning
        if (Math.abs(offset.x) > this.maxTransWidth){
            return true;
        }
        if (Math.abs(offset.y) > this.maxTransHeight){
            return true;
        }
        return false;
    }

    convertCoord(point: point){
        return {x: point.x, y: -point.y};
    }

    alignCameraWithObjOrientationWithoutTransition(body: VisualRigidBody){
        if (this.cameraOffsetOutOfBound(this.convert2CameraCoord(this.convertCoord(body.getCenter())))){
            console.log("target camera position if outside of map");
            return;
        }
        let targetAngle = body.getOrientationAngle() - (90 * Math.PI / 180);
        this.cameraAngle = targetAngle;
    }

    alignCameraWithObjOrientation(body: VisualRigidBody){
        if (this.cameraOffsetOutOfBound(this.convert2CameraCoord(this.convertCoord(body.getCenter())))){
            console.log("target camera position if outside of map");
            return;
        }
        let targetAngle = body.getOrientationAngle() - (90 * Math.PI / 180);
        let diff = Math.abs(targetAngle - this.cameraAngle) > Math.PI ? this.cameraAngle - targetAngle : targetAngle - this.cameraAngle;
        console.log("angle diff:", diff);
        this.cameraRotatingPercentage = 0;
        this.cameraAngleOrigin = this.cameraAngle;
        this.cameraAngleTargetSpan = diff;
    }

    alignCameraWithAngle(angle: number){
        let targetAngle = angle;
        let diff = Math.abs(targetAngle - this.cameraAngle) > Math.PI ? this.cameraAngle - targetAngle : targetAngle - this.cameraAngle;
        console.log("angle diff:", diff);
        this.cameraRotatingPercentage = 0;
        this.cameraAngleOrigin = this.cameraAngle;
        this.cameraAngleTargetSpan = diff;
    }

    focusCameraOnObj(body: VisualRigidBody){
        if (this.cameraOffsetOutOfBound(this.convert2CameraCoord(this.convertCoord(body.getCenter())))){
            console.log("target camera position if outside of map");
            return;
        }
        let diff = PointCal.subVector(this.convert2CameraCoord(this.convertCoord(body.getCenter())), this.cameraOffset);
        this.cameraPanningPercentage = 0;
        this.cameraOffsetTargetDirection = PointCal.unitVector(diff);
        this.cameraOffsetTargetMagnitude = PointCal.magnitude(diff);
        this.cameraPanningOrigin = this.cameraOffset;
    }

    focusCameraOnObjWithoutTransition(body: VisualRigidBody){
        if (this.cameraOffsetOutOfBound(this.convert2CameraCoord(this.convertCoord(body.getCenter())))){
            console.log("target camera position if outside of map");
            return;
        }
        this.cameraOffset = this.convert2CameraCoord(this.convertCoord(body.getCenter()));
    }

    focusCameraOn(point: point){
        // point is in camera frame coordinate
        if (this.cameraOffsetOutOfBound(point)){
            console.log("target camera position if outside of map");
            return;
        }
        let diff = PointCal.subVector(point, this.cameraOffset);
        this.cameraPanningPercentage = 0;
        this.cameraOffsetTargetDirection = PointCal.unitVector(diff);
        this.cameraOffsetTargetMagnitude = PointCal.magnitude(diff);
        this.cameraPanningOrigin = this.cameraOffset;
    }

    focusCameraOnWithoutTransition(point: point){
        if (this.cameraOffsetOutOfBound(point)){
            console.log("target camera position if outside of map");
            return;
        }
        this.cameraOffset = point;
    }

    setCameraZoom(zoomLevel: number){
        if (zoomLevel > this.MAX_ZOOM){
            zoomLevel = this.MAX_ZOOM;
        }
        if (zoomLevel < this.MIN_ZOOM){
            zoomLevel = this.MIN_ZOOM;
        }
        this.cameraZoomOrigin = this.cameraZoom;
        this.cameraZoomDiff = zoomLevel - this.cameraZoom;
        this.cameraZoomingPercentage = 0;
    }

    setCameraZoomWithoutTransition(zoomLevel: number){
        this.cameraZoom = zoomLevel;
    }

    convert2CameraCoord(point: point){
        return {x: -point.x, y: -point.y};
    }

    resetCamera(): void{
        console.log("reset camera");
        this.cameraLockedOnObj = null;
        this.setCameraZoom(1);
        this.focusCameraOn({x: 0, y: 0});
        this.alignCameraWithAngle(0);
    }

    addRigidBody(rigidBody: VisualRigidBody): void{
        this.simWorld.addRigidBody(this.idGen.toFixed(), rigidBody);
        this.idGen++;
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

    pointerDownHandler(event){
        console.log("test");
    }
}

