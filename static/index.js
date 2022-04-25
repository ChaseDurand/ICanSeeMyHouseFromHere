$(document).ready(function () {
    // Connect to the Socket.IO server.
    // The connection URL has the following format, relative to the current page:
    //     http[s]://<domain>:<port>[/<namespace>]
    var socket = io();

    // Event handler for new connections.
    // The callback function is invoked when a connection with the
    // server is established.
    socket.on('connect', function () {
        socket.emit('my_event', { data: 'I\'m connected!' });
    });

    // Event handler for server sent data.
    // The callback function is invoked whenever the server emits data
    // to the client. The data is then displayed in the 'Received'
    // section of the page.
    socket.on('my_response', function (msg, cb) {
        $('#log').append('<br>' + $('<div/>').text('Received #' + msg.count + ': ' + msg.data).html());
        if (cb)
            cb();
    });

    // Handler for submit button
    // Send inputs to backend
    $('.submit').click(function () {
       house = document.getElementById('house').value;
       here = document.getElementById('here').value;
       socket.emit('submit_event', { 'house': house, 'here': here});
    });

    // Handler for results from backend
    socket.on('submit_response', function (msg) {
        // If LOS line exists, remove it
        if (scene.children[scene.children.length - 1].type == "LineSegments") {
            scene.remove(scene.children[scene.children.length - 1]);
        }

        if(msg["statusMsg"] != "OK") {
            // Error from backend
            document.getElementById('result').innerHTML = msg["statusMsg"];
            Globe.pointsData(Array());
        }
        else {
            
            // Success from backend
            document.getElementById('result').innerHTML = msg["height"] + "m";
            gData[0].lat = msg["hereLat"];
            gData[0].lng = msg["hereLng"];
            rEarth = 6371000 // Radius of the Earth in meters
            gData[0].size = msg["height"] / rEarth;
            gData[1].lat = msg["houseLat"];
            gData[1].lng = msg["houseLng"];
            gData[1].size = 0;
            gData[1].color = 'yellow';

            // radiusRatio = 2;
            // radiusMin = 1;
            // radiusMax = 30;
            // radiusTmp = Math.max(radiusRatio * msg["height"], radiusMin);
            // gData[0].pointRadius = Math.min(radiusTmp, radiusMax);
            console.log(gData[0]);
            console.log(Globe);
            // Globe.pointRadius = 0.1;
            Globe.pointsData(gData);

            // Create LOS line
            rEarthLine = 100;
            observerHeight = 1.7 / 6371000;
            offset = 1.001;

            let startVector = new THREE.Vector3(
                msg["houseY"] * rEarthLine * offset,
                msg["houseZ"] * rEarthLine * offset,
                msg["houseX"] * rEarthLine * offset
            );
            let endVector = new THREE.Vector3(
                msg["hereY"] * (1+observerHeight+gData[0].size) * rEarthLine * offset,
                msg["hereZ"] * (1+observerHeight+gData[0].size) * rEarthLine * offset,
                msg["hereX"] * (1+observerHeight+gData[0].size) * rEarthLine * offset
            );

            let linePoints = [];
            linePoints.push(startVector, endVector);

            var lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);

            let line = new THREE.LineSegments(lineGeo, lineMaterial);
            line.computeLineDistances();

            scene.add(line);
        }
    });

    // Submit if user presses enter when in text inputs.
    document.querySelectorAll("input.location_input").forEach(item => {
        item.addEventListener("keyup", event => {
            if (event.key === "Enter") {
                // Cancel the default action, if needed
                event.preventDefault();
                // Trigger the submit button with a click
                document.getElementById("submit_button").click();
            }
        });
    });

    //-----------
    // Globe
    //-----------
    const N = 2;
    gData = [...Array(N).keys()].map(() => ({
      lat: 0,
      lng: 0,
      size: 0,
      color: 'red'
    }));

    Globe = new ThreeGlobe()
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .pointAltitude('size')
      .pointRadius(0.7)
      .pointColor('color')
      .pointsTransitionDuration(0)

    // custom globe material
    const globeMaterial = Globe.globeMaterial();
    globeMaterial.bumpScale = 10;
    new THREE.TextureLoader().load('//unpkg.com/three-globe/example/img/earth-water.png', texture => {
      globeMaterial.specularMap = texture;
      globeMaterial.specular = new THREE.Color('grey');
      globeMaterial.shininess = 15;
    });

    // Setup renderer
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('globeViz').appendChild(renderer.domElement);

    // Setup scene
    const scene = new THREE.Scene();
    scene.add(Globe);
    scene.add(new THREE.AmbientLight(0xbbbbbb));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.65));

    // Setup camera
    const camera = new THREE.PerspectiveCamera();
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    camera.position.z = 500;

    // Add camera controls
    const orbControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbControls.minDistance = 101;
    orbControls.maxDistance = 2000;
    orbControls.rotateSpeed = 2;
    orbControls.zoomSpeed = 0.7;
    orbControls.autoRotate = true;
    orbControls.autoRotateSpeed = 0.5;
    orbControls.enableDamping = true;
    orbControls.dampingFactor = 0.5;
    orbControls.enablePan = false;

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
    var time = 0;

    // Kick-off renderer
    (function animate() {
        // Frame cycle
        orbControls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
        time += clock.getDelta();
        lineMaterial.uniforms.time.value = time;
    })();


    

});