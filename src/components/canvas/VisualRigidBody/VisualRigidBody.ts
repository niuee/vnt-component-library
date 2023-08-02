import { BaseRigidBody } from "../../../2dphysics";
import { CanvasUIComponent } from "../canvas";

export abstract class VisualRigidBody extends BaseRigidBody implements CanvasUIComponent {
    abstract draw(context: CanvasRenderingContext2D): void;
}