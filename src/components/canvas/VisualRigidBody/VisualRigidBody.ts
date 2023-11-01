import { point } from "point2point";
import { BaseRigidBody } from "../../../2dphysics";
import { UIComponent } from "../canvas";

export abstract class VisualRigidBody extends BaseRigidBody implements UIComponent {
    protected _rigidBody: BaseRigidBody;

    abstract draw(context: CanvasRenderingContext2D, cameraZoom: number): void;
    abstract raycast(cursorPosition: point): boolean;
    abstract getLargestDimension(): number;

    step(deltaTime: number): void{
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
    
    getCenter(): point {
        return this._rigidBody.getCenter();
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

    setAngularVelocity(angularVelocity: number): void {
        this._rigidBody.setAngularVelocity(angularVelocity);
    }

    move(delta: point): void {
        this._rigidBody.move(delta);
    }

    rotateRadians(angle: number): void {
        this._rigidBody.rotateRadians(angle);
    }

    getMass(): number {
        return this._rigidBody.getMass();
    }

    getOrientationAngle(): number {
        return this._rigidBody.getOrientationAngle();
    }

    setOrientationAngle(angle: number): void {
        this._rigidBody.setOrientationAngle(angle);
    }
}