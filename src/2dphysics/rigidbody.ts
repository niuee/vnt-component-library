import { PointCal, point } from "point2point";

export interface RigidBody {

    step(deltaTime: number): void;
    getMinMaxProjection(unitvector: point): {min: number, max: number};
    getCollisionAxes(relativeBody: RigidBody): point[];
    applyForce(force: point): void;
    applyForceInOrientation(force: point): void;
    getAABB(): {min: point, max: point};

}

export abstract class BaseRigidBody implements RigidBody{
    
    protected center: point;
    protected orientationAngle: number = 0;
    protected mass: number = 50;
    protected linearVelocity: point;
    protected linearAcceleartion: point;
    protected force: point;
    protected isStaticBody: boolean = false;
    protected staticFrictionCoeff: number = 0.3;
    protected dynamicFrictionCoeff: number = 0.3;
    protected frictionEnabled: boolean = false;
    protected isMovingStaticBody: boolean = false;
    protected angularVelocity: number; // in radians
    

    constructor(center: point, orientationAngle: number = 0, mass: number = 50, isStaticBody: boolean = false, frictionEnabled: boolean = false){
        this.center = center;
        this.orientationAngle = orientationAngle;
        this.mass = mass;
        this.isStaticBody = isStaticBody;
        this.frictionEnabled = frictionEnabled;
        this.force = {x: 0, y: 0};
        this.linearAcceleartion = {x: 0, y: 0};
        this.linearVelocity = {x: 0, y: 0};
        this.angularVelocity = 0;
    }

    move(delta: point): void {
        if (!this.isStatic()){
            this.center = PointCal.addVector(this.center, delta);
        }
    }

    rotateRadians(angle: number): void {
        this.orientationAngle += angle;
    }

    getCenter(): point {
        return this.center;
    }
    
    getOrientationAngle(): number{
        return this.orientationAngle;
    }

    getMass(): number{
        return this.mass;
    }

    getLinearVelocity(): point{
        return this.linearVelocity;
    }

    getAngularVelocity(): number{
        return this.angularVelocity;
    }

    isStatic(): boolean{
        return this.isStaticBody;
    }

    isMovingStatic(): boolean {
        return this.isMovingStaticBody;
    }

    setLinearVelocity(linearVelocity: point): void {
        this.linearVelocity = linearVelocity;
    }

    setMovingStatic(movingStatic: boolean):void {
        this.isMovingStaticBody = movingStatic;
    }

    setOrientationAngle(angle: number): void{
        this.orientationAngle = angle;
    }

    setAngularVelocity(angularVelocity: number): void{
        this.angularVelocity = angularVelocity;
    }

    applyForce(force: point): void {
        this.force = force;
    }

    applyForceInOrientation(force: point | number): void {
        let forceTransformed: point;
        if (typeof force === "number") {
            forceTransformed = PointCal.rotatePoint({x: force, y: 0}, this.orientationAngle);
        } else {
            forceTransformed = PointCal.rotatePoint(force, this.orientationAngle);
        }
        this.applyForce(forceTransformed);
    }

    step(deltaTime: number): void {
        if (this.frictionEnabled) {
            if (this.isStatic()  || 
                (this.linearVelocity.x == 0 && 
                 this.linearVelocity.y == 0 && 
                 PointCal.magnitude(PointCal.subVector(this.force, {x: 0, y: 0})) >= 0 && 
                 PointCal.magnitude(this.force) < this.staticFrictionCoeff * this.mass * 9.81)
                ) {
                this.force = {x: 0, y: 0};
                return;
            }
            let kineticFrictionDirection = PointCal.multiplyVectorByScalar(PointCal.unitVector(this.linearVelocity), -1);
            let kineticFriction = PointCal.multiplyVectorByScalar(kineticFrictionDirection, this.dynamicFrictionCoeff * this.mass * 9.81);
            this.force = PointCal.addVector(this.force, kineticFriction);
        }
        if (PointCal.magnitude(this.linearVelocity) < PointCal.magnitude(PointCal.divideVectorByScalar(PointCal.multiplyVectorByScalar(this.force, deltaTime), this.mass))){
            this.linearVelocity = {x: 0, y: 0};
        }
        this.linearVelocity = PointCal.addVector(this.linearVelocity, PointCal.divideVectorByScalar(PointCal.multiplyVectorByScalar(this.force, deltaTime), this.mass));
        // if (PointCal.magnitude(PointCal.subVector(this.linearVelocity, {x: 0, y: 0})) <= 0.05) {
        //     this.linearVelocity = {x: 0, y: 0};
        // }
        this.center = PointCal.addVector(this.center, PointCal.multiplyVectorByScalar(this.linearVelocity, deltaTime));
        this.force = {x: 0, y: 0};
    }

    abstract getMinMaxProjection(unitvector: point): {min: number, max: number};
    abstract getCollisionAxes(relativeBody: RigidBody): point[];
    abstract getAABB(): {min: point, max: point};

}

export class Polygon extends BaseRigidBody {

    private vertices: point[];

    constructor(center: point = {x: 0, y: 0}, vertices: point[], orientationAngle: number = 0, mass: number = 50, isStatic: boolean = false, frictionEnabled: boolean = true) {
        super(center, orientationAngle, mass, isStatic, frictionEnabled);
        this.vertices = vertices;
        this.step = this.step.bind(this);
    }


    getVerticesAbsCoord(): point[]{
        return this.vertices.map(vertex=>{
            return PointCal.addVector(this.center, PointCal.rotatePoint(vertex, this.orientationAngle));
        });
    }

    getCollisionAxes(relativeBody: RigidBody): point[] {
        return this.getVerticesAbsCoord().map((vertex, index, absVertices)=>{
            let vector = PointCal.subVector(vertex, absVertices[absVertices.length - 1]);
            if (index > 0){
                vector = PointCal.subVector(vertex, absVertices[index - 1]); 
            }
            return PointCal.unitVector(PointCal.rotatePoint(vector, Math.PI / 2));
        });
    }

    getMinMaxProjection(unitvector: point): { min: number; max: number; } {
        let vertices = this.getVerticesAbsCoord();
        
        let projections = vertices.map( vertex => {
            return PointCal.dotProduct(vertex, unitvector);
        });

        
        return {min: Math.min(...projections), max: Math.max(...projections)};
    }

    getAABB(): { min: point; max: point; } {
        let points = this.getVerticesAbsCoord();
        let xCoords = points.map(vertex => vertex.x);
        let yCoords = points.map(vertex => vertex.y);
        return {min: {x: Math.min(...xCoords), y: Math.min(...yCoords)}, max: {x: Math.max(...xCoords), y: Math.max(...yCoords)}};
    }



}