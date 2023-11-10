import { PointCal, point } from "point2point";
import { VisualRigidBody } from "./VisualRigidBody";
import { easeInOutQuint, easeInOutSine, linear } from "../../easeFunctions";
import { UIComponent, NonInteractiveUIComponent } from "./canvas";

export class CustomCanvasWebkit extends HTMLElement {


    private width: number;
    private height: number;
    private _canvas: HTMLCanvasElement = document.createElement("canvas");
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
    private cameraZoomFactor: number = 0.1;
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
    private viewTopLeftInWorld: point;
    private viewTopRightInWorld: point;
    private viewBottomLeftInWorld: point;
    private viewBottomRightInWorld: point;

    private uiList: Map<string, UIComponent>;
    private nonInteractiveUILists: NonInteractiveUIComponent[];
    private prevTime: number;
    private lastTimeUpdate: number;
    private keyController: Map<string, boolean>;
    private worldWorker: Worker = null;

    private topLeftCorner: point;
    static observedAttributes = ["width", "height", "full-screen", "style"];

    private idGen: number = 0;

    private startTouchPointDistance: number;
    private startTouchPoints: point[];

    constructor(){
        super();
        
        this.tabSwitchingHandler = this.tabSwitchingHandler.bind(this);
        this.step = this.step.bind(this);

        this._canvas.width = this.width;
        this._canvas.height = this.height;
        this.context = this._canvas.getContext("2d");
        this._canvas.style.background = "gray";
        this.topLeftCorner = {x: this._canvas.getBoundingClientRect().x, y: this._canvas.getBoundingClientRect().y};
        

        this.context.save();

        this._canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
        this._canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
        this._canvas.addEventListener('pointercancel', this.onPointerUp.bind(this));
        this._canvas.addEventListener('pointerleave', this.onPointerUp.bind(this));
        this._canvas.addEventListener('pointerout', this.onPointerUp.bind(this));
        this._canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
        this._canvas.addEventListener( 'wheel', (e) => this.scrollHandler(e, e.deltaY*this.SCROLL_SENSITIVITY, 0.1));
        this._canvas.addEventListener('touchstart', this.touchstartHandler.bind(this));
        this._canvas.addEventListener('touchmove', this.touchmoveHandler.bind(this));
        this._canvas.addEventListener('touchcancel', this.touchcancelHandler.bind(this));
        this._canvas.addEventListener('touchend', this.touchendHandler.bind(this));

        
        this.lastTimeUpdate = Date.now();
        


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
        this.keyController = new Map<string, boolean>();

        this.keyController.set("KeyA", false);
        this.keyController.set("KeyW", false);
        this.keyController.set("KeyS", false);
        this.keyController.set("KeyD", false);
        this.keyController.set("KeyQ", false);
        this.keyController.set("KeyE", false);

        this.cameraTransitionEasingFn = easeInOutSine;
        this.attachShadow({mode: "open"});
    }

    setWorldWorker(worldWorker: Worker){
        this.worldWorker = worldWorker;
        this.worldWorker.onmessage = this.workerMsgHandler.bind(this);
    }

    workerMsgHandler(event: MessageEvent){
        console.log("Received message from world worker", event.data);
    }

    getBoundaries(){
        return {minX: -this.maxTransWidth, maxX: this.maxTransWidth, minY: -this.maxTransHeight, maxY: this.maxTransHeight};
    }

    attributeChangedCallback(name, oldValue, newValue) {
        console.log(`Attribute ${name} has changed.`);
        if (name == "width"){
            this.width = +newValue;
            console.log("width", this.width);
        }
        if (name == "height"){
            this.height = +newValue;
            console.log("height", this.height);
        }
        if (name == "full-screen"){
            console.log("full-screen", newValue);
            if (newValue !== null && newValue !== "false"){
                this.width = window.innerWidth;
                this.height = window.innerHeight;
            }
        }
        if (name == "style"){
            this._canvas.setAttribute(name, newValue);
            this._canvas.style.background = "gray";
        }

    }

