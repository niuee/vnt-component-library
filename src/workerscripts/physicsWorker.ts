import { VisualPolygon } from "../components/canvas/VisualRigidBody/VisualPolygon";
import { RigidBody, World } from "../2dphysics";
import { point } from "point2point";
import { VisualRigidBody } from "components";
import { pointInPolygon } from "../algos";

const offWorld = new World(25000, 25000);
const bounds: {topLeft: point, topRight: point, bottomLeft: point, bottomRight: point} = {topLeft: null, topRight: null, bottomLeft: null, bottomRight: null};
let ident = 0;

let timerInterval;
// new VisualPolygon({x: 300, y: 300}, [{x: 10, y: 10}, {x: 10, y: -10}, {x: -10, y: -10}, {x: -10, y: 10}], 0, 50, false, true);
let time = Date.now();
console.log("offworld", offWorld);
timerInterval = setInterval(() => {
    let now = Date.now();
    let deltaTime = Date.now() - time;
    time = now;
    console.log("delta time", deltaTime);
    offWorld.step(deltaTime / 1000);
    if(bounds.topLeft !== null && bounds.topRight !== null && bounds.bottomLeft !== null && bounds.bottomRight !== null){
        let minX = Math.min(bounds.topLeft.x, bounds.topRight.x, bounds.bottomLeft.x, bounds.bottomRight.x);
        let maxX = Math.max(bounds.topLeft.x, bounds.topRight.x, bounds.bottomLeft.x, bounds.bottomRight.x);
        let minY = Math.min(bounds.topLeft.y, bounds.topRight.y, bounds.bottomLeft.y, bounds.bottomRight.y);
        let maxY = Math.max(bounds.topLeft.y, bounds.topRight.y, bounds.bottomLeft.y, bounds.bottomRight.y);
    }
    let drawList = [];
    // postMessage({deltaTime: deltaTime});
}, 33);


addEventListener('message', event => {
    let data = event.data;
    let vBodyData = JSON.parse(data);
    // console.log("data in worker thread", vBodyData);
    if (vBodyData.command === "addRigidBody"){
        if(vBodyData.type === "VisualPolygon"){
            offWorld.addRigidBody(ident.toFixed(), new VisualPolygon(vBodyData.center, vBodyData.vertices, vBodyData.orientationAngle, vBodyData.mass, vBodyData.isStatic, vBodyData.frictionEnabled, vBodyData.lineWidth));
            ident++;
        }
    } else if (vBodyData.command === "setBounds"){
        // console.log("set bounds in worker thread");
        bounds.topLeft = vBodyData.topLeft;
        bounds.topRight = vBodyData.topRight;
        bounds.bottomLeft = vBodyData.bottomLeft;
        bounds.bottomRight = vBodyData.bottomRight;
        // console.log(bounds);
    }
});

class RectangleBound{
    private bottomLeft: point;
    private width: number;
    private height: number;

    constructor(bottomLeft: point, width: number, height: number){
        this.bottomLeft = bottomLeft;
        this.width = width;
        this.height = height;
    }

    getWidth(){
        return this.width;
    }

    getHeight(){
        return this.height;
    }

    getbottomLeft(){
        return this.bottomLeft;
    }
}


class QuadTree {
    private MAX_OBJECTS = 10; // per node
    private MAX_LEVELS = 5;

    private level: number;
    private objects: RigidBody[] = [];
    private nodes: QuadTree[] = [];
    private bounds: RectangleBound;

    constructor(level: number, bounds: RectangleBound){
        this.level = level;
        this.objects = [];
        this.bounds = bounds;
        this.nodes = [null, null, null, null];
    }

    clear(){
        this.objects = [];
        for(let index = 0; index < this.nodes.length; index++){
            if(this.nodes[index] != null){
                this.nodes[index].clear();
                this.nodes[index] = null;
            }
        }
    }

    split(){
        let subWidth = this.bounds.getWidth() / 2;
        let subHeight = this.bounds.getHeight() / 2;
        let bottomLeft = this.bounds.getbottomLeft();
        // bottom left is the first node and it goes clock wise 
        this.nodes[0] = new QuadTree(this.level + 1, new RectangleBound({x: bottomLeft.x, y: bottomLeft.y}, subWidth, subHeight));
        this.nodes[1] = new QuadTree(this.level + 1, new RectangleBound({x: bottomLeft.x, y: bottomLeft.y + subHeight}, subWidth, subHeight));
        this.nodes[2] = new QuadTree(this.level + 1, new RectangleBound({x: bottomLeft.x + subWidth, y: bottomLeft.y + subHeight}, subWidth, subHeight));
        this.nodes[3] = new QuadTree(this.level + 1, new RectangleBound({x: bottomLeft.x + subWidth, y: bottomLeft.y}, subWidth, subHeight));
    }

    getIndex(vBody: RigidBody){
        let midPoint = {x: this.bounds.getbottomLeft().x + this.bounds.getWidth() / 2, y: this.bounds.getbottomLeft().y + this.bounds.getHeight() / 2};
        let points = vBody.getAABB();
        let bottom = points.max.y < midPoint.y;
        let left = points.max.x < midPoint.x;
        if (bottom){
            if (left){
                return 0;
            } else {
                return 3;
            }
        } else if (points.min.y > midPoint.y){
            if(left){
                return 1;
            } else {
                return 2;
            }
        }
        return -1;
    }

    insert(vBody: RigidBody){
        if (this.nodes[0] !== null){
            let index = this.getIndex(vBody);
            if (index !== -1){
                this.nodes[index].insert(vBody);
                return;
            }
        }

        this.objects.push(vBody);
        if(this.objects.length > this.MAX_OBJECTS && this.level < this.MAX_LEVELS){
            if (this.nodes[0] == null){
                this.split();
            }
            let i = 0;
            while (i < this.objects.length){
                let index = this.getIndex(this.objects[i]);
                if (index != -1){
                    let vBody = this.objects[i];
                    this.objects.splice(i, 1);
                    this.nodes[index].insert(vBody);
                } else{
                    i++;
                }
            }
        }
    }

    retrieve(vBody: RigidBody): RigidBody[]{
        let index = this.getIndex(vBody);
        let res = [];
        if(index !== -1 && this.nodes[index] !== null){
            res.push(...this.nodes[index].retrieve(vBody));
        }
        res.push(...this.objects);
        return res;
    }

}

