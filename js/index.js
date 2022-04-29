$(document).ready(function () {
    rEarth = 6371000 // Radius of the Earth in meters

    function displayError(err) {
        document.getElementById("result").innerHTML = err;
    }

    async function getLocation(loc) {
        apiURL = "https://nominatim.openstreetmap.org/search?q=";
        suffix = "&limit=1&format=jsonv2"
        try {
            res = await fetch(apiURL+loc+suffix, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });
            resultJSON = await res.json();
            return [resultJSON["0"]["lat"], resultJSON["0"]["lon"]];
        } catch(err) {
            displayError("Error getting location: " + loc);
            console.log(err);
            return ["error", "error"];
        }
    }

    // Convert degrees to radians
    function toRadians(angle) {
        return angle * (Math.PI/180);
    }

    // Return the dot product of two arrays
    function dotProduct(a,b){
        const result = a.reduce((acc, cur, index)=>{
            acc += (cur * b[index]);
            return acc;
        }, 0);
        return result;
    }

    // Convert lat, long to x, y, z vector
    function coorToVec(coors) {
        lat = coors[0];
        lng = coors[1];
        return [Math.cos(toRadians(lat)) * Math.cos(toRadians(lng)),
            Math.cos(toRadians(lat)) * Math.sin(toRadians(lng)),
            Math.sin(toRadians(lat))]
    }

    // Given two vectors, return the angle between them.
    // Return angle in radians.
    function vecToAngle(v1, v2){
        // acos of dot product divided by magnitudes multiplied
        // Mags are both 1
        return Math.acos(dotProduct(v1, v2));
    }


    // Given an angle in radians, return height of tower.
    function angleToHeight(angle) {
        observerHeight = 1.6 // Height of observer
        hypotenuse = rEarth / Math.cos(angle);
        height = hypotenuse - rEarth;
        height -= observerHeight;
        // Clip lower bound at 0m
        return Math.max(height, 0);
    }

    function parseCoorPair(houseCr, hereCr) {

        houseVec = coorToVec(houseCr);
        hereVec = coorToVec(hereCr);

        angle = vecToAngle(houseVec, hereVec);

        // Update here and house points
        gData[0].lat = hereCoor[0];
        gData[0].lng = hereCoor[1];
        gData[0].color = "red";
        gData[0].size = 0;
        gData[1].lat = houseCoor[0];
        gData[1].lng = houseCoor[1];
        gData[1].size = 0;
        gData[1].color = "yellow";

        // Determine if angle is < 90
        if(angle < (Math.PI / 2)) {
            // Angle to height
            height = angleToHeight(angle);

            // Set tower height
            gData[0].size = height / rEarth;

            // Update on screen text
            if(height < 100) {
                // Round to one decimal
                height = Math.round(height * 10) / 10;
            }
            else{
                // Round to int
                height = Math.round(height);
            }
            document.getElementById("result").innerHTML = height.toLocaleString() + "m";

            // Add fun fact
            document.getElementById("fact").innerHTML = getFact(height);

            // Create dashed LOS line
            rEarthLine = 100;
            observerHeightLine = observerHeight / rEarth;
            offset = 1.001;
            let startVector = new THREE.Vector3(
                houseVec[1] * rEarthLine * offset,
                houseVec[2] * rEarthLine * offset,
                houseVec[0] * rEarthLine * offset
            );
            let endVector = new THREE.Vector3(
                hereVec[1] * (1+observerHeightLine+gData[0].size) * rEarthLine * offset,
                hereVec[2] * (1+observerHeightLine+gData[0].size) * rEarthLine * offset,
                hereVec[0] * (1+observerHeightLine+gData[0].size) * rEarthLine * offset
            );
            let linePoints = [];
            linePoints.push(startVector, endVector);
            var lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
            let line = new THREE.LineSegments(lineGeo, lineMaterial);
            line.computeLineDistances();
            scene.add(line);

            // Adjust camera to frame locations, roughly scaling by tower height.
            cameraZoom = Math.min(300 + gData[0].size * 300, 1700);
            verticalOffset = 0.5; // Bias view towards equator to view tower at angle.
            camera.position.x = (houseVec[1]+hereVec[1]) * 0.5 * cameraZoom;
            camera.position.y = (houseVec[2]+hereVec[2]) * 0.5 * cameraZoom
                * verticalOffset;
            camera.position.z = (houseVec[0]+hereVec[0]) * 0.5 * cameraZoom;
            
            orbControls.autoRotate = false;
            
        }
        else {
            displayError("No possible height: angle >90 degrees!");
        }
        Globe.pointsData(gData);
        return;
    }

    // Handler for submit button
    // Send inputs to backend
    $(".submit").click(async function () {
        // If loading gif is present, do nothing (currently processing request).
        if (document.getElementById("loadingGif").style.display == "inline") {
            return
        }
        // Set loading gif
        document.getElementById("loadingGif").style.display = "inline";


        house = document.getElementById("house").value;
        here = document.getElementById("here").value;

        houseCoor = await getLocation(house);
        hereCoor = await getLocation(here);

        // If LOS line exists, remove it
        if (scene.children[scene.children.length - 1].type == "LineSegments") {
            scene.remove(scene.children[scene.children.length - 1]);
        }

        // Clear current fact
        document.getElementById("fact").innerHTML = "";

        if ((houseCoor[0] != "error") && (hereCoor[0] != "error")) {
            parseCoorPair(houseCoor, hereCoor);
        }

        // Remove loading gif
        document.getElementById("loadingGif").style.display = "none";
    });

    $(".globeTextureButton").click(async function () {
        globeImageIndex = ++globeImageIndex % globeImages.length;
        Globe.globeImageUrl(globeImages[globeImageIndex]);
    });

        // Goto next field if user pressed enter in house input.
        document.getElementById("house").addEventListener("keyup", event => {
            if (event.key === "Enter") {
                // Cancel the default action, if needed
                event.preventDefault();
                // Focus on next input
                document.getElementById("here").focus();
            }
        });

    // Submit if user presses enter when in here input.
    document.getElementById("here").addEventListener("keyup", event => {
        if (event.key === "Enter") {
            // Cancel the default action, if needed
            event.preventDefault();
            // Trigger the submit button with a click
            document.getElementById("submit_button").click();
        }
    });

    // Disable touchevents for canvas
    var canvas_dom = document.querySelector("canvas");
    canvas_dom.addEventListener("touchstart", function(event) {event.preventDefault()});
    canvas_dom.addEventListener("touchmove", function(event) {event.preventDefault()});
    canvas_dom.addEventListener("touchend", function(event) {event.preventDefault()});
    canvas_dom.addEventListener("touchcancel",function(event) {event.preventDefault()});

    const N = 2;
    gData = [...Array(N).keys()].map(() => ({
      lat: 0,
      lng: 0,
      size: 0,
      color: "red"
    }));

    var lineVertShader = `
        attribute float lineDistance;
        varying float vLineDistance;
        
        void main() {
            vLineDistance = lineDistance;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            gl_Position = projectionMatrix * mvPosition;
        }
    `;

    var lineFragShader = `
        uniform vec3 diffuse;
        uniform float opacity;
        uniform float time; // added time uniform

        uniform float dashSize;
        uniform float gapSize;
        uniform float dotSize;
        varying float vLineDistance;
        
        void main() {
                float totalSize = dashSize + gapSize;
                float modulo = mod( vLineDistance + time, totalSize ); // time added to vLineDistance
            float dotDistance = dashSize + (gapSize * .5) - (dotSize * .5);
            
            if ( modulo > dashSize && mod(modulo, dotDistance) > dotSize ) {
            discard;
            }

            gl_FragColor = vec4( diffuse, opacity );
        }
    `;

    var lineMaterial = new THREE.ShaderMaterial({
        uniforms: {
            diffuse: {value: new THREE.Color("white")},
            dashSize: {value: 2},
            gapSize: {value: 2},
            dotSize: {value: 0.0},
            opacity: {value: 1.0},
            time: {value: 0}
        },
        vertexShader: lineVertShader,
        fragmentShader: lineFragShader,
        transparent: true        
    });

    lineMaterial.linewidth = 40;

    var clock = new THREE.Clock();
    var timeLine = 0;

    // Renderer, camera, scene
    const  renderer = new THREE.WebGLRenderer({canvas: document.querySelector("canvas")});
    const  camera = new THREE.PerspectiveCamera(70, 2, 1, 10000);
    camera.position.z = 400;
    const scene = new THREE.Scene();

    // Lights
    scene.add(new THREE.AmbientLight(0xffeeee, 1.15));
    const light1 = new THREE.PointLight(0xffdddd, .1, 0);
    light1.position.set(300, 300, 300);
    scene.add(light1);

    globeImages = ["images/earth.png",
        "//unpkg.com/three-globe@2.24.4/example/img/earth-blue-marble.jpg"];
    globeImageIndex = 0;

    // Globe
    Globe = new ThreeGlobe()
    .globeImageUrl(globeImages[globeImageIndex])
    .bumpImageUrl("//unpkg.com/three-globe@2.24.4/example/img/earth-topology.png")
    .pointAltitude("size")
    .pointRadius(0.7)
    .pointColor("color")
    .pointsTransitionDuration(0)

    // Specular highlights for water
    const globeMaterial = Globe.globeMaterial();
    globeMaterial.bumpScale = 10;
    new THREE.TextureLoader().load("//unpkg.com/three-globe@2.24.4/example/img/earth-water.png", texture => {
        globeMaterial.specularMap = texture;
        globeMaterial.specular = new THREE.Color("white");
        globeMaterial.shininess = 15;
    });

    scene.add(Globe);
    
    // Add camera controls
    const orbControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbControls.minDistance = 120;
    orbControls.maxDistance = 2000;
    orbControls.rotateSpeed = 2;
    orbControls.zoomSpeed = 0.7;
    orbControls.autoRotate = true;
    orbControls.autoRotateSpeed = 0.5;
    orbControls.enableDamping = true;
    orbControls.dampingFactor = 0.5;
    orbControls.enablePan = false;
    
    function resizeCanvasToDisplaySize() {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (canvas.width !== width ||canvas.height !== height) {
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }
    }
    
    function animate(time) {
        time *= 0.001;  // seconds
        orbControls.update();
        resizeCanvasToDisplaySize();
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
        timeLine += clock.getDelta();
        lineMaterial.uniforms.time.value = 4 * timeLine;
    }
    
    requestAnimationFrame(animate);
});