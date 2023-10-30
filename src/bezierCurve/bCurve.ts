import { PointCal, point } from "point2point"

const T = [
    -0.0640568928626056260850430826247450385909,
    0.0640568928626056260850430826247450385909,
    -0.1911188674736163091586398207570696318404,
    0.1911188674736163091586398207570696318404,
    -0.3150426796961633743867932913198102407864,
    0.3150426796961633743867932913198102407864,
    -0.4337935076260451384870842319133497124524,
    0.4337935076260451384870842319133497124524,
    -0.5454214713888395356583756172183723700107,
    0.5454214713888395356583756172183723700107,
    -0.6480936519369755692524957869107476266696,
    0.6480936519369755692524957869107476266696,
    -0.7401241915785543642438281030999784255232,
    0.7401241915785543642438281030999784255232,
    -0.8200019859739029219539498726697452080761,
    0.8200019859739029219539498726697452080761,
    -0.8864155270044010342131543419821967550873,
    0.8864155270044010342131543419821967550873,
    -0.9382745520027327585236490017087214496548,
    0.9382745520027327585236490017087214496548,
    -0.9747285559713094981983919930081690617411,
    0.9747285559713094981983919930081690617411,
    -0.9951872199970213601799974097007368118745,
    0.9951872199970213601799974097007368118745,
];

const C = [
    0.1279381953467521569740561652246953718517,
    0.1279381953467521569740561652246953718517,
    0.1258374563468282961213753825111836887264,
    0.1258374563468282961213753825111836887264,
    0.121670472927803391204463153476262425607,
    0.121670472927803391204463153476262425607,
    0.1155056680537256013533444839067835598622,
    0.1155056680537256013533444839067835598622,
    0.1074442701159656347825773424466062227946,
    0.1074442701159656347825773424466062227946,
    0.0976186521041138882698806644642471544279,
    0.0976186521041138882698806644642471544279,
    0.086190161531953275917185202983742667185,
    0.086190161531953275917185202983742667185,
    0.0733464814110803057340336152531165181193,
    0.0733464814110803057340336152531165181193,
    0.0592985849154367807463677585001085845412,
    0.0592985849154367807463677585001085845412,
    0.0442774388174198061686027482113382288593,
    0.0442774388174198061686027482113382288593,
    0.0285313886289336631813078159518782864491,
    0.0285313886289336631813078159518782864491,
    0.0123412297999871995468056670700372915759,
    0.0123412297999871995468056670700372915759,
];

export abstract class BCurveTemplate{

    protected controlPoints: point[];
    protected dCurve: dBCurve;
    protected dControlPoints: point[];

    abstract get(t: number): point;
    abstract calLength(): number;
    
    constructor(controlPoints: point[]){
        this.controlPoints = controlPoints;
    }

    // calculate the point coordinate at t using the de Casteljau's algorithm
    compute(t: number): point{
        let points = this.controlPoints;
        while (points.length > 1) {
            let lowerLevelPoints = points.slice(1);
            for(let index = 0; index < lowerLevelPoints.length; index++){
                lowerLevelPoints[index] = PointCal.addVector(PointCal.multiplyVectorByScalar(points[index], (1 - t)), PointCal.multiplyVectorByScalar(points[index + 1], t));
            }
            points = lowerLevelPoints;
        }
        return points[0];
    };

    setControlPoint(index: number, dest: point) {
        if (index < 0 || index >= this.controlPoints.length) {
            return;
        }
        this.controlPoints[index] = dest;
        if (index - 1 >= 0) {
            this.dCurve.setControlPoint(index - 1, PointCal.multiplyVectorByScalar(PointCal.subVector(this.controlPoints[index], this.controlPoints[index - 1]), this.dControlPoints.length));
        }
        if (index + 1 <= this.controlPoints.length - 1){
            this.dCurve.setControlPoint(index, PointCal.multiplyVectorByScalar(PointCal.subVector(this.controlPoints[index + 1], this.controlPoints[index]), this.dControlPoints.length));
        }

        this.update()
    }

    update(){

    }
    
}


export class BCurve extends BCurveTemplate {

