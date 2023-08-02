import { BaseRigidBody } from "./rigidbody";
import { PointCal, point } from "point2point";

export class Collision {

    constructor(){

    }

    static broadPhase(bodies: BaseRigidBody[]): {bodyAIndex: number, bodyBIndex: number}[]{
        let possibleCombi: {bodyAIndex: number, bodyBIndex: number}[] = [];
        
        for(let index = 0; index <= bodies.length - 1; index++){
            for(let jindex = index + 1; jindex <= bodies.length - 1; jindex++){
                let bodyA = bodies[index];
                let bodyB = bodies[jindex];
                if (bodyA.isStatic() && bodyB.isStatic()){
                    continue;
                }
                if(!this.aabbIntersects(bodyA.getAABB(), bodyB.getAABB())){
                    continue;
                }
                possibleCombi.push({bodyAIndex: index, bodyBIndex: jindex});
            }
        }
        return possibleCombi
    }

    static narrowPhase(bodies: BaseRigidBody[], combinationsToCheck: {bodyAIndex: number, bodyBIndex: number}[], resolveCollision: boolean): void {
        if (!resolveCollision) {
            return;
        }
        combinationsToCheck.forEach(combination => {
            console.log("resolving");
            let bodyA = bodies[combination.bodyAIndex];
            let bodyB = bodies[combination.bodyBIndex];
            let {collision, depth, normal: normalAxis} = this.intersects(bodyA, bodyB);
            if (collision) {
                let moveDisplacement = PointCal.multiplyVectorByScalar(normalAxis, depth / 2);
                let revMoveDisplacement = PointCal.multiplyVectorByScalar(normalAxis, -depth / 2);

                if (!bodyA.isStatic()) {
                    bodyA.move(moveDisplacement);
                }
                if (!bodyB.isStatic()) {
                    bodyB.move(revMoveDisplacement);
                }
                if (bodyA.isStatic()) {
                    bodyA.move(revMoveDisplacement);
                    bodyB.move(revMoveDisplacement);
                }
                if (bodyB.isStatic()) {
                    bodyA.move(moveDisplacement);
                    bodyB.move(moveDisplacement);
                }

                if (resolveCollision) {
                    this.resolveCollision(bodyA, bodyB, normalAxis);
                }
            }
        })
    }

    static intersects(bodyA: BaseRigidBody, bodyB: BaseRigidBody): {collision: boolean, depth: number, normal: point}{
        let axis: point[] = [];
        let bodyAAxes = bodyA.getCollisionAxes(bodyB);
        let bodyBAxes = bodyB.getCollisionAxes(bodyA);

        axis.push(...bodyAAxes);
        axis.push(...bodyBAxes);

        let collision = true;
        let minDepth = Number.MAX_VALUE;
        let minAxis = axis[0];

        axis.forEach(projAxis => {
            let bodyAInterval = bodyA.getMinMaxProjection(projAxis);
            let bodyBInterval = bodyB.getMinMaxProjection(projAxis);

            if (bodyAInterval.min >= bodyBInterval.max || bodyBInterval.min >= bodyAInterval.max) {
                collision = false;
            }else {
                let depth = Math.abs(Math.min(bodyAInterval.max, bodyBInterval.max) - Math.max(bodyBInterval.min, bodyAInterval.min));
                if (depth < minDepth) {
                    minDepth = depth;
                    minAxis = projAxis;
                    if (bodyAInterval.max < bodyBInterval.max) {
                        minAxis = PointCal.multiplyVectorByScalar(minAxis, -1);
                    }
                }
            }
        });

        if (collision){
            return {collision: collision, depth: minDepth, normal: minAxis};
        }else {
            return {collision: false, depth: null, normal: null};
        }
    }

    static aabbIntersects(aabbA: {min: point, max: point}, aabbB: {min: point, max: point}): boolean{
        if ((aabbA.min.x <= aabbB.max.x && aabbB.min.x <= aabbA.max.x) && (aabbA.min.y <= aabbB.max.y && aabbB.min.y <= aabbA.max.y)) {
            return true;
        }
        return false;
    }

    static resolveCollision(bodyA: BaseRigidBody, bodyB: BaseRigidBody, normal: point): void {
        if (bodyA.isStatic() && bodyB.isStatic()) {
            return;
        }
        let restitution = 0.4;

        let inverseMassA = bodyA.isStatic() || bodyA.isMovingStatic() ? 0 : 1 / bodyA.getMass();
        let inverseMassB = bodyB.isStatic() || bodyB.isMovingStatic() ? 0 : 1 / bodyB.getMass();
        // console.log("inverse mass a", inverseMassA);
        // console.log("inverse mass b", inverseMassB);
        let relativeVelocity = PointCal.subVector(bodyA.getLinearVelocity(), bodyB.getLinearVelocity());
        let J = -(1 + restitution) * PointCal.dotProduct(relativeVelocity, normal);
        J /= inverseMassA + inverseMassB;

        let deltaVelocityA = PointCal.multiplyVectorByScalar(normal, J * inverseMassA);
        let deltaVelocityB = PointCal.multiplyVectorByScalar(normal, J * inverseMassB);

        bodyA.setLinearVelocity(PointCal.addVector(bodyA.getLinearVelocity(), deltaVelocityA));
        bodyB.setLinearVelocity(PointCal.addVector(bodyB.getLinearVelocity(), deltaVelocityB));
    }
}