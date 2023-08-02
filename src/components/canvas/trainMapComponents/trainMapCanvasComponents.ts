import { BaseCanvasUIComponent } from "../canvas";



export class StationComponent extends BaseCanvasUIComponent {

    private stationName: string;
    private stationID: string;
    private line: string;
    
    constructor(){
        super();
        
    }

    draw(context: CanvasRenderingContext2D): void {
        context.beginPath();
        context.strokeStyle = "blue";
        context.lineWidth = 3;
        context.roundRect(0, 0, 50, 70, 5);
        context.stroke();
    }
}