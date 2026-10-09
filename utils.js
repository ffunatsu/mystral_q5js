async function initCanvas(w, h){
    if( (w == null && h == null) || (typeof w === 'undefined' && typeof h === 'undefined')){
        await Canvas();
    }else{
        await Canvas(w, h);

        if(isMystral){
            if (window.innerWidth !== w || window.innerHeight !== h) {
                console.error(`Canvas/window size mismatch: window is ${window.innerWidth}x${window.innerHeight}, expected ${w}x${h}. Run with --width ${w} --height ${h}.`);
                process.exit(1);
            }
        }
    }
}

globalThis.initCanvas = initCanvas;