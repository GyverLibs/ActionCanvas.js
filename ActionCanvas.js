export default class ActionCanvas {

    constructor(canvas, clickZone = 5, clickTout = 300) {
        /** @type {Canvas} */
        this.cv = canvas;

        /** @type {CanvasRenderingContext2D} */
        this.cx = canvas.getContext("2d");

        this.#clickZone = clickZone;
        this.#clickTout = clickTout;
        this.startEvents();
    }

    startEvents() {
        if (this.#started) return;
        if ("ontouchstart" in document.documentElement) {
            this.#_touchstart = this.#touchstart.bind(this);
            this.#_touchmove = this.#touchmove.bind(this);
            this.#_touchend = this.#touchend.bind(this);
            this.cv.addEventListener("touchstart", this.#_touchstart, { passive: false });
            document.addEventListener("touchmove", this.#_touchmove, { passive: false });
            document.addEventListener("touchend", this.#_touchend, {});
        } else {
            this.#_mousedown = this.#mousedown.bind(this);
            this.#_mousemove = this.#mousemove.bind(this);
            this.#_mouseup = this.#mouseup.bind(this);
            this.#_wheel = this.#wheel.bind(this);
            this.cv.addEventListener("mousedown", this.#_mousedown);
            document.addEventListener("mousemove", this.#_mousemove);
            document.addEventListener("mouseup", this.#_mouseup);
            document.addEventListener("wheel", this.#_wheel, { passive: false });
        }
        this.#started = true;
    }

    stopEvents() {
        if (!this.#started) return;
        if ("ontouchstart" in document.documentElement) {
            this.cv.removeEventListener("touchstart", this.#_touchstart, { passive: false });
            document.removeEventListener("touchmove", this.#_touchmove, { passive: false });
            document.removeEventListener("touchend", this.#_touchend, {});
        } else {
            this.cv.removeEventListener("mousedown", this.#_mousedown);
            document.removeEventListener("mousemove", this.#_mousemove);
            document.removeEventListener("mouseup", this.#_mouseup);
            document.removeEventListener("wheel", this.#_wheel);
        }
        this.#started = false;
    }

    // "press" - {x, y, dx, dy, drag, btn}
    // "release" - {x, y, dx, dy, drag, btn}
    // "move" - {x, y, dx, dy, drag, zoom, btn}
    // "zoom" - {x, y, dx, dy, value, drag, cx, cy, btn}
    // "click" - {x, y, dx, dy, btn} - after release
    // btn: 1 LMB, 2 RMB, 4 MMB

    onevent(e) { }

    //#region handler
    #press(xy, btn = 0, tmode = null) {
        this.onevent({ type: "press", ...xy, dx: 0, dy: 0, drag: true, btn: btn, tmode: tmode });
    }
    #move(xy, prev, drag, btn = 0, tmode = null) {
        let dxy = this.#makeDXY(xy, prev);
        this.onevent({ type: "move", ...xy, ...dxy, drag: drag, btn: btn, tmode: tmode });
    }
    #release(xy, prev, btn = 0, tmode = null) {
        let dxy = this.#makeDXY(xy, prev);
        this.onevent({ type: "release", ...xy, ...dxy, drag: false, btn: btn, tmode: tmode });
    }
    #zoom(value, xy, prev, drag, cx, cy, btn = 0, tmode = null) {
        let dxy = this.#makeDXY(xy, prev);
        this.onevent({ type: "zoom", value: value, ...xy, ...dxy, drag: drag, cx: cx, cy: cy, btn: btn, tmode: tmode });
    }

    //#region touch
    #touchstart(e) {
        e.preventDefault();
        let tch = this.#filtTarget(e, this.cv);
        switch (tch.length) {
            case 1:
                this.#touch.push(tch[0]);
                this.#clickXY = tch[0].xy;
                this.#press(this.#touch[0].xy, 0, 1);
                this.#hyp = null;
                this.#restartClick();
                break;
            case 2:
                let swap = (this.#touch[0].id == tch[1].id);
                this.#touch.push(swap ? tch[0] : tch[1]);
                this.#touch[0] = swap ? tch[1] : tch[0];
                this.#press(this.#touch[0].xy, 0, 2);
                this.#hyp = null;
                break;
        }
    }
    #touchmove(e) {
        if (!this.#touch.length) return;
        e.preventDefault();
        let t0 = this.#filtID(e, this.#touch[0].id);

        if (this.#touch.length == 2) {
            this.#move(t0.xy, this.#touch[0].xy, true, 0, 2);
            this.#move(t0.xy, this.#clickXY, true, 0, 1);
            let t1 = this.#filtID(e, this.#touch[1].id);
            let dxy = this.#makeDXY(t1.xy, t0.xy);
            let hyp = Math.hypot(dxy.dx, dxy.dy);
            if (this.#hyp) {
                let cxy = [t0.xy.x + dxy.dx / 2, t0.xy.y + dxy.dy / 2];
                this.#zoom(hyp - this.#hyp, t0.xy, this.#touch[0].xy, true, ...cxy, 0, 2);
                this.#zoom(hyp - this.#hyp, t0.xy, this.#clickXY, true, ...cxy, 0, 1);
            }
            this.#hyp = hyp;
        } else {
            if (t0.changed) {
                this.#move(t0.xy, null, false, 0, 2);
                this.#move(t0.xy, this.#clickXY, true, 0, 1);
            }
        }
    }

    #touchend(e) {
        if (!this.#touch.length) return;
        e.preventDefault();

        let t0 = this.#filtID(e, this.#touch[0].id);

        if (this.#touch.length == 1) {
            if (t0.changed) {
                this.#release(t0.xy, this.#clickXY, 0, 1);
                this.#checkClick(t0.xy, this.#touch[0].xy);
                this.#touch.shift();
            }
        } else {
            let t1 = this.#filtID(e, this.#touch[1].id);
            if (t0.changed || t1.changed) {
                this.#release(t0.xy, this.#touch[0].xy, 0, 2);
            }
            if (t0.changed) {
                this.#clickXY = { x: this.#clickXY.x + t1.xy.x - t0.xy.x, y: this.#clickXY.y + t1.xy.y - t0.xy.y };
                this.#touch.shift();
            }
            if (t1.changed) {
                this.#touch.pop();
            }
        }
    }

    //#region mouse
    #mousedown(e) {
        e.preventDefault();
        this.#btn = e.buttons;
        this.#clickXY = this.#eXY(e);
        this.#press(this.#clickXY, e.buttons);
        this.#restartClick();
    }
    #mousemove(e) {
        if (this.#clickXY || e.target == this.cv) {
            e.preventDefault();
            this.#btn = e.buttons;
            this.#move(this.#eXY(e), this.#clickXY, !!this.#clickXY, this.#btn);
        }
    }
    #mouseup(e) {
        if (this.#clickXY) {
            e.preventDefault();
            let xy = this.#eXY(e);
            this.#release(xy, this.#clickXY, this.#btn);
            this.#checkClick(xy, this.#clickXY, this.#btn);
        }
        this.#btn = 0;
        this.#clickXY = null;
    }
    #wheel(e) {
        e.preventDefault();
        if (this.#clickXY || e.target == this.cv) {
            let xy = this.#eXY(e);
            this.#zoom(-e.deltaY / 10, xy, this.#clickXY, !!this.#clickXY, xy.x, xy.y, this.#btn);
        }
    }

    //#region utils
    #makeXY(x, y) {
        if (this.cv.offsetParent.tagName.toUpperCase() === "BODY") {
            x -= this.cv.offsetLeft;
            y -= this.cv.offsetTop;
        } else {
            x -= this.cv.offsetParent.offsetLeft;
            y -= this.cv.offsetParent.offsetTop;
        }
        return { x: Math.round(x), y: Math.round(y) };
    }
    #eXY(e) {
        return this.#makeXY(e.pageX, e.pageY);
    }
    #makeDXY(xy, prev) {
        return prev ? { dx: xy.x - prev.x, dy: xy.y - prev.y } : { dx: 0, dy: 0 };
    }

    #restartClick() {
        if (this.#tout) clearTimeout(this.#tout);
        this.#tout = setTimeout(() => this.#tout = null, this.#clickTout);
    }
    #checkClick(xy, prev, btn = 0) {
        let dxy = this.#makeDXY(xy, prev);
        if (this.#tout && Math.abs(dxy.dx) < this.#clickZone && Math.abs(dxy.dy) < this.#clickZone) {
            this.onevent({ type: "click", ...xy, dx: 0, dy: 0, btn: btn });
        }
        if (this.#tout) clearTimeout(this.#tout);
    }

    #getTouch(t) {
        return { id: t.identifier, xy: this.#eXY(t) };
    }
    #filtTarget(e, tar) {
        let touches = [];
        for (const t of e.touches) {
            if (t.target === tar) touches.push(this.#getTouch(t));
        }
        return touches;
    }
    #filtID(e, id) {
        for (const t of e.changedTouches) {
            if (t.identifier === id) {
                let touch = this.#getTouch(t);
                touch.changed = true;
                return touch;
            }
        }
        for (const t of e.touches) {
            if (t.identifier === id) {
                return this.#getTouch(t);
            }
        }
        return null;
    }

    #touch = [];
    #hyp;
    #btn = 0;
    #clickXY = null;
    #started = false;
    #tout = null;
    #clickZone;
    #clickTout;
    #_touchstart;
    #_touchmove;
    #_touchend;
    #_mousedown;
    #_mousemove;
    #_mouseup;
    #_wheel;
}