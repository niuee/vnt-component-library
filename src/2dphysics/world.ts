import { BaseRigidBody, RigidBody } from "./rigidbody";
import { Collision } from "./collisions";
import { point } from "point2point";

export class World {
    private rigidBodyList: BaseRigidBody[];
    private rigidBodyMap: Map<string, BaseRigidBody>;
    private resolveCollision: boolean;
    private maxTransWidth: number;
    private maxTransHeight: number;
    private bound: RectangleBound;
    private quadTree: QuadTree;

    constructor(maxTransWidth: number, maxTransHeight: number){
        this.maxTransHeight = maxTransHeight;
        this.maxTransWidth = maxTransWidth;
        this.bound = new RectangleBound({x: -this.maxTransWidth, y: -this.maxTransHeight}, 2 * this.maxTransWidth, 2 * this.maxTransHeight);
        this.quadTree = new QuadTree(0, this.bound);
        this.rigidBodyList = [];
        this.rigidBodyMap = new Map<string, BaseRigidBody>();
        this.resolveCollision = true;
    }

    addRigidBody(ident: string, body: BaseRigidBody): void{
        this.rigidBodyList.push(body);
        this.rigidBodyMap.set(ident, body);
    }

    removeRigidBody(ident: string): void{
        if (this.rigidBodyMap.has(ident)) {
            this.rigidBodyMap.delete(ident);
        }
    }

    step(deltaTime: number): void{
        // console.log("stepping in world");
        let rigidBodyList: BaseRigidBody[] = [];
        this.quadTree.clear();
        this.rigidBodyMap.forEach((body) => {
            rigidBodyList.push(body);
            this.quadTree.insert(body);
        });
        let possibleCombinations = Collision.broadPhaseWithRigidBodyReturned(this.quadTree, rigidBodyList);
        Collision.narrowPhaseWithRigidBody(rigidBodyList, possibleCombinations, this.resolveCollision);
        rigidBodyList.forEach(rigidBody => {
            rigidBody.step(deltaTime);
        })
    }

    getRigidBodyList(){
        let rigidBodyList:BaseRigidBody[] = [];
        this.rigidBodyMap.forEach((body) => {
            rigidBodyList.push(body);
        })
        return rigidBodyList;
    }

    getRigidBodyMap(): Map<string, BaseRigidBody>{
        return this.rigidBodyMap;
    }

    setMaxTransHeight(height: number){
        this.maxTransHeight = height;
    }

    setMaxTransWidth(width: number){
        this.maxTransWidth = width;
    }
}

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


export class QuadTree {
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