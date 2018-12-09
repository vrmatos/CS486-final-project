/**
* Victoria Matos
* 09 December 2018
*/

// renderer
var renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor('black');
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// create a scene
var scene = new THREE.Scene();

// camera
var aspect = window.innerWidth/window.innerHeight;
var camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
camera.position.set(6.5, 10.0, 6.5);

// lights
var light_ambient = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(light_ambient);

// Generating Scene Elements
//create fog
fogColor = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(fogColor, 9.0, 25.0);

// lake
var water = water();
var gui = new dat.GUI();
var uniforms = water.material.uniforms;
var folder = gui.addFolder( 'Water' );
folder.add( uniforms.size, 'value', 5, 15, 0.1 ).name( 'size' );
folder.add( uniforms.alpha, 'value', 0.9, 1, .001 ).name( 'alpha' );
folder.open();
scene.add(water);

//create moon
var moon = moon();
scene.add(moon);

//link light source to moon, creates Shadow effect
var light_point = new THREE.PointLight();
light_point.position.set(moon.position.x, moon.position.y, moon.position.z);
scene.add(light_point);

//terrain
var mesh = generateMeshHeightField(-15, +15, 38, -15, +15, 38);
scene.add(mesh);


// stats
var stats = new Stats();
document.body.appendChild(stats.dom);

// controls
var controls = new THREE.OrbitControls(camera, renderer.domElement);

// start off animation
animate();

// -----------------------------------------------------------------------------
function animate() {

    // put this function in queue for another frame after this one
    requestAnimationFrame(animate);

    // update
    light_point.position.set(camera.position.x, camera.position.y, camera.position.z);
    controls.update();
    stats.update();

    // render
    renderer.render(scene, camera);
}

function generateMeshHeightField(xmin, xmax, nx, zmin, zmax, nz) {

    // grid index variables to be used throughout
    var i, j;

    // start an empty geometry
    var geometry = new THREE.Geometry();

    // precompute range spans for each axis
    var xrange = xmax - xmin;
    var zrange = zmax - zmin;

    // initialize grids for each coordinate (x,y,z) of a point
    x_grid = new Array(nx);
    y_grid = new Array(nx);
    z_grid = new Array(nx);
    for (i = 0; i < nx; i ++) {
        x_grid[i] = new Array(nz);
        y_grid[i] = new Array(nz);
        z_grid[i] = new Array(nz);
    }

    // set x and z as coordinates for a height field with a random y coordinate
    for (i = 0; i < nx; i++) {
        for (j = 0; j < nz; j++) {
          var x = xmin + (i*xrange)/(nx - 1);
          var z = zmin + (j*zrange)/(nz - 1);
          var y = THREE.Math.randFloat(0.0, 3.0);

          if(x*x + z*z < 12){
              y = 0;
          }
          x_grid[i][j] = x;
          z_grid[i][j] = z;
          y_grid[i][j] = y;
        }
    }

    // smoothes the y coordinate for each point
    y_grid = smooth(y_grid, nx, nz);

    // creates new points with x,y,z coordinates
    for (i = 0; i < nx; i++) {
        for (j = 0; j < nz; j++) {
            var point = new THREE.Vector3();
            point.x = x_grid[i][j];
          	point.z = z_grid[i][j];
            point.y = y_grid[i][j];
            geometry.vertices.push(point);
        }
    }

    // allocate 2D grid for indices
    index_grid = new Array(nx);
    for (i = 0; i < nx; i ++) {
        index_grid[i] = new Array(nz);
    }

    //  fills index_grid with indices such that index_grid[i][j] contains
    // the index of the point in geometry.vertices associated with values i, j
    var count = 0;
    for (i = 0; i < nx; i++) {
        for (j = 0; j < nz; j++) {
            index_grid[i][j] = count;
            count++;
        }
    }

    // traverse grid to create triangular faces
    for (i = 0; i < nx - 1; i++) {
        for (j = 0; j < nz - 1; j++) {

            // get current four corners based on index_grid and (i, j)
            var a = index_grid[i][j];
            var b = index_grid[i][j+1];
            var c = index_grid[i+1][j];
            var d = index_grid[i+1][j+1];

            // push two faces to geometry.faces
            geometry.faces.push(new THREE.Face3(b, c, a));
            geometry.faces.push(new THREE.Face3(d, c, b));

        }
    }

    // compute face and vertex normals
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();

    var texture = new THREE.TextureLoader().load( "threejs/forrest.png" );
    var material = new THREE.MeshPhongMaterial({map: texture});
    material.size = 10;


    // create mesh using geometry and material
    var mesh = new THREE.Mesh(geometry, material);
    return mesh;

}

//takes y_values and smoothes each y value in the array by averaging the values
//in the array around that y value
function smooth(y_values, nx, nz){
    y_grid = y_values;

    var total = 0;
    var count = 0;
    for(i=0; i < nx ; i++){
        for (j=0; j < nz ; j++){
            var toprow = i > 0;
            var leftcol = j > 0;
            var botrow = i < nx-1;
            var rightcol = j < nz-1;

            if (toprow){
                total += (y_values[i-1][j]);
                count++;
            }

            if(leftcol){
                total += (y_values[i][j-1]);
                count++;
            }

            if(botrow){
                total += (y_values[i+1][j]);
                count++;
            }

            if(rightcol){
                total += (y_values[i][j+1])
                count++;
            }

            if(toprow && leftcol){
                total += (y_values[i-1][j-1]);
                count++;
            }

            if(toprow && rightcol){
                total += (y_values[i-1][j+1]);
                count++;
            }

            if(botrow && leftcol){
                total += (y_values[i+1][j-1]);
                count++;
            }

            if(botrow && rightcol){
                total += (y_values[i+1][j+1]);
                count++;
            }

            //find the average
            y_grid[i][j] = y_values[i][j]*0.65 + (total/count)*0.35;
            total = 0;
            count = 0;
        }
    }
    return y_grid;
}

// creates the water element
function water() {
    var waterGeometry = new THREE.PlaneBufferGeometry( 6, 6 );
    water = new THREE.Water(
    waterGeometry,
    {
        textureWidth: 512,
        textureHeight: 512,

        //texture mapping
        waterNormals: new THREE.TextureLoader().load( 'threejs/waternormals.jpg', function ( texture ) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    } ),
    alpha: 1.0,
    waterColor: 0x0066CD,
    distortionScale: 3.7,
    fog: scene.fog !== undefined
    }
    );
    water.rotation.x = 3*Math.PI / 2;
    water.position.y = 0.4;

    return water;
}

//creates the moon element
function moon(){
    //texture mapping
    var texture = new THREE.TextureLoader().load( 'threejs/moon.png');
    var geometry = new THREE.SphereBufferGeometry( 1, 32, 32 );
    var material = new THREE.MeshBasicMaterial({map: texture});
    var moon = new THREE.Mesh( geometry, material );
    moon.position.y = 5.0;
    return moon;
}
