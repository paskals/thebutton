var canvas;
var timerText;
var ctx;
var deadline;

var arcOffset = 1.5;

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

  let duration = 2000;
  let fps = 30;

  let delta = d.getTime() - deadline.getTime();
  let step = Math.ceil((delta/(duration/fps))/1200)*1200;
 
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

  var now = new Date();
  let result = {p_milli : 0, p_s : 0, p_m : 0, p_h : 0, s : 0, m : 0, h : 0};

  if(now.getTime() < deadline.getTime()) {
    result = getTimerFractions(now.getTime(), deadline.getTime());
  } else {
    window.dispatchEvent(timesUp)
  }

  ctx.clearRect(0,0,350,350);

  ctx.fillStyle = '#fcfcfc';
  ctx.font="20px Audiowide";
  timerText.innerHTML = ("00"+parseInt(result.h)).substr(-2) + ":" + ("00"+parseInt(result.m)).substr(-2) 
    + ":" + ("00"+parseInt(result.s)).substr(-2) + "." + ("00"+parseInt(result.p_milli*100)).substr(-2);

  // circles  

  ctx.strokeStyle = '#908594';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(175, 175, 100, Math.PI * arcOffset,
    getArcEnd(result.p_h)
  );
  ctx.stroke();

  ctx.strokeStyle = '#777E9E';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(175, 175, 110, Math.PI * arcOffset,
    getArcEnd(result.p_m)
  );
  ctx.stroke();

  ctx.strokeStyle = '#B5BDAF';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(175, 175, 118, Math.PI * arcOffset,
    getArcEnd(result.p_s)
  );
  ctx.stroke();

  ctx.strokeStyle = '#F1F3E3';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(175, 175, 124, Math.PI * arcOffset,
    getArcEnd(result.p_milli)
  );
  ctx.stroke();
  requestAnimationFrame(drawTimer);
}

function getTimerFractions(start, end) {
  milli = end - start;
  s = ((milli/1000)%60);
  m = ((milli/(60*1000))%60);
  h = ((milli/(60*60*1000))%24);
  return {
    p_milli : (milli%1000) / 1000,
    p_s : s / 60,
    p_m : m / 60,
    p_h : h / 24,
    s,
    m,
    h
  };
}

function getArcEnd(input) {
  return (Math.PI * 2) * (input) - Math.PI * (2 - arcOffset);
}