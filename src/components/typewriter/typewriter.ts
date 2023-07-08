
type typeWriterProps = {
    typeOutStringArray?: singleString[];
}


type singleString = {
    language: string;
    str: string;
}

export class TypeWriterComponent extends HTMLElement{

    private typeOutString: {language: string, str: string}[];
    private typeWriter: TypeWriter;
    private shadow: ShadowRoot;

    constructor(){
        super();
        this.typeOutString = [
                        {language: "python", str:"print(about_me)"}, 
                        {language: "javascript", str: "console.log(aboutMe);"},
                        {language: "go", str: "fmt.Println(aboutMe)"}, 
                        {language: "cpp", str: "std::cout<<aboutMe<<std::endl;"}, 
                    ];
        this.typeWriter = new TypeWriter(this.typeOutString);
        this.shadow = this.attachShadow({mode: "open"});
        let codeElement = document.createElement("code");
        codeElement.className = "typewrite"
        let spanElement = document.createElement("span");
        spanElement.className = "test";
        codeElement.appendChild(spanElement);
        this.shadow.append(codeElement);


    }


    connectedCallback(){
        console.log(this.shadow);
        this.typeWriter.step(this.shadow);
    }

    disconnectedCallback() {
       this.typeWriter.clearTypeTimeOut(); 
    }

}


class TypeWriter {
    private currentStringIndex: number;
    private rotatingStrings: {language: string, str:string}[];
    private currentRenderedString: string;
    private currentFullString: string;
    private isDeletingString: boolean;
    private timeOut: NodeJS.Timeout;
    private loop: boolean = true;

    constructor(rotatingStrings: {language: string, str: string}[], loop=true){
        if (rotatingStrings.length <= 0) {
            this.rotatingStrings = [{language: "none", str:"test string"}]
        } else {
            this.rotatingStrings = rotatingStrings;
        }
        this.currentStringIndex = 0;
        this.currentFullString = this.rotatingStrings[this.currentStringIndex].str;
        this.currentRenderedString = "";
        this.loop = loop;
    }

    step(shadow: ShadowRoot):void{
        // console.log("typewriter", this)
        if (this.isDeletingString){
            if (this.currentFullString.substring(this.currentRenderedString.length - 4, this.currentRenderedString.length) === "&lt;"){
                this.currentRenderedString = this.currentFullString.substring(0, this.currentRenderedString.length - 4);
            } else {
                this.currentRenderedString = this.currentFullString.substring(0, this.currentRenderedString.length - 1);
            }
        } else {
            if (this.currentFullString.substring(this.currentRenderedString.length, this.currentRenderedString.length + 4) === "&lt;"){
                this.currentRenderedString = this.currentFullString.substring(0, this.currentRenderedString.length + 4);
            } else {
                this.currentRenderedString = this.currentFullString.substring(0, this.currentRenderedString.length + 1);
            }
        }
        
        let outterAnchor = shadow.querySelector(".typewrite");
        if (outterAnchor) {
            let wrap = outterAnchor.querySelector(".test");
            if (wrap != null) {
                wrap.innerHTML = this.currentRenderedString;
            }
        }


        var delta = 150 - Math.random() * 100;

        if (this.isDeletingString) { delta /= 2; }

        if (!this.isDeletingString && this.currentRenderedString === this.currentFullString) {
            
            delta = 1000;
            this.isDeletingString = true;
        } else if (this.isDeletingString && this.currentRenderedString === '') {
            this.isDeletingString = false;
            this.stepString();
            delta = 700;
        }
        this.timeOut = setTimeout(this.step.bind(this, shadow), delta);
    }

    clearTypeTimeOut(){
        clearTimeout(this.timeOut);
    }

    stepString(){
        if (this.loop){
            this.currentStringIndex = (this.currentStringIndex + 1) % this.rotatingStrings.length;
            this.currentFullString = this.rotatingStrings[this.currentStringIndex].str;
        }
    }
}