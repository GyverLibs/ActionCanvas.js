import EventNode from "@alexgyver/eventnode";

class CanvasEvent extends Event {
    constructor(name, pos) {
        super(name);
        this.pos = pos;
    }
}

// addEventListener
// "press" - pos:{x, y}
// "release" - pos:{x, y, dx, dy}
// "click" - pos:{x, y}
// "move" - pos:{x, y, dx, dy, pressed}

export default class ActionCanvas extends EventNode {

    constructor(canvas, clickZone = 5, clickTout = 300) {
        super();
        this.cv = canvas;
        this.#clickZone = clickZone;
        this.#clickTout = clickTout;
        this.startEvents();
    }

    startEvents() {
        if ("ontouchstart" in document.documentElement) {
            this.#_touchstart = this.#touchstart.bind(this);
            this.#_touchmove = this.#touchmove.bind(this);
            this.#_touchend = this.#touchend.bind(this);
            this.cv.addEventListener("touchstart", this.#_touchstart, { passive: false });
            document.addEventListener("touchmove", this.#_touchmove, { passive: false });
            document.addEventListener("touchend", this.#_touchend);
        } else {
            this.#_mousedown = this.#mousedown.bind(this);
            this.#_mousemove = this.#mousemove.bind(this);
            this.#_mouseup = this.#mouseup.bind(this);
            this.cv.addEventListener("mousedown", this.#_mousedown);
            document.addEventListener("mousemove", this.#_mousemove);
            document.addEventListener("mouseup", this.#_mouseup);
        }
    }

    stopEvents() {
        if ("ontouchstart" in document.documentElement) {
            this.cv.removeEventListener("touchstart", this.#_touchstart, { passive: false });
            document.removeEventListener("touchmove", this.#_touchmove, { passive: false });
            document.removeEventListener("touchend", this.#_touchend);
        } else {
            this.cv.removeEventListener("mousedown", this.#_mousedown);
            document.removeEventListener("mousemove", this.#_mousemove);
            document.removeEventListener("mouseup", this.#_mouseup);
        }
    }

    // virtual
    onpress(xy) { }
    onrelease(xy) { }
    onclick(xy) { }
    onmove(xy) { }

    // private
    #press(xy) {
        document.body.style.userSelect = 'none';
        this.dispatchEvent(new CanvasEvent("press", xy));
        this.onpress(xy);
        this.#pressXY = xy;
        if (this.#tout) clearTimeout(this.#tout);
        this.#tout = setTimeout(() => this.#tout = null, this.#clickTout);
    }
    #touchstart(e) {
        e.preventDefault();
        this.#press(this.#touchXY(e));
    }
    #mousedown(e) {
        e.preventDefault();
        this.#press(this.#mouseXY(e));
    }

    #move(xy) {
        if (xy) {
            this.#makeDXY(xy);
            xy.pressed = !!this.#pressXY;
            this.dispatchEvent(new CanvasEvent("move", xy));
            this.onmove(xy);
        }
    }
    #touchmove(e) {
        e.preventDefault();
        this.#move(this.#touchXY(e));
    }
    #mousemove(e) {
        e.preventDefault();
        this.#move(this.#mouseXY(e));
    }

    #release(xy) {
        document.body.style.userSelect = '';
        if (xy && this.#pressXY) {
            this.#makeDXY(xy);
            this.dispatchEvent(new CanvasEvent("release", xy));
            this.onrelease(xy);
            if (this.#tout && Math.abs(xy.dx) < this.#clickZone && Math.abs(xy.dy) < this.#clickZone) {
                this.dispatchEvent(new CanvasEvent("click", xy));
                this.onclick(xy);
            }
        }
        this.#pressXY = null;
        if (this.#tout) clearTimeout(this.#tout);
    }
    #touchend(e) {
        e.preventDefault();
        this.#release(this.#touchXY(e));
    }
    #mouseup(e) {
        e.preventDefault();
        this.#release(this.#mouseXY(e));
    }

    #touchXY(e) {
        for (const t of e.changedTouches) {
            if (t.target === this.cv) return this.#makeXY(t.pageX, t.pageY);
        }
        return null;
    }
    #mouseXY(e) {
        return this.#makeXY(e.pageX, e.pageY);
    }
    #makeXY(x, y) {
        if (this.cv.offsetParent.tagName.toUpperCase() === "BODY") {
            x -= this.cv.offsetLeft;
            y -= this.cv.offsetTop;
        } else {
            x -= this.cv.offsetParent.offsetLeft;
            y -= this.cv.offsetParent.offsetTop;
        }
        return { x: x, y: y };
    }
    #makeDXY(xy) {
        if (this.#pressXY) {
            xy.dx = xy.x - this.#pressXY.x;
            xy.dy = xy.y - this.#pressXY.y;
        }
    }

    #pressXY = null;
    #tout = null;
    #clickZone;
    #clickTout;
    #_touchstart;
    #_touchmove;
    #_touchend;
    #_mousedown;
    #_mousemove;
    #_mouseup;
}