    constructor(controlPoints: point[]){
        super(controlPoints);
        this.dControlPoints = [];
        for(let index = 1; index < this.controlPoints.length; index++){
            this.dControlPoints.push(PointCal.multiplyVectorByScalar(PointCal.subVector(this.controlPoints[index], this.controlPoints[index - 1]), this.controlPoints.length - 1));
        }
        this.dCurve = new dBCurve(this.dControlPoints);
    }

    get(t: number): point{
        if (this.controlPoints.length == 3) {
            let firstTerm = PointCal.multiplyVectorByScalar(this.controlPoints[0], (1 - t) * (1 - t));
            let secondTerm = PointCal.multiplyVectorByScalar(this.controlPoints[1], 2 * (1 - t) * t);
            let thirdTerm = PointCal.multiplyVectorByScalar(this.controlPoints[2], t * t);
            let res = PointCal.addVector(PointCal.addVector(firstTerm, secondTerm), thirdTerm);
            return res;
        }
        if (this.controlPoints.length == 4){
            let firstTerm = PointCal.multiplyVectorByScalar(this.controlPoints[0], (1 - t) * (1 - t) * (1 - t));
            let secondTerm = PointCal.multiplyVectorByScalar(this.controlPoints[1], 3 * (1 - t) * (1 - t) * t);
            let thirdTerm = PointCal.multiplyVectorByScalar(this.controlPoints[2], 3 * (1 - t) * t * t);
            let forthTerm = PointCal.multiplyVectorByScalar(this.controlPoints[3], t * t * t);
            let res = PointCal.addVector(PointCal.addVector(firstTerm, secondTerm), PointCal.addVector(thirdTerm, forthTerm));
            return res;
        }
        return this.compute(t);
    }

    calLength(): number {
        return this.calLengthAtT(1);
    }

    calLengthAtT(tVal: number): number{
        const z = tVal / 2, len = T.length;
        let sum = 0;
        for (let i = 0, t: number; i < len; i++) {
            t = z * T[i] + z;
            sum += C[i] * PointCal.magnitude(this.derivative(t));
        }
        return z * sum;
    }

    derivative(t: number): point{
        return this.dCurve.get(t);
    }

    tangent(t: number): point{
        return PointCal.unitVector(this.dCurve.get(t));
    }
}

export class dBCurve {
    private controlPoints: point[];

    constructor(controlPoints: point[]){
        this.controlPoints = controlPoints;
    }

    get(t: number): point{
        if (this.controlPoints.length == 3) {
            let firstTerm = PointCal.multiplyVectorByScalar(this.controlPoints[0], (1 - t) * (1 - t));
            let secondTerm = PointCal.multiplyVectorByScalar(this.controlPoints[1], 2 * (1 - t) * t);
            let thirdTerm = PointCal.multiplyVectorByScalar(this.controlPoints[2], t * t);
            let res = PointCal.addVector(PointCal.addVector(firstTerm, secondTerm), thirdTerm);
            return res;
        }
        if (this.controlPoints.length == 4){
            let firstTerm = PointCal.multiplyVectorByScalar(this.controlPoints[0], (1 - t) * (1 - t) * (1 - t));
            let secondTerm = PointCal.multiplyVectorByScalar(this.controlPoints[1], 3 * (1 - t) * (1 - t) * t);
            let thirdTerm = PointCal.multiplyVectorByScalar(this.controlPoints[2], 3 * (1 - t) * t * t);
            let forthTerm = PointCal.multiplyVectorByScalar(this.controlPoints[3], t * t * t);
            let res = PointCal.addVector(PointCal.addVector(firstTerm, secondTerm), PointCal.addVector(thirdTerm, forthTerm));
            return res;
        }
        return this.compute(t);
    }

    compute(t: number): point{
        let points = this.controlPoints;
        while (points.length > 1) {
            let lowerLevelPoints = points.slice(1);
            for(let index = 0; index < lowerLevelPoints.length; index++){
                lowerLevelPoints[index] = PointCal.addVector(PointCal.multiplyVectorByScalar(points[index], (1 - t)), PointCal.multiplyVectorByScalar(points[index + 1], t));
            }
            points = lowerLevelPoints;
        }
        return points[0];
    };

    setControlPoint(index: number, dest: point) {
        if (index < 0 || index >= this.controlPoints.length) {
            return;
        }
        this.controlPoints[index] = dest;
    }
}