import ActionCanvas from './ActionCanvas';

class Test extends ActionCanvas {
    constructor() {
        let cv = document.createElement('canvas');
        document.body.append(cv);
        super(cv);
        cv.width = 300;
        cv.height = 300;
        cv.style.border = '1px solid black';
        cv.style.margin = '5px';

        let r = 50, x = 150, y = 150;
        let line = (x0, y0, x1, y1) => {
            this.cx.beginPath();
            this.cx.moveTo(x0, y0);
            this.cx.lineTo(x1, y1);
            this.cx.stroke();
        }

        this.onevent = (e) => {
            console.log(e.type, e.btn, e.drag);
            let col = 'black';

            switch (e.type) {
                case 'click':
                    col = 'green';
                    break;
                case 'press':
                    break;
                case 'move':
                    break;
                case 'release':
                    x += e.dx;
                    y += e.dy;
                    e.dx = 0;
                    e.dy = 0;
                    break;
                case 'zoom':
                    r += e.value;
                    break;
            }
            if (e.drag) col = 'red';
            this.cx.fillStyle = col;
            this.cx.clearRect(0, 0, this.cv.width, this.cv.height);
            line(e.x, 0, e.x, this.cv.height);
            line(0, e.y, this.cv.width, e.y);
            this.cx.fillRect(x + e.dx - r / 2, y + e.dy - r / 2, r, r);
        }

        // let span = document.createElement('div');
        // document.body.append(span);
        // this.debug = (e) => {
        //     span.innerText = (JSON.stringify(e) + '\n' + span.innerText).split('\n').slice(0, 10).join('\n');
        // }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new Test();
});