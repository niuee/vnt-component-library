import { BaseRigidBody } from "./rigidbody";
import { Collision } from "./collisions";

export class World {
    private rigidBodyList: BaseRigidBody[];
    private rigidBodyMap: Map<string, BaseRigidBody>;
    private resolveCollision: boolean;

    constructor(){
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
        this.rigidBodyMap.forEach((body) => {
            rigidBodyList.push(body);
        });
        let possibleCombinations = Collision.broadPhase(rigidBodyList);
        Collision.narrowPhase(rigidBodyList, possibleCombinations, this.resolveCollision);
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
}