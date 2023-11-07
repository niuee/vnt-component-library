const template = document.createElement("template");
template.innerHTML = `
            <style>
                /* Your component's styles go here */
            </style>
            <div>
                <svg width="10vw" height="10vw">
                    <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="none"/>
                    <path data="M 50 50 L 50 10" stroke="black" stroke-width="3"/>
                    <path d="M 50 50 L 50 10" stroke="black" fill="transparent"/>
                </svg>
            </div>
            `;

export class Dial extends HTMLElement{

    private svg;
    static observedAttributes = ["width", "height"];

    constructor(){
        super();
        const shadow = this.attachShadow({mode: "open"});
        shadow.append(template.content.cloneNode(true));
    }

    attributeChangedCallback(name, oldValue, newValue) {
        console.log(`Attribute ${name} has changed.`);
        let svg = this.shadowRoot.querySelector("svg");
        if (name == "width" || name == "height"){
            svg.setAttribute(name, newValue);
        }
    }
}