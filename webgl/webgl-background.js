(function () {
  "use strict";
  const host = document.getElementById("canvasShell");
  const svg = document.getElementById("canvas");
  if (!host || !svg) return;
  const canvas = document.createElement("canvas");
  canvas.id = "webglBackground";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0";
  svg.style.position = "relative";
  svg.style.zIndex = "1";
  host.insertBefore(canvas, svg);
  const svgGrid = document.getElementById("grid");
  if (svgGrid) svgGrid.style.opacity = "0";
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) return;
  const vertex = "attribute vec2 p; void main(){ gl_Position=vec4(p,0.0,1.0); }";
  const fragment = "precision mediump float; uniform vec2 resolution; void main(){ vec2 px=gl_FragCoord.xy; float gx=step(0.94, fract(px.x/24.0)); float gy=step(0.94, fract(px.y/24.0)); float line=max(gx,gy); vec3 base=vec3(1.0,0.985,0.995); vec3 tint=vec3(0.945,0.91,0.94); gl_FragColor=vec4(mix(base,tint,line*0.8),1.0); }";
  function compile(type, source) { const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader); return shader; }
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program); gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const location = gl.getAttribLocation(program, "p"); gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
  function draw() { const rect = host.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1); canvas.width = Math.max(1, Math.floor(rect.width * dpr)); canvas.height = Math.max(1, Math.floor(rect.height * dpr)); gl.viewport(0, 0, canvas.width, canvas.height); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
  new ResizeObserver(draw).observe(host); window.addEventListener("resize", draw); draw();
}());
