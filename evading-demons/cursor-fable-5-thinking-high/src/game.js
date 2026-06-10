/*
 * SUNSPIRE GALLERIA — evading-demons submission (cursor + fable-5-thinking-high)
 *
 * Third-person survival in a solarpunk shopping mall. Daylight is safe and
 * green; when the atrium tips into a space-like night, rifts open and demons
 * pour out. Touch = death. Survive as many nights as you can.
 *
 * Controls: Arrow keys / WASD to run, Space to jump, R to restart.
 */
(function () {
  "use strict";

  // ------------------------------------------------------------------
  // Tunables
  // ------------------------------------------------------------------
  var MALL_X = 44; // half-extent, x
  var MALL_Z = 23; // half-extent, z
  var ROOF_Y = 13;

  var PLAYER_RADIUS = 0.5;
  var PLAYER_SPEED = 9.6;
  var JUMP_VELOCITY = 8.6;
  var GRAVITY = 22;

  var DEMON_RADIUS = 0.62;
  var DEMON_BASE_SPEED = 7.4;
  var DEMON_SPEED_PER_NIGHT = 0.4;
  var DEMON_SPEED_MAX = 9.1;
  var KILL_DIST = 1.02; // horizontal
  var KILL_MAX_PLAYER_Y = 1.32; // jump over a demon at the apex

  var CYCLE = 56; // seconds for a full day+night
  var START_T01 = 0.05; // begin mid-morning
  // debug/eval helpers: ?t=0.6 starts at night, ?demons=4 pre-spawns demons
  var QS = new URLSearchParams(window.location.search);
  var tOverride = parseFloat(QS.get("t"));
  if (!isNaN(tOverride)) START_T01 = Math.max(0, Math.min(0.99, tOverride));
  // phase boundaries within the 0..1 cycle
  var DUSK_A = 0.40, DUSK_B = 0.50, DAWN_A = 0.93;
  var DEMON_LIGHT_THRESHOLD = 0.32; // demons exist below this light level
  var SPAWN_INTERVAL = 2.2;

  // ------------------------------------------------------------------
  // Renderer / scene
  // ------------------------------------------------------------------
  var canvas = document.getElementById("game");
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfeae2, 70, 190);

  var camera = new THREE.PerspectiveCamera(
    58, window.innerWidth / window.innerHeight, 0.1, 600
  );

  window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ------------------------------------------------------------------
  // Palette keyframes (day <-> night)
  // ------------------------------------------------------------------
  var COL = {
    skyDay: new THREE.Color(0xbde7f2),
    skyNight: new THREE.Color(0x040312),
    fogDay: new THREE.Color(0xcfeae2),
    fogNight: new THREE.Color(0x0a0618),
    hemiSkyDay: new THREE.Color(0xeafff2),
    hemiSkyNight: new THREE.Color(0x1b1440),
    hemiGroundDay: new THREE.Color(0x9fbf9a),
    hemiGroundNight: new THREE.Color(0x120a20),
  };
  var _sky = new THREE.Color();

  // ------------------------------------------------------------------
  // Lights
  // ------------------------------------------------------------------
  var hemi = new THREE.HemisphereLight(0xeafff2, 0x9fbf9a, 0.85);
  scene.add(hemi);

  var sun = new THREE.DirectionalLight(0xffe9c2, 1.25);
  sun.position.set(28, 46, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -52;
  sun.shadow.camera.right = 52;
  sun.shadow.camera.top = 34;
  sun.shadow.camera.bottom = -34;
  sun.shadow.camera.near = 5;
  sun.shadow.camera.far = 130;
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  scene.add(sun.target);

  var moon = new THREE.DirectionalLight(0x8fa8ff, 0.0);
  moon.position.set(-30, 40, -20);
  scene.add(moon);

  // ------------------------------------------------------------------
  // Canvas-texture helpers
  // ------------------------------------------------------------------
  function makeCanvas(w, h, draw) {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  var floorTex = makeCanvas(512, 512, function (g, w, h) {
    g.fillStyle = "#cfc6ad";
    g.fillRect(0, 0, w, h);
    var specks = ["#c4d2c0", "#a7c2a0", "#d8c8a6", "#9cb7b4", "#e9d3b0"];
    for (var i = 0; i < 900; i++) {
      g.fillStyle = specks[(Math.random() * specks.length) | 0];
      var r = 1 + Math.random() * 3.2;
      g.beginPath();
      g.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = "rgba(120,128,110,0.55)";
    g.lineWidth = 3;
    for (var k = 0; k <= 4; k++) {
      g.beginPath(); g.moveTo((w / 4) * k, 0); g.lineTo((w / 4) * k, h); g.stroke();
      g.beginPath(); g.moveTo(0, (h / 4) * k); g.lineTo(w, (h / 4) * k); g.stroke();
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(16, 8);

  var gardenTex = makeCanvas(256, 256, function (g, w, h) {
    g.fillStyle = "#1f4a2c";
    g.fillRect(0, 0, w, h);
    var greens = ["#2f6b3a", "#3f8a46", "#56a352", "#7cbf6a", "#23583a", "#94d07f"];
    for (var i = 0; i < 650; i++) {
      g.fillStyle = greens[(Math.random() * greens.length) | 0];
      var r = 3 + Math.random() * 9;
      g.beginPath();
      g.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2);
      g.fill();
    }
  });

  function signTexture(name, hue) {
    return makeCanvas(512, 128, function (g, w, h) {
      var grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "hsl(" + hue + ",45%,16%)");
      grad.addColorStop(1, "hsl(" + hue + ",55%,9%)");
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "hsl(" + hue + ",80%,62%)";
      g.lineWidth = 6;
      g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = "hsl(" + hue + ",90%,72%)";
      g.font = "bold 56px Futura, 'Avenir Next', 'Trebuchet MS', sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(name, w / 2, h / 2 + 2);
    });
  }

  function glowSprite(colorA, colorB) {
    return makeCanvas(128, 128, function (g, w, h) {
      var grad = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
      grad.addColorStop(0, colorA);
      grad.addColorStop(0.45, colorB);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    });
  }

  // ------------------------------------------------------------------
  // Collision world
  // ------------------------------------------------------------------
  // boxes: {minX,maxX,minZ,maxZ,h}  cylinders: {x,z,r,h}
  var boxes = [];
  var cylinders = [];

  function addBox(cx, cz, sx, sz, h) {
    boxes.push({
      minX: cx - sx / 2, maxX: cx + sx / 2,
      minZ: cz - sz / 2, maxZ: cz + sz / 2, h: h,
    });
  }
  function addCyl(x, z, r, h) {
    cylinders.push({ x: x, z: z, r: r, h: h });
  }

  // Resolve a circle (px,pz,r) at foot height py against the world.
  // Returns corrected x/z. Side collision only applies when the feet are
  // below the obstacle's top (so you can stand on low obstacles).
  // minH lets demons drift over low furniture (benches, bush planters)
  // while tall structures still block them.
  var STEP_FORGIVE = 0.3;
  function resolveXZ(px, pz, py, r, minH) {
    minH = minH || 0;
    var i, b;
    for (i = 0; i < boxes.length; i++) {
      b = boxes[i];
      if (b.h < minH) continue;
      if (py >= b.h - STEP_FORGIVE) continue;
      var nx = Math.max(b.minX, Math.min(px, b.maxX));
      var nz = Math.max(b.minZ, Math.min(pz, b.maxZ));
      var dx = px - nx, dz = pz - nz;
      var d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) {
          var d = Math.sqrt(d2), push = (r - d) / d;
          px += dx * push; pz += dz * push;
        } else {
          // center inside the box: eject along the smallest penetration
          var left = px - b.minX, right = b.maxX - px;
          var near = pz - b.minZ, far = b.maxZ - pz;
          var m = Math.min(left, right, near, far);
          if (m === left) px = b.minX - r;
          else if (m === right) px = b.maxX + r;
          else if (m === near) pz = b.minZ - r;
          else pz = b.maxZ + r;
        }
      }
    }
    for (i = 0; i < cylinders.length; i++) {
      var c = cylinders[i];
      if (c.h < minH) continue;
      if (py >= c.h - STEP_FORGIVE) continue;
      var ddx = px - c.x, ddz = pz - c.z;
      var rr = r + c.r;
      var dd2 = ddx * ddx + ddz * ddz;
      if (dd2 < rr * rr && dd2 > 1e-8) {
        var dd = Math.sqrt(dd2), p = (rr - dd) / dd;
        px += ddx * p; pz += ddz * p;
      }
    }
    // mall walls
    px = Math.max(-MALL_X + r, Math.min(MALL_X - r, px));
    pz = Math.max(-MALL_Z + r, Math.min(MALL_Z - r, pz));
    return { x: px, z: pz };
  }

  // Highest surface beneath a point (for landing on planters/benches).
  function supportHeight(px, pz, r) {
    var top = 0, i;
    var pad = r * 0.55;
    for (i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      if (px > b.minX - pad && px < b.maxX + pad &&
          pz > b.minZ - pad && pz < b.maxZ + pad) {
        if (b.h > top) top = b.h;
      }
    }
    for (i = 0; i < cylinders.length; i++) {
      var c = cylinders[i];
      var dx = px - c.x, dz = pz - c.z;
      var rr = c.r + pad;
      if (dx * dx + dz * dz < rr * rr && c.h > top && c.h <= 1.6) top = c.h;
    }
    return top;
  }

  // ------------------------------------------------------------------
  // Materials we animate between day and night
  // ------------------------------------------------------------------
  var nightFaders = []; // {mat, day, night, prop}
  function fade(mat, prop, day, night) {
    nightFaders.push({ mat: mat, prop: prop, day: day, night: night });
    return mat;
  }

  // ------------------------------------------------------------------
  // Mall construction
  // ------------------------------------------------------------------
  var mall = new THREE.Group();
  scene.add(mall);

  function mesh(geo, mat, x, y, z, opts) {
    var m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (!opts || opts.shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
    mall.add(m);
    return m;
  }

  // Floor
  var floor = new THREE.Mesh(
    new THREE.PlaneGeometry(MALL_X * 2 + 8, MALL_Z * 2 + 8),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  mall.add(floor);

  // Walls + shop fronts
  var wallMat = new THREE.MeshStandardMaterial({ color: 0xd9d2bd, roughness: 0.9 });
  var trimMat = new THREE.MeshStandardMaterial({ color: 0xb8e0c8, roughness: 0.6 });
  var glassMat = new THREE.MeshStandardMaterial({
    color: 0x9fd8d2, roughness: 0.12, metalness: 0.25,
    transparent: true, opacity: 0.34,
  });
  var gardenMat = new THREE.MeshStandardMaterial({ map: gardenTex, roughness: 1 });

  var SHOPS = [
    ["FERN & FILAMENT", 140], ["SOLSTICE BREW", 35], ["MOSSWARE", 110],
    ["PHOTON THREADS", 185], ["LUMEN BAKERY", 45], ["TERRARIUM", 95],
    ["HELIO ARCADE", 205], ["CANOPY BOOKS", 25],
  ];

  function buildShopRow(zWall, flip) {
    var dir = flip ? 1 : -1; // normal facing into the mall
    for (var i = 0; i < 8; i++) {
      var x = -38.5 + i * 11;
      var spec = SHOPS[(i + (flip ? 4 : 0)) % SHOPS.length];
      // storefront slab
      mesh(new THREE.BoxGeometry(9.6, 7.2, 1.4), wallMat, x, 3.6, zWall);
      // glass front
      mesh(new THREE.BoxGeometry(8.2, 4.2, 0.18), glassMat, x, 2.2, zWall + dir * 0.85, { shadow: false });
      // sign
      var st = signTexture(spec[0], spec[1]);
      var signMat = new THREE.MeshStandardMaterial({
        map: st, emissiveMap: st, emissive: 0xffffff, emissiveIntensity: 0.12,
      });
      fade(signMat, "emissiveIntensity", 0.12, 1.5);
      var sgn = mesh(new THREE.BoxGeometry(7.4, 1.5, 0.3), signMat, x, 5.6, zWall + dir * 0.85, { shadow: false });
      sgn.rotation.y = flip ? 0 : Math.PI;
      // living wall between shops
      if (i < 7) {
        mesh(new THREE.BoxGeometry(2.0, 6.6, 0.5), gardenMat, x + 5.5, 3.3, zWall + dir * 0.4);
      }
    }
    // continuous upper fascia + mezzanine ledge
    mesh(new THREE.BoxGeometry(MALL_X * 2 + 4, 1.0, 2.2), trimMat, 0, 7.7, zWall + dir * 0.2);
    mesh(new THREE.BoxGeometry(MALL_X * 2 + 4, 4.0, 1.2), wallMat, 0, 10.2, zWall, { shadow: false });
  }
  buildShopRow(-(MALL_Z + 1.2), true);
  buildShopRow(MALL_Z + 1.2, false);

  // End walls: tall living gardens
  function buildEndWall(xWall) {
    mesh(new THREE.BoxGeometry(1.6, 12.4, MALL_Z * 2 + 4), wallMat, xWall, 6.2, 0, { shadow: false });
    mesh(new THREE.BoxGeometry(0.6, 9.0, 16), gardenMat, xWall - Math.sign(xWall) * 0.8, 4.8, 0, { shadow: false });
    mesh(new THREE.BoxGeometry(0.6, 6.0, 6), gardenMat, xWall - Math.sign(xWall) * 0.8, 3.2, -16, { shadow: false });
    mesh(new THREE.BoxGeometry(0.6, 6.0, 6), gardenMat, xWall - Math.sign(xWall) * 0.8, 3.2, 16, { shadow: false });
  }
  buildEndWall(-(MALL_X + 1.0));
  buildEndWall(MALL_X + 1.0);

  // Glass atrium roof with mullion beams
  var roofGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(MALL_X * 2 + 6, MALL_Z * 2 + 6),
    new THREE.MeshStandardMaterial({
      color: 0xbfe8ef, roughness: 0.1, metalness: 0.1,
      transparent: true, opacity: 0.16, side: THREE.DoubleSide,
    })
  );
  roofGlass.rotation.x = Math.PI / 2;
  roofGlass.position.y = ROOF_Y;
  mall.add(roofGlass);

  var beamMat = new THREE.MeshStandardMaterial({ color: 0xf4f7ef, roughness: 0.5 });
  for (var bx = -MALL_X; bx <= MALL_X; bx += 8) {
    mesh(new THREE.BoxGeometry(0.35, 0.5, MALL_Z * 2 + 6), beamMat, bx, ROOF_Y, 0, { shadow: false });
  }
  for (var bz = -MALL_Z; bz <= MALL_Z; bz += 7.6) {
    mesh(new THREE.BoxGeometry(MALL_X * 2 + 6, 0.5, 0.35), beamMat, 0, ROOF_Y, bz, { shadow: false });
  }

  // Columns
  var colMat = new THREE.MeshStandardMaterial({ color: 0xe8e4d2, roughness: 0.7 });
  var colGeo = new THREE.CylinderGeometry(0.62, 0.72, ROOF_Y, 10);
  [-36, -24, -12, 12, 24, 36].forEach(function (cx) {
    [-10, 10].forEach(function (cz) {
      mesh(colGeo, colMat, cx, ROOF_Y / 2, cz);
      addCyl(cx, cz, 0.7, ROOF_Y);
      // ivy wrap
      mesh(new THREE.CylinderGeometry(0.78, 0.84, 2.6, 10), gardenMat, cx, 1.3, cz, { shadow: false });
    });
  });

  // Central fountain
  var fountain = new THREE.Group();
  var basinMat = new THREE.MeshStandardMaterial({ color: 0xcfd8c2, roughness: 0.6 });
  var basin = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.7, 0.95, 28), basinMat);
  basin.position.y = 0.475;
  basin.castShadow = basin.receiveShadow = true;
  fountain.add(basin);
  var waterMat = new THREE.MeshStandardMaterial({
    color: 0x6fd8d0, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85,
    emissive: 0x1c4a48, emissiveIntensity: 0.25,
  });
  fade(waterMat, "emissiveIntensity", 0.25, 1.0);
  var water = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.0, 0.18, 28), waterMat);
  water.position.y = 0.92;
  fountain.add(water);
  var jet = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 2.6, 12),
    new THREE.MeshStandardMaterial({
      color: 0xaef2ec, transparent: true, opacity: 0.7, roughness: 0.2,
      emissive: 0x6fd8d0, emissiveIntensity: 0.3,
    })
  );
  jet.position.y = 2.2;
  fountain.add(jet);
  mall.add(fountain);
  addCyl(0, 0, 4.55, 1.0);

  // Trees in round planters (tall, non-jumpable obstacles)
  var trunkMat = new THREE.MeshStandardMaterial({ color: 0x6e4f33, roughness: 1 });
  var leafMat = new THREE.MeshStandardMaterial({ color: 0x4d9e52, roughness: 0.9, flatShading: true });
  var potMat = new THREE.MeshStandardMaterial({ color: 0xc9b18a, roughness: 0.85 });
  function tree(x, z, s) {
    var g = new THREE.Group();
    var pot = new THREE.Mesh(new THREE.CylinderGeometry(1.7 * s, 1.95 * s, 1.1, 14), potMat);
    pot.position.y = 0.55; pot.castShadow = pot.receiveShadow = true;
    g.add(pot);
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.3 * s, 3.4 * s, 8), trunkMat);
    trunk.position.y = 1.1 + 1.7 * s; trunk.castShadow = true;
    g.add(trunk);
    for (var i = 0; i < 4; i++) {
      var blob = new THREE.Mesh(new THREE.IcosahedronGeometry((1.15 - i * 0.14) * s, 0), leafMat);
      blob.position.set(
        Math.sin(i * 2.4) * 0.65 * s,
        1.1 + 3.1 * s + i * 0.78 * s,
        Math.cos(i * 2.4) * 0.65 * s
      );
      blob.castShadow = true;
      g.add(blob);
    }
    g.position.set(x, 0, z);
    mall.add(g);
    addCyl(x, z, 1.85 * s, 3.0); // too tall to jump
  }
  tree(-18, 5, 1.0); tree(18, -5, 1.0);
  tree(-30, -9, 1.1); tree(30, 9, 1.1);
  tree(-8, -15, 0.9); tree(8, 15, 0.9);

  // Low bush planters (jumpable platforms)
  var planterMat = new THREE.MeshStandardMaterial({ color: 0xa9c4b0, roughness: 0.8 });
  var bushMat = new THREE.MeshStandardMaterial({ color: 0x5fae5b, roughness: 1, flatShading: true });
  function planter(x, z) {
    mesh(new THREE.BoxGeometry(3.2, 1.0, 3.2), planterMat, x, 0.5, z);
    for (var i = 0; i < 3; i++) {
      var b = mesh(new THREE.IcosahedronGeometry(0.42, 0), bushMat,
        x - 0.9 + i * 0.9, 1.2, z + (i % 2 ? 0.5 : -0.5));
      b.scale.y = 0.75;
    }
    addBox(x, z, 3.2, 3.2, 1.0);
  }
  planter(-12, -4); planter(12, 4);
  planter(-24, 12); planter(24, -12);
  planter(-6, 18); planter(6, -18);
  planter(-36, 0); planter(36, 0);

  // Benches (jumpable)
  var benchMat = new THREE.MeshStandardMaterial({ color: 0xb78a55, roughness: 0.8 });
  function bench(x, z, rot) {
    var m = mesh(new THREE.BoxGeometry(2.6, 0.55, 1.0), benchMat, x, 0.45, z);
    m.rotation.y = rot;
    if (Math.abs(Math.sin(rot)) > 0.5) addBox(x, z, 1.0, 2.6, 0.72);
    else addBox(x, z, 2.6, 1.0, 0.72);
  }
  bench(7.2, 0, Math.PI / 2); bench(-7.2, 0, Math.PI / 2);
  bench(0, 7.2, 0); bench(0, -7.2, 0);
  bench(-20, -12, 0); bench(20, 12, 0);

  // Kiosks (tall obstacles)
  var kioskMat = new THREE.MeshStandardMaterial({ color: 0xe5b765, roughness: 0.7 });
  var kioskTopMat = new THREE.MeshStandardMaterial({ color: 0x4a8a7d, roughness: 0.6 });
  function kiosk(x, z) {
    mesh(new THREE.BoxGeometry(3.5, 2.2, 2.2), kioskMat, x, 1.1, z);
    var top = mesh(new THREE.BoxGeometry(4.3, 0.3, 3.0), kioskTopMat, x, 2.5, z);
    top.castShadow = true;
    // small rooftop solar panel — solarpunk everywhere
    var panel = mesh(new THREE.BoxGeometry(2.4, 0.1, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x1d3a5f, roughness: 0.3, metalness: 0.6 }),
      x, 2.75, z, { shadow: false });
    panel.rotation.z = 0.18;
    addBox(x, z, 3.5, 2.2, 2.6);
  }
  kiosk(-20, -16); kiosk(20, 16); kiosk(-34, 15); kiosk(34, -15);

  // Lamp posts with warm point lights (come on at night)
  var lampLights = [];
  var lampGlowTex = glowSprite("rgba(255,234,170,1)", "rgba(255,200,90,0.55)");
  function lamp(x, z) {
    mesh(new THREE.CylinderGeometry(0.12, 0.16, 3.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x52646a, roughness: 0.6 }), x, 1.9, z);
    var bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfff2cf, emissive: 0xffdf9a, emissiveIntensity: 0.1,
    });
    fade(bulbMat, "emissiveIntensity", 0.1, 2.4);
    mesh(new THREE.SphereGeometry(0.34, 12, 10), bulbMat, x, 3.95, z, { shadow: false });
    var spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: lampGlowTex, color: 0xffffff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    spr.scale.set(3.4, 3.4, 1);
    spr.position.set(x, 3.95, z);
    mall.add(spr);
    fade(spr.material, "opacity", 0, 0.85);
    var pl = new THREE.PointLight(0xffc97a, 0, 17, 2);
    pl.position.set(x, 4.1, z);
    scene.add(pl);
    lampLights.push(pl);
    addCyl(x, z, 0.22, 3.5);
  }
  lamp(-16, 12); lamp(16, -12); lamp(-30, 2); lamp(30, -2); lamp(0, -13);

  // Hanging banners under the roof
  var bannerMat = new THREE.MeshStandardMaterial({
    color: 0x7fc8a8, roughness: 0.9, side: THREE.DoubleSide,
  });
  for (var bi = -2; bi <= 2; bi++) {
    var ban = mesh(new THREE.PlaneGeometry(2.2, 3.4), bannerMat, bi * 16, 9.6, 0, { shadow: false });
    ban.rotation.y = Math.PI / 2;
  }

  // ------------------------------------------------------------------
  // Night sky: stars, nebula, ringed planet (fade in after dusk)
  // ------------------------------------------------------------------
  var starGeo = new THREE.BufferGeometry();
  var starPos = new Float32Array(1300 * 3);
  for (var si = 0; si < 1300; si++) {
    var az = Math.random() * Math.PI * 2;
    var el = Math.random() * Math.PI * 0.48 + 0.06;
    var rad = 260;
    starPos[si * 3] = Math.cos(az) * Math.cos(el) * rad;
    starPos[si * 3 + 1] = Math.sin(el) * rad;
    starPos[si * 3 + 2] = Math.sin(az) * Math.cos(el) * rad;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  var starMat = new THREE.PointsMaterial({
    color: 0xdfe8ff, size: 1.6, sizeAttenuation: false,
    transparent: true, opacity: 0, depthWrite: false,
  });
  fade(starMat, "opacity", 0, 0.95);
  var stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  var nebulaTex = glowSprite("rgba(150,90,255,0.9)", "rgba(60,20,140,0.35)");
  var nebulaTex2 = glowSprite("rgba(80,200,255,0.8)", "rgba(20,60,140,0.3)");
  [[-150, 95, -180, 220, nebulaTex], [170, 70, -120, 170, nebulaTex2], [40, 120, 200, 200, nebulaTex]]
    .forEach(function (n) {
      var sm = new THREE.SpriteMaterial({
        map: n[4], transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      fade(sm, "opacity", 0, 0.42);
      var sp = new THREE.Sprite(sm);
      sp.position.set(n[0], n[1], n[2]);
      sp.scale.set(n[3], n[3], 1);
      scene.add(sp);
    });

  var planetGroup = new THREE.Group();
  var planetMat = new THREE.MeshBasicMaterial({ color: 0xc89ae8, transparent: true, opacity: 0 });
  fade(planetMat, "opacity", 0, 0.9);
  var planet = new THREE.Mesh(new THREE.SphereGeometry(16, 24, 18), planetMat);
  planetGroup.add(planet);
  var ringMat = new THREE.MeshBasicMaterial({
    color: 0x9ad8ff, transparent: true, opacity: 0, side: THREE.DoubleSide,
  });
  fade(ringMat, "opacity", 0, 0.65);
  var ring = new THREE.Mesh(new THREE.RingGeometry(20, 30, 40), ringMat);
  ring.rotation.x = Math.PI / 2.4;
  planetGroup.add(ring);
  planetGroup.position.set(-130, 100, -190);
  scene.add(planetGroup);

  // Drifting motes (gold pollen by day, pale dust at night)
  var moteGeo = new THREE.BufferGeometry();
  var MOTES = 160;
  var motePos = new Float32Array(MOTES * 3);
  var moteSeed = new Float32Array(MOTES);
  for (var mi = 0; mi < MOTES; mi++) {
    motePos[mi * 3] = (Math.random() * 2 - 1) * MALL_X;
    motePos[mi * 3 + 1] = 0.6 + Math.random() * 9;
    motePos[mi * 3 + 2] = (Math.random() * 2 - 1) * MALL_Z;
    moteSeed[mi] = Math.random() * Math.PI * 2;
  }
  moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
  var moteMat = new THREE.PointsMaterial({
    color: 0xffe8a0, size: 0.09, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  scene.add(new THREE.Points(moteGeo, moteMat));

  // Demon rifts — dark portals that tear open at night
  var riftSpots = [
    [-42, -20], [42, 20], [-42, 20], [42, -20], [0, -21.5], [0, 21.5],
  ];
  var riftTex = glowSprite("rgba(190,60,255,1)", "rgba(80,0,140,0.5)");
  var rifts = [];
  riftSpots.forEach(function (rs) {
    var g = new THREE.Group();
    var diskMat = new THREE.MeshBasicMaterial({
      color: 0x14001f, transparent: true, opacity: 0, side: THREE.DoubleSide,
    });
    fade(diskMat, "opacity", 0, 0.92);
    var disk = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24), diskMat);
    disk.position.y = 1.7;
    g.add(disk);
    var glowMat = new THREE.SpriteMaterial({
      map: riftTex, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    fade(glowMat, "opacity", 0, 0.8);
    var glow = new THREE.Sprite(glowMat);
    glow.scale.set(5.2, 5.2, 1);
    glow.position.y = 1.7;
    g.add(glow);
    g.position.set(rs[0], 0, rs[1]);
    g.lookAt(0, 1.7, 0);
    scene.add(g);
    rifts.push({ group: g, x: rs[0], z: rs[1], disk: disk });
  });

  // ------------------------------------------------------------------
  // Player
  // ------------------------------------------------------------------
  function buildPlayer() {
    var g = new THREE.Group();
    var body = new THREE.Group();
    g.add(body);

    var jacket = new THREE.MeshStandardMaterial({ color: 0x2f8f83, roughness: 0.65 });
    var pants = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.8 });
    var skin = new THREE.MeshStandardMaterial({ color: 0xe2b088, roughness: 0.7 });
    var accent = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.5 });

    var torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.5, 4, 10), jacket);
    torso.position.y = 1.05; torso.castShadow = true;
    body.add(torso);

    var head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 12), skin);
    head.position.y = 1.62; head.castShadow = true;
    body.add(head);
    var visor = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.235, 0.1, 12, 1, false, 0, Math.PI), accent);
    visor.position.set(0, 1.7, 0.02);
    visor.rotation.y = -Math.PI / 2;
    body.add(visor);

    var packMat = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.6 });
    var pack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.16), packMat);
    pack.position.set(0, 1.12, -0.3);
    body.add(pack);
    var cellMat = new THREE.MeshStandardMaterial({
      color: 0x1d3a5f, emissive: 0x3fb6ff, emissiveIntensity: 0.15, roughness: 0.3,
    });
    fade(cellMat, "emissiveIntensity", 0.15, 1.4);
    var cell = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.04), cellMat);
    cell.position.set(0, 1.12, -0.4);
    body.add(cell);

    function limb(w, h, d, mat, x, y, z) {
      var pivot = new THREE.Group();
      pivot.position.set(x, y, z);
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.y = -h / 2;
      m.castShadow = true;
      pivot.add(m);
      body.add(pivot);
      return pivot;
    }
    var legL = limb(0.16, 0.62, 0.18, pants, -0.13, 0.66, 0);
    var legR = limb(0.16, 0.62, 0.18, pants, 0.13, 0.66, 0);
    var armL = limb(0.12, 0.52, 0.14, jacket, -0.36, 1.32, 0);
    var armR = limb(0.12, 0.52, 0.14, jacket, 0.36, 1.32, 0);

    var shadowBlob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 18),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
    );
    shadowBlob.rotation.x = -Math.PI / 2;
    shadowBlob.position.y = 0.02;
    g.add(shadowBlob);

    scene.add(g);
    return { group: g, body: body, legL: legL, legR: legR, armL: armL, armR: armR, blob: shadowBlob };
  }

  // ------------------------------------------------------------------
  // Demons
  // ------------------------------------------------------------------
  var demonBodyGeo = new THREE.IcosahedronGeometry(0.66, 1);
  var demonEyeGeo = new THREE.SphereGeometry(0.085, 8, 8);
  var demonHornGeo = new THREE.ConeGeometry(0.13, 0.55, 6);
  var demonGlowTex = glowSprite("rgba(255,40,40,0.9)", "rgba(120,0,40,0.4)");

  function buildDemonMesh() {
    var g = new THREE.Group();
    var bodyMat = new THREE.MeshStandardMaterial({
      color: 0x16091e, roughness: 0.5, metalness: 0.2, flatShading: true,
      emissive: 0x52001a, emissiveIntensity: 0.85,
    });
    var body = new THREE.Mesh(demonBodyGeo, bodyMat);
    body.scale.set(1, 1.4, 1);
    body.position.y = 0.95;
    body.castShadow = true;
    g.add(body);

    var hornMat = new THREE.MeshStandardMaterial({
      color: 0x0c0512, roughness: 0.4, flatShading: true,
      emissive: 0x2a0030, emissiveIntensity: 0.7,
    });
    for (var i = 0; i < 5; i++) {
      var h = new THREE.Mesh(demonHornGeo, hornMat);
      var a = (i / 5) * Math.PI * 2;
      h.position.set(Math.cos(a) * 0.42, 1.75, Math.sin(a) * 0.42);
      h.rotation.z = Math.cos(a) * 0.7;
      h.rotation.x = -Math.sin(a) * 0.7;
      g.add(h);
    }

    var eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3030 });
    var eL = new THREE.Mesh(demonEyeGeo, eyeMat);
    eL.position.set(-0.18, 1.22, 0.5);
    g.add(eL);
    var eR = eL.clone();
    eR.position.x = 0.18;
    g.add(eR);

    var spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: demonGlowTex, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    spr.scale.set(2.6, 2.6, 1);
    spr.position.y = 1.1;
    g.add(spr);

    var blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.62, 16),
      new THREE.MeshBasicMaterial({ color: 0x33001a, transparent: true, opacity: 0.4, depthWrite: false })
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.02;
    g.add(blob);

    scene.add(g);
    return g;
  }

  // ------------------------------------------------------------------
  // Game state
  // ------------------------------------------------------------------
  var keys = {};
  window.addEventListener("keydown", function (e) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Spacebar"].indexOf(e.key) >= 0) {
      e.preventDefault();
    }
    keys[e.code] = true;
    if (e.code === "KeyR") reset();
  });
  window.addEventListener("keyup", function (e) { keys[e.code] = false; });

  var state;
  var playerRig = buildPlayer();
  var demons = [];

  var hudClock = document.getElementById("hud-clock");
  var hudPhase = document.getElementById("hud-phase");
  var hudDemons = document.getElementById("hud-demons");
  var hudBest = document.getElementById("hud-best");
  var deathOverlay = document.getElementById("death");
  var deathStats = document.getElementById("death-stats");
  var introCard = document.getElementById("intro");
  var nightVignette = document.getElementById("vignette");
  var flash = document.getElementById("flash");
  document.getElementById("restart-btn").addEventListener("click", reset);

  var bestTime = 0;

  function freshState() {
    return {
      px: 0, py: 0, pz: 11,
      vx: 0, vy: 0, vz: 0,
      heading: Math.PI, // facing -z (toward the fountain)
      grounded: true,
      runT: 0,
      camYaw: Math.PI,
      cycleT: START_T01 * CYCLE,
      alive: true,
      aliveTime: 0,
      nights: 0,
      wasNight: false,
      spawnTimer: 0,
      shakeT: 0,
    };
  }

  function removeDemons() {
    demons.forEach(function (d) { scene.remove(d.mesh); });
    demons = [];
  }

  function reset() {
    if (state && state.alive && state.aliveTime > 1) return; // R only after death (or at boot)
    removeDemons();
    state = freshState();
    deathOverlay.classList.remove("show");
    flash.classList.remove("show");
    playerRig.group.visible = true;
  }

  function hardReset() { // used once at boot
    removeDemons();
    state = freshState();
  }
  hardReset();

  var preSpawn = parseInt(QS.get("demons"), 10);
  if (preSpawn > 0) {
    state.nights = 1;
    state.wasNight = true;
    for (var ps = 0; ps < Math.min(preSpawn, 8); ps++) spawnDemonAt(ps);
  }

  setTimeout(function () { introCard.classList.add("fade"); }, 7000);

  // ------------------------------------------------------------------
  // Day/night machinery
  // ------------------------------------------------------------------
  function smooth(x) {
    x = Math.max(0, Math.min(1, x));
    return x * x * (3 - 2 * x);
  }
  function lightAmount(t01) {
    if (t01 < DUSK_A) return 1;
    if (t01 < DUSK_B) return 1 - smooth((t01 - DUSK_A) / (DUSK_B - DUSK_A));
    if (t01 < DAWN_A) return 0;
    return smooth((t01 - DAWN_A) / (1 - DAWN_A));
  }

  function applyAtmosphere(L, t) {
    var n = 1 - L; // nightness
    _sky.lerpColors(COL.skyNight, COL.skyDay, L);
    renderer.setClearColor(_sky);
    scene.fog.color.lerpColors(COL.fogNight, COL.fogDay, L);
    scene.fog.near = 30 + 40 * L;
    scene.fog.far = 110 + 80 * L;

    hemi.intensity = 0.11 + 0.55 * L;
    hemi.color.lerpColors(COL.hemiSkyNight, COL.hemiSkyDay, L);
    hemi.groundColor.lerpColors(COL.hemiGroundNight, COL.hemiGroundDay, L);

    sun.intensity = 1.3 * L;
    var sa = t * 0.05;
    sun.position.set(Math.cos(sa) * 30, 42 + Math.sin(sa) * 6, 16);
    moon.intensity = 0.26 * n;

    for (var i = 0; i < lampLights.length; i++) lampLights[i].intensity = 1.3 * n;
    for (var f = 0; f < nightFaders.length; f++) {
      var nf = nightFaders[f];
      nf.mat[nf.prop] = nf.day + (nf.night - nf.day) * n;
    }

    moteMat.color.setHex(n > 0.5 ? 0xa8c8ff : 0xffe8a0);
    moteMat.opacity = 0.35 + 0.4 * L;
    nightVignette.style.opacity = (n * 0.5).toFixed(2);
  }

  // ------------------------------------------------------------------
  // Demon lifecycle
  // ------------------------------------------------------------------
  function demonSpeed() {
    return Math.min(DEMON_SPEED_MAX, DEMON_BASE_SPEED + DEMON_SPEED_PER_NIGHT * (state.nights - 1));
  }
  function demonCap() {
    return Math.min(8, 3 + state.nights);
  }

  function spawnDemon() {
    // spawn from one of the three rifts farthest from the player:
    // never a cheap kill, but they still arrive from multiple angles
    var sorted = rifts.slice().sort(function (a, b) {
      var da = (a.x - state.px) * (a.x - state.px) + (a.z - state.pz) * (a.z - state.pz);
      var db = (b.x - state.px) * (b.x - state.px) + (b.z - state.pz) * (b.z - state.pz);
      return db - da;
    });
    var best = sorted[(Math.random() * 3) | 0];
    var m = buildDemonMesh();
    m.position.set(best.x, 0, best.z);
    m.scale.setScalar(0.01);
    demons.push({
      mesh: m, x: best.x, z: best.z,
      scale: 0.01, dying: false,
      phase: Math.random() * Math.PI * 2,
      wobble: 0.55 + Math.random() * 0.5,
    });
  }

  function spawnDemonAt(i) { // debug pre-spawn at full scale
    var r = rifts[i % rifts.length];
    var m = buildDemonMesh();
    m.position.set(r.x, 0, r.z);
    demons.push({
      mesh: m, x: r.x, z: r.z, scale: 1, dying: false,
      phase: Math.random() * Math.PI * 2, wobble: 0.55 + Math.random() * 0.5,
    });
  }

  function updateDemons(dt, L) {
    var speed = demonSpeed();
    var i, d;
    for (i = demons.length - 1; i >= 0; i--) {
      d = demons[i];

      if (d.dying) {
        d.scale -= dt * 1.6;
        if (d.scale <= 0.02) {
          scene.remove(d.mesh);
          demons.splice(i, 1);
          continue;
        }
      } else if (d.scale < 1) {
        d.scale = Math.min(1, d.scale + dt * 1.4);
      }
      d.mesh.scale.setScalar(Math.max(0.01, d.scale));

      var active = !d.dying && d.scale >= 0.65;
      if (active && state.alive) {
        var dx = state.px - d.x, dz = state.pz - d.z;
        var dist = Math.sqrt(dx * dx + dz * dz) || 1;
        var wob = Math.sin(performance.now() * 0.0013 + d.phase) * d.wobble;
        var dirX = dx / dist, dirZ = dz / dist;
        // wobble steers perpendicular to the chase direction
        var mx = dirX + -dirZ * wob * 0.45;
        var mz = dirZ + dirX * wob * 0.45;
        var ml = Math.sqrt(mx * mx + mz * mz) || 1;
        d.x += (mx / ml) * speed * dt;
        d.z += (mz / ml) * speed * dt;

        // demons shove each other apart so they flank instead of stacking
        for (var j = 0; j < demons.length; j++) {
          if (j === i) continue;
          var o = demons[j];
          var sx = d.x - o.x, sz = d.z - o.z;
          var s2 = sx * sx + sz * sz;
          if (s2 < 2.4 * 2.4 && s2 > 1e-6) {
            var s = Math.sqrt(s2);
            d.x += (sx / s) * (2.4 - s) * 0.5 * dt * 6;
            d.z += (sz / s) * (2.4 - s) * 0.5 * dt * 6;
          }
        }

        var fixed = resolveXZ(d.x, d.z, 0, DEMON_RADIUS, 1.05);
        d.x = fixed.x; d.z = fixed.z;
        d.mesh.rotation.y = Math.atan2(dx, dz);

        // contact = death (unless the player is above the lunge)
        var kdx = state.px - d.x, kdz = state.pz - d.z;
        if (kdx * kdx + kdz * kdz < KILL_DIST * KILL_DIST && state.py < KILL_MAX_PLAYER_Y) {
          die();
        }
      }

      d.mesh.position.set(d.x, Math.sin(performance.now() * 0.003 + d.phase) * 0.1, d.z);
    }

    // spawn at night, dissolve at dawn
    if (L < DEMON_LIGHT_THRESHOLD) {
      if (state.alive) {
        state.spawnTimer -= dt;
        var live = 0;
        for (i = 0; i < demons.length; i++) if (!demons[i].dying) live++;
        if (state.spawnTimer <= 0 && live < demonCap()) {
          spawnDemon();
          state.spawnTimer = SPAWN_INTERVAL;
        }
      }
    } else if (L > 0.55) {
      for (i = 0; i < demons.length; i++) demons[i].dying = true;
    }
  }

  // ------------------------------------------------------------------
  // Player update
  // ------------------------------------------------------------------
  function angleLerp(a, b, t) {
    var d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return a + d * t;
  }

  function updatePlayer(dt) {
    var ix = 0, iz = 0;
    if (state.alive) {
      if (keys.ArrowUp || keys.KeyW) iz -= 1;
      if (keys.ArrowDown || keys.KeyS) iz += 1;
      if (keys.ArrowLeft || keys.KeyA) ix -= 1;
      if (keys.ArrowRight || keys.KeyD) ix += 1;
    }

    var moving = ix !== 0 || iz !== 0;
    var vx = 0, vz = 0;
    if (moving) {
      var il = Math.sqrt(ix * ix + iz * iz);
      ix /= il; iz /= il;
      // input is camera-relative
      var cy = state.camYaw;
      var fX = Math.sin(cy), fZ = Math.cos(cy); // camera forward on XZ
      var rX = -fZ, rZ = fX;                    // camera right
      vx = (fX * -iz + rX * ix) * PLAYER_SPEED;
      vz = (fZ * -iz + rZ * ix) * PLAYER_SPEED;
      state.heading = Math.atan2(vx, vz);
    }

    var prevY = state.py;
    state.px += vx * dt;
    state.pz += vz * dt;
    var fixed = resolveXZ(state.px, state.pz, state.py, PLAYER_RADIUS);
    state.px = fixed.x; state.pz = fixed.z;

    // vertical
    var support = supportHeight(state.px, state.pz, PLAYER_RADIUS);
    if (state.alive && state.grounded && (keys.Space)) {
      state.vy = JUMP_VELOCITY;
      state.grounded = false;
    }
    state.vy -= GRAVITY * dt;
    state.py += state.vy * dt;
    if (state.py <= support && prevY >= support - 0.35) {
      state.py = support;
      state.vy = 0;
      state.grounded = true;
    } else if (state.py <= 0) {
      state.py = 0;
      state.vy = 0;
      state.grounded = true;
    } else if (state.py > support + 0.02) {
      state.grounded = false;
    }

    // rig
    var g = playerRig.group;
    g.position.set(state.px, state.py, state.pz);
    g.rotation.y = angleLerp(g.rotation.y, state.heading, 1 - Math.exp(-dt * 14));

    var spd = moving ? 1 : 0;
    state.runT += dt * (4 + spd * 8);
    var swing = moving && state.grounded ? Math.sin(state.runT) * 0.95 : 0;
    if (!state.grounded) swing = 0.5; // tucked mid-air pose
    playerRig.legL.rotation.x = swing;
    playerRig.legR.rotation.x = -swing;
    playerRig.armL.rotation.x = -swing * 0.8;
    playerRig.armR.rotation.x = swing * 0.8;
    playerRig.body.rotation.x = moving ? 0.12 : 0;
    playerRig.body.position.y = moving && state.grounded ? Math.abs(Math.sin(state.runT)) * 0.06 : 0;
    playerRig.blob.material.opacity = Math.max(0.06, 0.28 - (state.py - support) * 0.1);
    playerRig.blob.position.y = support - state.py + 0.02;
  }

  // ------------------------------------------------------------------
  // Camera
  // ------------------------------------------------------------------
  var camPos = new THREE.Vector3(0, 7, 22);
  var camTarget = new THREE.Vector3();
  function updateCamera(dt) {
    // the camera slowly swings around to sit behind the player's heading
    var movingFollow = state.alive ? 1.4 : 0.3;
    state.camYaw = angleLerp(state.camYaw, state.heading, 1 - Math.exp(-dt * movingFollow));

    var dist = 9.6, height = 5.4;
    var cx = state.px - Math.sin(state.camYaw) * dist;
    var cz = state.pz - Math.cos(state.camYaw) * dist;
    var cy = state.py + height;
    // keep the camera inside the atrium
    cx = Math.max(-MALL_X + 1.2, Math.min(MALL_X - 1.2, cx));
    cz = Math.max(-MALL_Z + 1.2, Math.min(MALL_Z - 1.2, cz));
    camPos.lerp(new THREE.Vector3(cx, cy, cz), 1 - Math.exp(-dt * 5));

    var shake = 0;
    if (state.shakeT > 0) {
      state.shakeT -= dt;
      shake = state.shakeT * 0.5;
    }
    camera.position.set(
      camPos.x + (Math.random() - 0.5) * shake,
      Math.max(1.4, camPos.y + (Math.random() - 0.5) * shake),
      camPos.z + (Math.random() - 0.5) * shake
    );
    camTarget.set(state.px, state.py + 1.7, state.pz);
    camera.lookAt(camTarget);
  }

  // ------------------------------------------------------------------
  // Death / HUD
  // ------------------------------------------------------------------
  function fmtTime(s) {
    var m = Math.floor(s / 60);
    var ss = Math.floor(s % 60);
    return m + ":" + (ss < 10 ? "0" : "") + ss;
  }

  function die() {
    if (!state.alive) return;
    state.alive = false;
    state.shakeT = 0.6;
    bestTime = Math.max(bestTime, state.aliveTime);
    deathStats.innerHTML =
      "You lasted <b>" + fmtTime(state.aliveTime) + "</b>" +
      " and endured <b>" + state.nights + "</b> night" + (state.nights === 1 ? "" : "s") + ".";
    flash.classList.add("show");
    setTimeout(function () { flash.classList.remove("show"); }, 350);
    setTimeout(function () { deathOverlay.classList.add("show"); }, 420);
  }

  var hudTick = 0;
  function updateHUD(dt, L, t01) {
    hudTick -= dt;
    if (hudTick > 0) return;
    hudTick = 0.12;
    hudClock.textContent = fmtTime(state.aliveTime);
    var live = 0;
    for (var i = 0; i < demons.length; i++) if (!demons[i].dying) live++;
    if (L > 0.6) {
      hudPhase.textContent = "Day " + (state.nights + 1) + " — the atrium hums";
      hudPhase.className = "day";
    } else if (t01 < DUSK_B && t01 >= DUSK_A) {
      hudPhase.textContent = "Dusk — the light is going";
      hudPhase.className = "dusk";
    } else if (L < 0.4 && t01 < DAWN_A) {
      hudPhase.textContent = "Night " + state.nights + " — they are here";
      hudPhase.className = "night";
    } else {
      hudPhase.textContent = "Dawn — hold on";
      hudPhase.className = "dusk";
    }
    hudDemons.textContent = live > 0 ? "demons: " + live : "";
    hudBest.textContent = bestTime > 0 ? "best " + fmtTime(bestTime) : "";
  }

  // ------------------------------------------------------------------
  // Main loop
  // ------------------------------------------------------------------
  var clock = new THREE.Clock();
  var elapsed = 0;

  function frame() {
    requestAnimationFrame(frame);
    var dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    if (state.alive) {
      state.aliveTime += dt;
      state.cycleT += dt;
    }
    var t01 = (state.cycleT % CYCLE) / CYCLE;
    var L = lightAmount(t01);

    var isNight = t01 >= DUSK_B && t01 < DAWN_A;
    if (isNight && !state.wasNight) {
      state.nights += 1;
      state.spawnTimer = 0.4;
    }
    state.wasNight = isNight;

    applyAtmosphere(L, elapsed);
    updatePlayer(dt);
    updateDemons(dt, L);
    updateCamera(dt);
    updateHUD(dt, L, t01);

    // ambient motion
    water.position.y = 0.92 + Math.sin(elapsed * 2.2) * 0.02;
    jet.scale.y = 1 + Math.sin(elapsed * 5) * 0.12;
    jet.rotation.y = elapsed * 0.8;
    planetGroup.rotation.y = elapsed * 0.01;
    stars.rotation.y = elapsed * 0.004;
    for (var ri = 0; ri < rifts.length; ri++) {
      rifts[ri].disk.rotation.z = elapsed * (1.5 + ri * 0.2);
      rifts[ri].disk.scale.setScalar(1 + Math.sin(elapsed * 3 + ri) * 0.08);
    }
    var pos = moteGeo.attributes.position;
    for (var mi2 = 0; mi2 < MOTES; mi2++) {
      var y = pos.getY(mi2) + Math.sin(elapsed * 0.7 + moteSeed[mi2]) * dt * 0.4;
      pos.setY(mi2, y);
      pos.setX(mi2, pos.getX(mi2) + Math.cos(elapsed * 0.3 + moteSeed[mi2]) * dt * 0.25);
    }
    pos.needsUpdate = true;

    renderer.render(scene, camera);
  }
  frame();
})();
