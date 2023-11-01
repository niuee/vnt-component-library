const template = document.createElement("template");
template.innerHTML = `
            <style>
                /* Your component's styles go here */
            </style>
            <div>
                <svg width="10vw" height="10vw">
                    <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="none"/>
                </svg>
            </div>
            `;

export class Dial extends HTMLElement{

    constructor(){
        super();
        const shadow = this.attachShadow({mode: "open"});
        shadow.append(template.content.cloneNode(true));
    }
}