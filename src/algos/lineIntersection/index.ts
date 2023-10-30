import { PointCal, point } from "point2point";

export function PlaceHolder(){};

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