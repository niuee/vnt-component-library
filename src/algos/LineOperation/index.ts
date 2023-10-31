import { PointCal, point } from "point2point";


class Line {
    private startPoint: point;
    private endPoint: point;

    constructor(startPoint: point, endPoint: point){
        this.startPoint = startPoint;
        this.endPoint = endPoint;
    }

    getStartPoint(): point{
        return this.startPoint;
    }

    getEndPoint(): point{
        return this.endPoint;
    }

    intersectionWithAnotherLine(lineToIntersect: Line){
        return getLineIntersection(this.startPoint, this.endPoint, lineToIntersect.getStartPoint(), lineToIntersect.getEndPoint());
    }

    projectPointOnSelf(point: point){
        return projectPointOntoLine(point, this.getStartPoint(), this.getEndPoint());
    }
}

export function getLineIntersection(startPoint: point, endPoint: point, startPoint2: point, endPoint2: point):{
    intersects: boolean,
    intersection: point,
    offset: number
}{
    const numerator = (endPoint2.x - startPoint2.x) * (startPoint.y - startPoint2.y) - (endPoint2.y - startPoint2.y) * (startPoint.x - startPoint2.x);
    const denominator = (endPoint2.y - startPoint2.y) * (endPoint.x - startPoint.x) - (endPoint2.x - startPoint2.x) * (endPoint.y - startPoint.y);
    
    if (denominator === 0){
        return {intersects: false, intersection: null, offset: null};
    }
    const t = numerator / denominator;
    if (t >= 0 && t <= 1){
        return {
            intersects: true, 
            intersection: PointCal.linearInterpolation(startPoint, endPoint, t),
            offset: t
        }
    } else {
        return {
            intersects: false,
            intersection: null,
            offset: null
        }
    }

}

export function projectPointOntoLine(point: point, lineStartPoint: point, lineEndPoint: point): {
    within: boolean,
    projectionPoint: point,
    offset: number
}{
    const baseVector = PointCal.unitVector(PointCal.subVector(lineEndPoint, lineStartPoint));
    const vectorToPoint = PointCal.subVector(point, lineStartPoint);
    const res = PointCal.dotProduct(vectorToPoint, baseVector);
    if (res < 0 || res > PointCal.magnitude(PointCal.subVector(lineEndPoint, lineStartPoint))){
        return {
            within: false,
            projectionPoint: null,
            offset: null
        };
    }
    return {
        within: true,
        projectionPoint: PointCal.addVector(lineStartPoint, PointCal.multiplyVectorByScalar(baseVector, res)),
        offset: res / PointCal.magnitude(PointCal.subVector(lineEndPoint, lineStartPoint))
    };

}