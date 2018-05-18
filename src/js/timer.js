var canvas;
var timerText;
var ctx;
var deadline;

var PIXEL_RATIO = (function () {
  var ctx = document.createElement("canvas").getContext("2d"),
    dpr = window.devicePixelRatio || 1,
    bsr = ctx.webkitBackingStorePixelRatio ||
      ctx.mozBackingStorePixelRatio ||
      ctx.msBackingStorePixelRatio ||
      ctx.oBackingStorePixelRatio ||
      ctx.backingStorePixelRatio || 1;

  return dpr / bsr;
})();


createHiDPICanvas = function (w, h, ratio) {
  if (!ratio) { ratio = PIXEL_RATIO; }
  canvas.width = w * ratio;
  canvas.height = h * ratio;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  canvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
  return canvas;
}

function setupTimer() {
  var d = new Date();
  deadline = new Date(d.getTime());// + 1*60*1000);

  canvas = document.getElementById("timerCanvas");
  createHiDPICanvas(350, 350);

  ctx = canvas.getContext("2d");
  timerText = document.getElementById("timer-text");
  // ctx.width = 600;
  // ctx.height = 600;
  // ctx.textAlign(CENTER,CENTER);
  //pixelDensity(1);
  // ctx.frameRate(60);
  // textFont("Source Code Pro, Consolas, monospace");
  // background(0); 
}

function setDeadline(d) {
  if(d.getTime() == deadline.getTime()) {
    return;
  }
  let duration = 5000;
  let fps = 60;
  let delta = d.getTime() - deadline.getTime();
  let step = delta/(duration/fps);
  
  var interval = setInterval(function () {
    if(deadline.getTime() < d.getTime()) {
      deadline = new Date(deadline.getTime() + step);
    } else {
      deadline = d;
      clearInterval(interval);
    }

  }, 1000/fps);

  
}

function drawTimer() {

  // ctx.translate(ctx.width/2, ctx.height/2);
  // ctx.strokeRect();
  var now = new Date();
  var milli = 0, p_milli = 0, s = 0, p_s = 0, m = 0, p_m = 0, h = 0, p_h = 0;
  

  if(now.getTime() < deadline.getTime()) {
    milli = deadline.getTime() - now.getTime();
    p_milli = (milli%1000) / 1000;
    s = ((milli/1000)%60); //  + p_milli;
    p_s = s / 60;
    m = ((milli/(60*1000))%60); //  + p_s;
    p_m = m / 60;
    h = ((milli/(60*60*1000))%24); // + p_m;
    p_h = h / 24;
  }

  ctx.clearRect(0,0,350,350);

  // ctx.background(0);  
  // ctx.noStroke;
  // ctx.fill();
  // ctx.ellipse(0,0,170,170);  
  // // text
  // ctx.fill(196);
  ctx.fillStyle = '#fcfcfc';
  ctx.font="20px Audiowide";
  timerText.innerHTML = ("00"+parseInt(h)).substr(-2) + ":" + ("00"+parseInt(m)).substr(-2) 
    + ":" + ("00"+parseInt(s)).substr(-2) + "." + ("00"+parseInt(p_milli*100)).substr(-2);
  // ctx.fillText(("00"+parseInt(h)).substr(-2) + ":" + ("00"+parseInt(m)).substr(-2) 
  //   + ":" + ("00"+parseInt(s)).substr(-2) + "." + ("00"+parseInt(p_milli*100)).substr(-2),
  //   100,330);

  // circles  

  ctx.strokeStyle = 'rgb(180,60,160)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(175, 175, 100, Math.PI * 1.5,
    (Math.PI * 2) * (p_h) - Math.PI * 0.5
  );
  ctx.stroke();

  ctx.strokeStyle = 'rgb(180,160,250)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(175, 175, 111, Math.PI * 1.5,
    (Math.PI * 2) * (p_m) - Math.PI * 0.5
  );
  ctx.stroke();

  ctx.strokeStyle = 'rgb(60,160,180)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(175, 175, 120, Math.PI * 1.5,
    (Math.PI * 2) * (p_s) - Math.PI * 0.5
  );
  ctx.stroke();

  ctx.strokeStyle = 'rgb(80,120,200)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(175, 175, 127, Math.PI * 1.5,
    (Math.PI * 2) * (p_milli) - Math.PI * 0.5
  );
  ctx.stroke();


  requestAnimationFrame(drawTimer);
}