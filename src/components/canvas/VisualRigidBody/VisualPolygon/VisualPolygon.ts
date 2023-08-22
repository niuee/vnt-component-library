import { BaseRigidBody, Polygon } from "../../../../2dphysics";
import { PointCal, point } from "point2point";
import { VisualRigidBody } from "../VisualRigidBody";


export class VisualPolygon extends VisualRigidBody{

    constructor(center: point, vertices: point[], orientationAngle: number = 0, mass: number = 50, isStatic: boolean = false, frictionEnabled: boolean = true) {
        super(center, orientationAngle, mass, isStatic, frictionEnabled);
        this._rigidBody = new Polygon(center, vertices, orientationAngle, mass, isStatic, frictionEnabled);
    }

    draw(context: CanvasRenderingContext2D): void {
        let body = this._rigidBody as Polygon;
        let points = body.getVerticesAbsCoord();
        context.lineWidth = 1;
        context.beginPath();
        context.lineJoin = "round";

        if (points.length >= 0) {
            context.moveTo(points[0].x, -points[0].y);
        }

        points.forEach((point, index, array) => { 
            if (index == points.length - 1) {
                // last one need to wrap to the first point
                context.lineTo(array[0].x, -array[0].y);
            }else {
                context.lineTo(array[index + 1].x, -array[index + 1].y);
            }
        });
        context.closePath();
        context.stroke();
        context.lineWidth = 1;
        context.lineJoin = "miter";
    }

    raycast(cursorPosition: point): boolean {
        cursorPosition.y = -cursorPosition.y;
        let body = this._rigidBody as Polygon;
        
        let points = body.getVerticesAbsCoord();
        let angleCheck = points.map((point, index, array)=>{
            let endPoint: point;
            if (index == points.length - 1) {
                // last one need to wrap to the first point
                endPoint = array[0];
            }else {
                endPoint = array[index + 1];
            }
            let baseVector = PointCal.subVector(endPoint, point);
            let checkVector = PointCal.subVector(cursorPosition, point);
            return PointCal.angleFromA2B(baseVector, checkVector);
        });
        let outOfPolygon = angleCheck.filter((angle)=>{
            return angle > 0;
        }).length > 0;
        return !outOfPolygon;
    }


}