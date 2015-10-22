"use strict";

var gl;
var config = null;
var X_RESOLUTION = 640.0;
var Y_RESOLUTION = 480.0;
var RATIO = Y_RESOLUTION / X_RESOLUTION;

function Config() {
  this.iterations = 100;
  this.threshold = 4;
  this.x = -1.0;
  this.y = -1.0;
  this.scale = 1.0;
  this.redraw = function() {
    drawScene();
  }
}

function updateConfig(xm, ym, m) {
  config.x += xm * config.scale * (1.0 - m);
  config.y += ym * config.scale * (1.0 - m) * RATIO;
  config.scale *= m;
}

function initGUI() {
  config = new Config();
  var gui = new dat.GUI();
  var updater = function(_) {
    drawScene();
  }
  gui.add(config, 'iterations').min(0).max(1000).step(1).onChange(updater);
  gui.add(config, 'threshold').min(0).max(10).onChange(updater);
  gui.add(config, 'redraw');

  // gui.add(config, 'x').min(-10.0).max(10.0).step(0.001).listen().onChange(updater);
  // gui.add(config, 'y').min(-10.0).max(10.0).step(0.001).listen().onChange(updater);
  // gui.add(config, 'scale').min(0.1).max(10.0).step(0.001).listen().onChange(updater);

  var $glcanvas = $('#glcanvas');
  $glcanvas.bind('mousewheel', function(event) {
    var mult = (event.originalEvent.deltaY > 0)?1.3:0.7;
    updateConfig(event.offsetX / X_RESOLUTION, event.offsetY / Y_RESOLUTION, mult);
    drawScene();
  });
}

function start() {
  var canvas = document.getElementById("glcanvas");

  gl = initWebGL(canvas);
  initGUI();

  if (gl) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clear(gl.COLOR_BUFFER_BIT);
    initShaders();
    initBuffers();
    initTexture();
    drawScene();
  } else {
    alert("Unable to initialize WebGL. Your browser may not support it.");
  }
}

function initWebGL(canvas) {
  gl = null;
  try {
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  }
  catch(e) {}
  if (!gl) {
    gl = null;
  }
  return gl;
}

var vertexPositionAttribute = null;
var iterationsAttribute = null;
var thresholdAttribute = null;

var xAttribute = null;
var yAttribute = null;
var scaleAttribute = null;

function initShaders() {
  var fragmentShader = getShader(gl, "shader-fs");
  var vertexShader = getShader(gl, "shader-vs");

  var shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Unable to initialize the shader program.");
  }

  gl.useProgram(shaderProgram);

  vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  iterationsAttribute = gl.getUniformLocation(shaderProgram, "aIterations");
  thresholdAttribute = gl.getUniformLocation(shaderProgram, "aThreshold");

  xAttribute = gl.getUniformLocation(shaderProgram, "aX");
  yAttribute = gl.getUniformLocation(shaderProgram, "aY");
  scaleAttribute = gl.getUniformLocation(shaderProgram, "aScale");

  gl.enableVertexAttribArray(vertexPositionAttribute);
}

function getShader(gl, id) {
  var shaderScript = document.getElementById(id);

  if (!shaderScript) {
    console.log("Wrong shader id");
    return null;
  }

  var theSource = "";
  var currentChild = shaderScript.firstChild;

  while(currentChild) {
    if (currentChild.nodeType == 3) {
      theSource += currentChild.textContent;
    }

    currentChild = currentChild.nextSibling;
  }

  var shader;

  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, theSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

var horizAspect = 480.0 / 640.0;

var squareVerticesBuffer = null;

function initBuffers() {
  squareVerticesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);

  var vertices = [
    1.0,  1.0,
    -1.0, 1.0,
    1.0,  -1.0,
    -1.0, -1.0
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
}

function initTexture() {
  var winterTexture = gl.createTexture();

  var oneDTextureTexels = new Uint8Array([
      255,0,0,255,
      0,255,0,255,
      0,0,255,255,
  ]);

  gl.bindTexture(gl.TEXTURE_2D, winterTexture);
  var width = 256;
  var height = 1;
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,
    gl.RGBA, gl.UNSIGNED_BYTE, winterTextureArray);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function drawScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);
  gl.vertexAttribPointer(vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
  gl.uniform1i(iterationsAttribute, config.iterations);
  gl.uniform1f(thresholdAttribute, config.threshold);
  gl.uniform1f(xAttribute, config.x);
  gl.uniform1f(yAttribute, config.y);
  gl.uniform1f(scaleAttribute, config.scale);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
