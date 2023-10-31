import { point } from "point2point";
import { UIComponent } from "../canvas";



export class StationComponent implements UIComponent {

    private stationName: string;
    private stationID: string;
    private line: string;
    
    constructor(){
        
    }

    draw(context: CanvasRenderingContext2D, cameraZoom: number): void {
        context.beginPath();
        context.strokeStyle = "blue";
        context.lineWidth = 3;
        context.roundRect(0, 0, 50, 70, 5);
        context.stroke();
    }

    raycast(cursorPosition: point): boolean {
        return true;
    }
}