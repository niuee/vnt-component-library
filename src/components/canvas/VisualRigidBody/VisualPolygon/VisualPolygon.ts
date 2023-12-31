import { BaseRigidBody, Polygon } from "../../../../2dphysics";
import { PointCal, point } from "point2point";
import { VisualRigidBody } from "../VisualRigidBody";

export class VisualPolygon extends VisualRigidBody{

    private lineWidth: number = 0.3;

    constructor(center: point, vertices: point[], orientationAngle: number = 0, mass: number = 50, isStatic: boolean = false, frictionEnabled: boolean = true, lineWidth: number = 0.3) {
        super(center, orientationAngle, mass, isStatic, frictionEnabled);
        this._rigidBody = new Polygon(center, vertices, orientationAngle, mass, isStatic, frictionEnabled);
        this.lineWidth = lineWidth;
    }

    draw(context: CanvasRenderingContext2D, cameraZoom: number): void {
        let body = this._rigidBody as Polygon;
        let points = body.getVerticesAbsCoord();
        let center = body.getCenter();
        let orientationAngle = body.getOrientationAngle();

        let endPoint = PointCal.addVector(center, PointCal.rotatePoint({x: 10, y: 0}, orientationAngle));
        context.beginPath();
        context.moveTo(center.x, -center.y);
        context.lineTo(endPoint.x, -endPoint.y);
        context.stroke();

        context.beginPath();
        context.arc(center.x, -center.y, 1, 0, 2 * Math.PI);
        context.stroke();
        context.lineWidth = this.lineWidth;
        context.beginPath();
        context.lineJoin = "round";

        if (points.length > 0) {
            context.moveTo(points[0].x, -points[0].y);
        }

        points.forEach((point, index, array) => { 
            if (index < points.length - 1){
                context.lineTo(array[index + 1].x, -array[index + 1].y);
            }
        });
        context.closePath();
        context.stroke();
        context.lineWidth = 1;
        context.lineJoin = "miter";
    }

    getLargestDimension(): number {
        let body = this._rigidBody as Polygon;
        let points = body.getVerticesAbsCoord();
        let res = 0;
        points.forEach((point, index, array) => { 
            if (index < points.length - 1){
                res = Math.max(res, PointCal.distanceBetweenPoints(array[index], array[index + 1]));
            }
        });

        return res;
    }

    raycast(cursorPosition: point): boolean {
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

    getVertices(){
        let body = this._rigidBody as Polygon;
        return body.getVerticesAbsCoord();
    }

}