import { UIComponent } from "components"
import { Bezier, Point } from "bezier-js"

export function placeHolder(){}


export class Track implements UIComponent{

    private _internBCurve: Bezier;

    constructor(controlPoint1: Point, controlPoint2: Point, controlPoint3: Point, controlPoint4: Point){
        this._internBCurve = new Bezier(controlPoint1, controlPoint2, controlPoint3, controlPoint4);
    }

    draw(ctx: CanvasRenderingContext2D){
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (this._internBCurve.points.length === 3){
            // quadratic bezier curve
            ctx.moveTo(this._internBCurve.point(0).x, -this._internBCurve.point(0).y);
            ctx.quadraticCurveTo(
                this._internBCurve.point(1).x, -this._internBCurve.point(1).y,
                this._internBCurve.point(2).x, -this._internBCurve.point(2).y
            );
            ctx.stroke();
        } else {
            // cubic bezier curve
            ctx.moveTo(this._internBCurve.point(0).x, -this._internBCurve.point(0).y);
            ctx.bezierCurveTo(
                this._internBCurve.point(1).x, -this._internBCurve.point(1).y,
                this._internBCurve.point(2).x, -this._internBCurve.point(2).y,
                this._internBCurve.point(3).x, -this._internBCurve.point(3).y
            );
            ctx.stroke();
        }
    }
}