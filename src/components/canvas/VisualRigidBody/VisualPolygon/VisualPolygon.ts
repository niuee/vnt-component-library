import { BaseRigidBody, Polygon } from "../../../../2dphysics";
import { point } from "point2point";
import { VisualRigidBody } from "../VisualRigidBody";


export class VisualPolygon extends VisualRigidBody{
    private _rigidBody: Polygon;

    constructor(center: point, vertices: point[], orientationAngle: number = 0, mass: number = 50, isStatic: boolean = false, frictionEnabled: boolean = true) {
        super(center, orientationAngle, mass, isStatic, frictionEnabled);
        this._rigidBody = new Polygon(center, vertices, orientationAngle, mass, isStatic, frictionEnabled);
    }

    draw(context: CanvasRenderingContext2D): void {
        let points = this._rigidBody.getVerticesAbsCoord();
        context.lineWidth = 1;
        context.beginPath();
        points.forEach((point, index, array) => { 
            context.moveTo(point.x, point.y);
            if (index == points.length - 1) {
                // last one need to wrap to the first point
                context.lineTo(array[0].x, array[0].y);
            }else {
                context.lineTo(array[index + 1].x, array[index + 1].y);
            }
        });
        context.stroke();
        context.lineWidth = 1;
    }

    step(deltaTime: number): void {
        this._rigidBody.step(deltaTime);
    }

    getMinMaxProjection(unitvector: point): { min: number; max: number; } {
        return this._rigidBody.getMinMaxProjection(unitvector);
    }

    getCollisionAxes(relativeBody: BaseRigidBody): point[] {
        return this._rigidBody.getCollisionAxes(relativeBody);
    }

    applyForce(force: point): void {
        this._rigidBody.applyForce(force);
    }

    applyForceInOrientation(force: number | point): void {
        this._rigidBody.applyForceInOrientation(force);
    }

    getAABB(): { min: point; max: point; } {
        return this._rigidBody.getAABB();
    }

    getLinearVelocity(): point {
        return this._rigidBody.getLinearVelocity();
    }

    setLinearVelocity(linearVelocity: point): void {
        this._rigidBody.setLinearVelocity(linearVelocity);
    }

    move(delta: point): void {
        this._rigidBody.move(delta);
    }

}