    connectedCallback(){
        this.shadowRoot.appendChild(this._canvas);
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

    step(timestamp: number) {
        let deltaTime = timestamp - this.prevTime;
        deltaTime = Math.min(Date.now() - this.lastTimeUpdate, deltaTime);
        deltaTime /= 1000;
        this.prevTime = timestamp;

        this._canvas.width = this.width;
        this._canvas.height = this.height;
        this.topLeftCorner = {x: this._canvas.getBoundingClientRect().x, y: this._canvas.getBoundingClientRect().y};

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

        this.uiList.forEach((uiComponent, ident)=>{
            uiComponent.draw(this.context, this.cameraZoom);
        });

        this.nonInteractiveUILists.forEach((nuiComp)=>{
            nuiComp.draw(this.context, this.cameraZoom);
        });

        this.viewTopLeftInWorld = this.convertCoord(this.getWorldPos({x: this._canvas.getBoundingClientRect().x, y: this._canvas.getBoundingClientRect().y}));
        this.viewTopRightInWorld = this.convertCoord(this.getWorldPos({x: this._canvas.getBoundingClientRect().x + this.width, y: this._canvas.getBoundingClientRect().y}));
        this.viewBottomLeftInWorld = this.convertCoord(this.getWorldPos({x: this._canvas.getBoundingClientRect().x, y: this._canvas.getBoundingClientRect().y + this.height}));
        this.viewBottomRightInWorld = this.convertCoord(this.getWorldPos({x: this._canvas.getBoundingClientRect().x + this.width, y: this._canvas.getBoundingClientRect().y + this.height}));


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
            console.log("touch event");
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

    onPointerUp(e: PointerEvent) {
        if(e.pointerType === "mouse"){
            if (e.button == 0) {
                this.isDragging = false;
                // this.lastZoom = this.cameraZoom;
            }
            let element = e.target as HTMLCanvasElement;
            element.style.cursor = "auto";
        } 
    }

    onPointerDown(e: PointerEvent) {
        if(e.pointerType === "mouse"){
            console.log("Top Left", this.viewTopLeftInWorld);
            console.log("Top Right", this.viewTopRightInWorld);
            console.log("Bottom Left", this.viewBottomLeftInWorld);
            console.log("Bottom Right", this.viewBottomRightInWorld);

            console.log("mouse pos in view", this.getEventLocation(e));
            let convertedCoord = this.getWorldPos(this.getEventLocation(e));
            console.log("mouse pos in world space ", this.convertCoord(convertedCoord));
            

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
    }


    onPointerMove(e: PointerEvent) {
        e.preventDefault();
        if(e.pointerType === "mouse"){
            let convertCoord = this.getEventLocation(e);
            if (convertCoord == null){
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
                originalWorldPos = this.convertCoord(this.cameraLockedOnObj.getCenter());
            }
            if (!this.isDragging) {
                if (zoomAmount) {
                    this.cameraZoom -= zoomAmount * 5;
                } else if (zoomFactor) {
                    this.cameraZoom = zoomFactor * this.lastZoom;
                }
                
                this.cameraZoom = Math.min( this.cameraZoom, this.MAX_ZOOM );
                this.cameraZoom = Math.max( this.cameraZoom, this.MIN_ZOOM );
                // console.log("Diff in World Coordinate after zooming: ", PointCal.subVector(originalWorldPos, this.getWorldPos(this.getEventLocation(e))));
                let posDiff = PointCal.subVector(originalWorldPos, this.getWorldPos(this.getEventLocation(e)));
                if (this.cameraLockedOnObj !== null){
                    posDiff = PointCal.subVector(originalWorldPos, this.convertCoord(this.cameraLockedOnObj.getCenter()));
                }
                
                if (originalWorldPos.x >= 0 && originalWorldPos.x <= this.maxTransWidth || originalWorldPos.x < 0 && originalWorldPos.x >= -this.maxTransWidth) {
                    this.cameraOffset.x -= posDiff.x;
                }
                if (originalWorldPos.y >= 0 && originalWorldPos.y <= this.maxTransHeight || originalWorldPos.y < 0 && originalWorldPos.y >= -this.maxTransHeight) {
                    this.cameraOffset.y -= posDiff.y;
                }
            }
            
        } 
        else{ //(Math.abs(e.deltaY) % 40 !== 0 || Math.abs(e.deltaY) == 0) {
            // when the scroll is actually a pan movement
            //NOTE Panning
            this.cameraPanningPercentage = null;
            if (this.cameraLockedOnObj !== null){
                return;
            }
            // console.log("This is the world coordinate when panning:", this.getWorldPos(this.getEventLocation(e)));
            let diff = PointCal.rotatePoint({x: e.deltaX, y: e.deltaY}, -this.cameraAngle);
            this.cameraOffset.x -= 0.5 * (diff.x / this.cameraZoom);
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
        // console.log("Current Top left Corner:", this.getWorldPos({x: 0, y: 0}));
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
        this.cameraAngle = this.normalizeAngle(this.cameraAngle);
        let targetAngle = this.normalizeAngle(body.getOrientationAngle()) - (90 * Math.PI / 180);
        let diff = this.getMinimumAngle(targetAngle - this.cameraAngle);
        this.cameraRotatingPercentage = 0;
        this.cameraAngleOrigin = this.cameraAngle;
        this.cameraAngleTargetSpan = diff;
    }

    alignCameraWithAngle(angle: number){
        let targetAngle = angle;
        this.cameraAngle = this.normalizeAngle(this.cameraAngle);
        let diff = this.getMinimumAngle(targetAngle - this.cameraAngle);
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


    addPolygon(type: "VisualPolygon" | "VisualCircle", center: point, vertices: point[], orientationAngle: number = 0, mass: number = 50, isStatic: boolean = true, frictionEnabled: boolean = true, lineWidth: number = 0.3){
        if(this.worldWorker !== null){
            const data = {center: center, vertices: vertices, orientationAngle: orientationAngle, mass: mass, isStatic: isStatic, frictionEnabled: frictionEnabled, lineWidth: lineWidth};
            let test = JSON.stringify(data);

            this.worldWorker.postMessage(JSON.stringify({command: "addRigidBody", type: type, center: center, vertices: vertices, orientationAngle: orientationAngle, mass: mass, isStatic: isStatic, frictionEnabled: frictionEnabled, lineWidth: lineWidth}));
        }
    }

    tabSwitchingHandler(){
        if (document.hidden){
            console.log("Browser tab is hidden");
            this.lastTimeUpdate = Date.now();
            
        } else {
            console.log("Browser tab is visible");
        }
    }

    touchstartHandler(e: TouchEvent){
        if(e.targetTouches.length === 2){
            this.isDragging = false;
            let firstTouchPoint = {x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY};
            let secondTouchPoint = {x: e.targetTouches[1].clientX, y: e.targetTouches[1].clientY};
            this.startTouchPointDistance = PointCal.distanceBetweenPoints(firstTouchPoint, secondTouchPoint);
            this.startTouchPoints = [firstTouchPoint, secondTouchPoint];
            // console.log("distance at the beginning of touch gesture", this.startTouchPointDistance);
            let midPoint = PointCal.linearInterpolation(firstTouchPoint, secondTouchPoint, 0.5);
            // console.log("mid point of two touch point is", midPoint);
        } else if (e.targetTouches.length === 1){
            this.isDragging = true;
            this.startTouchPoints = [{x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY}];
        }
    }

    touchcancelHandler(e: TouchEvent){
        this.startTouchPoints = [];
        this.isDragging = false;
    }

    touchendHandler(e: TouchEvent){
        this.startTouchPoints = [];
        this.isDragging = false;
    }

    touchmoveHandler(e:TouchEvent){
        e.preventDefault();
        if(e.targetTouches.length == 2){
            //NOTE Touch Zooming
            // pinch movement
            // console.log("Pinch Zooming");
            let startPoint = {x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY};
            let endPoint = {x: e.targetTouches[1].clientX, y: e.targetTouches[1].clientY};
            let touchPointDist = PointCal.distanceBetweenPoints(startPoint, endPoint);
            let distDiff = this.startTouchPointDistance - touchPointDist;
            let midPoint = PointCal.linearInterpolation(startPoint, endPoint, 0.5);
            // console.log("mid point of two touch point is", this.convertCoord(this.getWorldPos(midPoint)));
            this.cameraZoomingPercentage = null;
            let originalWorldPos = this.getWorldPos(midPoint);
            if (this.cameraLockedOnObj !== null){
                originalWorldPos = this.convertCoord(this.cameraLockedOnObj.getCenter());
            }
            if (!this.isDragging) {
                let zoomAmount = distDiff * 0.3 * this.cameraZoom * this.cameraZoomFactor * this.SCROLL_SENSITIVITY;
                this.cameraZoom -= zoomAmount * 1;
                
                this.cameraZoom = Math.min( this.cameraZoom, this.MAX_ZOOM );
                this.cameraZoom = Math.max( this.cameraZoom, this.MIN_ZOOM );
                // console.log("Diff in World Coordinate after zooming: ", PointCal.subVector(originalWorldPos, this.getWorldPos(this.getEventLocation(e))));
                let posDiff = PointCal.subVector(originalWorldPos, this.getWorldPos(midPoint));
                if (this.cameraLockedOnObj !== null){
                    posDiff = PointCal.subVector(originalWorldPos, this.convertCoord(this.cameraLockedOnObj.getCenter()));
                }
                
                if (originalWorldPos.x >= 0 && originalWorldPos.x <= this.maxTransWidth || originalWorldPos.x < 0 && originalWorldPos.x >= -this.maxTransWidth) {
                    this.cameraOffset.x -= posDiff.x;
                }
                if (originalWorldPos.y >= 0 && originalWorldPos.y <= this.maxTransHeight || originalWorldPos.y < 0 && originalWorldPos.y >= -this.maxTransHeight) {
                    this.cameraOffset.y -= posDiff.y;
                }
            }

            
        } else if (e.targetTouches.length == 1 && this.isDragging){
            //NOTE Touch panning
            this.cameraPanningPercentage = null;
            if (this.cameraLockedOnObj !== null){
                return;
            }
            // console.log("Panning");
            let delta = PointCal.rotatePoint(PointCal.subVector(this.startTouchPoints[0], {x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY}), -this.cameraAngle);
            this.cameraOffset.x -= 0.5 * (delta.x / this.cameraZoom);
            this.cameraOffset.y -= 0.5 * (delta.y / this.cameraZoom);
            this.startTouchPoints = [{x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY}];
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

    normalizeAngle(angle: number){
        angle = angle % (2 * Math.PI)
        if (angle > Math.PI){
            angle -= (2 * Math.PI)
        } else if (angle < -Math.PI){
            angle += (2 * Math.PI)
        }

        if (angle < 0){
            angle += (Math.PI * 2);
        }

        return angle
    }

    getMinimumAngle(angle: number){
        angle = angle % (2 * Math.PI)
        if (angle > Math.PI){
            angle -= (2 * Math.PI)
        } else if (angle < -Math.PI){
            angle += (2 * Math.PI)
        }
        return angle;
    }
}
