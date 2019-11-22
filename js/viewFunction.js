// Create the scene and a camera to view it
var scene = new THREE.Scene();
var container;
var objects = []
var mesh; // the plane mesh to display image
var dots; //control points
var controls;
/**
* Camera
**/

// Specify the portion of the scene visiable at any time (in degrees)
var fieldOfView = 75;

// Specify the camera's aspect ratio
var aspectRatio = window.innerWidth / window.innerHeight;

// Specify the near and far clipping planes. Only objects
// between those planes will be rendered in the scene
// (these values help control the number of items rendered
// at any given time)
var nearPlane = 0.1;
var farPlane = 1000;

// Use the values specified above to create a camera
var camera = new THREE.PerspectiveCamera(
  fieldOfView, aspectRatio, nearPlane, farPlane
);

// Finally, set the camera's position in the z-dimension
camera.position.z = 5;

// Create the normal
var normalMatrix = new THREE.Matrix3();

// Create ModelView matrix
var modelViewMatrix = new THREE.Matrix4();

//Create Projection matrix
var projectionMatrix = new THREE.Matrix4();
var p2TexMatrix = new THREE.Matrix4();


var modelViewMatrixStack = [];

// the vertices of the back panel
var squareVertices = [
    -0.5, -0.5, 0.0,
    -0.5,  0.5, 0.0,
     0.5,  0.5, 0.0,
     0.5, -0.5, 0.0,
     0.0,  0.0, 0.0
];

// 4 vanishing lines consist of 8 vertices 
var vanishingLineVertices = [
    0.0,  0.0, 0.0,
   -0.5, -0.5, 0.0,
    0.0,  0.0, 0.0,
   -0.5,  0.5, 0.0,
    0.0,  0.0, 0.0,
    0.5,  0.5, 0.0,
    0.0,  0.0, 0.0,
    0.5, -0.5, 0.0,
    0.0,  0.0, 0.0,
   -0.5, -0.5, 0.0,
    0.0,  0.0, 0.0,
   -0.5,  0.5, 0.0,
    0.0,  0.0, 0.0,
    0.5,  0.5, 0.0,
    0.0,  0.0, 0.0,
    0.5, -0.5, 0.0,
];

// //-------------------------//
// // View parameters
// var eyePos = new THREE.Vector3(0.0, 0.0, 0.0);
// var viewDir = new THREE.Vector3(0.0, 0.0, -1.0);
// var up = new THREE.Vector3(0.0,1.0,0.0);
// var viewPos = new THREE.Vector3(0.0,0.0,0.0);
// //--------------------------//

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
}

/**
 * Apply quaternion to eye's up vector and look at vector based on user input
 */
function handleKeys() {
    if (currentlyPressedKeys[87] || currentlyPressedKeys[38]) { // case W or up arrow 
        eyePos.add(new THREE.Vector3(0, 0, -0.005));
    }
    if (currentlyPressedKeys[83] || currentlyPressedKeys[40]) { // case S or down arrow
        eyePos.add(new THREE.Vector3(0, 0, 0.005));
    }
    if (currentlyPressedKeys[65] || currentlyPressedKeys[37]) { // case A or left arrow
        eyePos.add(new THREE.Vector3(-0.005, 0, 0));
    }
    if (currentlyPressedKeys[68] || currentlyPressedKeys[39]) { // case A or right arrow
        eyePos.add(new THREE.Vector3(0.005, 0, 0));
    }
    if (currentlyPressedKeys[73]) { // Case I
        eyePos.add(new THREE.Vector3(0, -0.005, 0));
    }
    if (currentlyPressedKeys[75]) { // Case K
        eyePos.add(new THREE.Vector3(0, 0.005, 0));
    }
}

var loader = new THREE.ImageLoader();

// load image source
loader.load(
	'../image/building.png',

	function ( image ) {
		// use the image, e.g. draw part of it on a canvas
		var canvas = document.createElement( 'canvas' );
		var context = canvas.getContext( '2d' );
		context.drawImage( image, 100, 100 );
	},

	undefined,

	// onError
	function () {
		console.error( 'An error happened.' );
	}
);

init()
  
function init(){
    document.getElementById('userImage').addEventListener('change', function(e) {

    var userImage = e.target.files[0];     
    var userImageURL = URL.createObjectURL( userImage );

    container = document.getElementById('container');      
    // camera = new THREE.OrthographicCamera();
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    var loader = new THREE.TextureLoader();
    var material = new THREE.MeshLambertMaterial({
        map: loader.load(userImageURL)
    });

    // create a plane geometry for the image with a width of 10
    // and a height that preserves the image's aspect ratio
    var planeGeometry = new THREE.PlaneGeometry(10, 10*.75);
    mesh = new THREE.Mesh(planeGeometry, material);
    mesh.name = 'planeMeshObject';
    // console.log("plane vertices", planeGeometry.vertices)
    mesh.position.set(0,0,0);

    controls = new THREE.OrbitControls( camera, renderer.domElement  );
    //controls.addEventListener( 'change', render );
    controls.enabled = false;

    scene.add(mesh);

    // for (var i = 0; i <)
    console.log("vertices", planeGeometry.vertices)
    for (var i = 0; i <4; i ++) {
        var worldLoc = mesh.worldToLocal(planeGeometry.vertices[i]);
        console.log("worldToLocal", worldLoc);
        var x = (planeGeometry.vertices[i].x/ window.innerWidth) * 2 - 1;
        var y = -(planeGeometry.vertices[i].y / window.innerHeight) * 2 + 1;
        console.log("X", x)
        console.log("Y", y)

    }

    //console.log("focal length", camera.getFocalLength());

    // Add a point light with #fff color, .7 intensity, and 0 distance
    var light = new THREE.PointLight( 0xffffff, 1, 0 );

    // Specify the light's position
    light.position.set(1, 1, 100 );

    // Add the light to the scene
    scene.add(light)
    addControlPoints();
    animate();
    } ); 
}

function animate() {
    requestAnimationFrame(animate);
    camera.lookAt(scene.position);
    controls.update();
    // if (controls != null) {
    //     controls.update();
    // }
    renderer.render(scene, camera);
}

// var controlPoints;

function addControlPoints() {
    // var dotGeometry = new THREE.Geometry();
    // dotGeometry.vertices.push(new THREE.Vector3( 0, 0, 0));
    // var dotMaterial = new THREE.PointsMaterial( { size: 1, sizeAttenuation: false } );
    // var dot = new THREE.Points( dotGeometry, dotMaterial );
    var controlPoints = new THREE.Geometry();
    controlPoints.vertices.push(new THREE.Vector3());
    controlPoints.vertices.push(new THREE.Vector3(-2, -2, 0.0));
    controlPoints.vertices.push(new THREE.Vector3(-2,  2, 0.0));
    controlPoints.vertices.push(new THREE.Vector3(2,  2, 0.0));
    controlPoints.vertices.push(new THREE.Vector3(2, -2, 0.0));
    var dotMaterial = new THREE.PointsMaterial( { size: 0.2, color: "blue" } );
    dots = new THREE.Points( controlPoints, dotMaterial );
    dots.name = 'controlPoints';
    objects.push(dots);
    scene.add(dots);

    // var mouse = new THREE.Vector2();
    // the points where vanishing points intersect the image border
    var upEdge = new THREE.Line3(mesh.geometry.vertices[0], mesh.geometry.vertices[1]);
    var upEdgeOpposite = new THREE.Line3(mesh.geometry.vertices[1], mesh.geometry.vertices[0]);
    var bottomEdge = new THREE.Line3(mesh.geometry.vertices[2], mesh.geometry.vertices[3]);
    var bottomEdgeOpposite = new THREE.Line3(mesh.geometry.vertices[3], mesh.geometry.vertices[2]);
    var leftEdge = new THREE.Line3(mesh.geometry.vertices[0], mesh.geometry.vertices[2]);
    var rightEdge = new THREE.Line3(mesh.geometry.vertices[1], mesh.geometry.vertices[3]);

    var vanishingLineLowerLeft =  new THREE.Line3(controlPoints.vertices[0], controlPoints.vertices[1]);
    var vanishingLineUpperLeft =  new THREE.Line3(controlPoints.vertices[0], controlPoints.vertices[2]);
    var vanishingLineUpperRight =  new THREE.Line3(controlPoints.vertices[0], controlPoints.vertices[3]);
    var vanishingLineLowerRight =  new THREE.Line3(controlPoints.vertices[0], controlPoints.vertices[4]);
    var edgePoints = new THREE.Geometry();
    var ulIntersection = getIntersectionOnAPoint(upEdge, vanishingLineUpperLeft);
    if (ulIntersection == null) {
        ulIntersection = getIntersectionOnAPoint(leftEdge, vanishingLineUpperLeft);
    } 
    edgePoints.vertices.push(ulIntersection);
    var urIntersection = getIntersectionOnAPoint(upEdgeOpposite, vanishingLineUpperRight);
    if (urIntersection == null) {
        urIntersection = getIntersectionOnAPoint(rightEdge, vanishingLineUpperRight);
    } 
    edgePoints.vertices.push(urIntersection);
    var llIntersection = getIntersectionOnAPoint(bottomEdge, vanishingLineLowerLeft);
    if (llIntersection == null) {
        llIntersection = getIntersectionOnAPoint(leftEdge, vanishingLineLowerLeft);
    } 
    edgePoints.vertices.push(llIntersection);
    var lrIntersection = getIntersectionOnAPoint(bottomEdgeOpposite, vanishingLineLowerRight);
    if (lrIntersection == null) {
        lrIntersection = getIntersectionOnAPoint(rightEdge, vanishingLineLowerRight);
    } 
    edgePoints.vertices.push(lrIntersection);
    var edgeDotMaterial = new THREE.PointsMaterial( { size: 0.2, color: "green" } );
    var edgeDotMesh = new THREE.Points( edgePoints, edgeDotMaterial );
    edgeDotMesh.name = 'edgePoints';
    scene.add(edgeDotMesh);

    // var lineGeometry = new THREE.Geometry();

    // var line = new THREE.Line3(controlPoints.vertices[0], controlPoints.vertices[1])
    // var lineMaterial = new THREE.LineBasicMaterial( { color: "red" } );
    // var lineMesh=new THREE.Line(
    //     line,//the line3 geometry you have yet
    //     lineMaterial
    // );
    //scene.add(lineMesh);
    var lineMaterial = new THREE.LineBasicMaterial( { color: "red" } );
    var line = new THREE.Line( controlPoints, lineMaterial );
    line.name = 'vanishingLine'
    var positions = line.geometry.vertices;
    // Add the other lines connecting vanishing point to vertices
    positions.push(controlPoints.vertices[1]);
    positions.push(controlPoints.vertices[0]);
    positions.push(edgePoints.vertices[0]);
    positions.push(controlPoints.vertices[0]);
    positions.push(edgePoints.vertices[1]);
    positions.push(controlPoints.vertices[0]);
    positions.push(edgePoints.vertices[2]);
    positions.push(controlPoints.vertices[0]);
    positions.push(edgePoints.vertices[3]);
    scene.add(line);


    var raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 0.25;
    var mouse = new THREE.Vector2();
 
    // Get mouse world coordinates with offset in screen 
    function getMouse(event) {
        var rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ( ( event.clientX - rect.left ) / ( rect.width - rect.left ) ) * 2 - 1;
        mouse.y = - ( ( event.clientY - rect.top ) / ( rect.bottom - rect.top) ) * 2 + 1;
        //mouse.z = 0.5;
        // console.log("mouse-x", mouse.x);
        // console.log("mouse-y", mouse.y);
    }

    //var intersects = null;
    var dragging = false;
    var currentIndex = null;

    window.addEventListener("mousedown", mouseDown, false);
    function mouseDown(event) {
        event.preventDefault();
        dragging = true;
        getMouse(event);
        // console.log("mouseX", mouse.x);
        // console.log("mouseY", mouse.y);
        // raycaster.setFromCamera( mouse, camera );
        //objects = []
        //dots = new THREE.Points( controlPoints, dotMaterial );
        //objects.push(dots);
        // for (var i = 0; i < 5; i ++) {
        //     console.log("vertex", i, dots.geometry.vertices[i]);
        // }
        setRaycaster(event)
        var intersects = raycaster.intersectObjects(objects);
        if (intersects.length > 0) {
            currentIndex = intersects[0].index;
            console.log("intersects", currentIndex);
        }

        // console.log(intersects)
    }

    window.addEventListener("mousemove", mouseMove, false);
    function mouseMove(event) {
        //console.log("current index", currentIndex)
        if (dragging && currentIndex !== null) { //dragging &&
            //console.log("moving");
            setRaycaster(event);
            // console.log("mouseX", mouse.x);
            // console.log("mouseY", mouse.y);
            // console.log("ray", raycaster.ray);
            // raycaster.ray.intersectPlane(plane, planePoint);
            // console.log("intersection pt", planePoint);
            var planes = []
            planes.push(mesh)
            //var intersectionPoint;
            var intersects = raycaster.intersectObjects(planes);
            if (intersects.length > 0) {
                //console.log("intersection point", intersects[0].point);
                dots.geometry.vertices[currentIndex].setX(intersects[0].point.x);
                dots.geometry.vertices[currentIndex].setY(intersects[0].point.y);
                // update positions of the neighboring vertices so the rear plane is a rectangle
                // 0-center(vanish point) 1-lowerleft 2-upperleft 3-upperright 4-lowerright
                if (currentIndex == 1) {
                    dots.geometry.vertices[2].setX(intersects[0].point.x);
                    dots.geometry.vertices[4].setY(intersects[0].point.y);
                }
                if (currentIndex == 2) {
                    dots.geometry.vertices[1].setX(intersects[0].point.x);
                    dots.geometry.vertices[3].setY(intersects[0].point.y);
                }
                if (currentIndex == 3) {
                    dots.geometry.vertices[4].setX(intersects[0].point.x);
                    dots.geometry.vertices[2].setY(intersects[0].point.y);
                }
                if (currentIndex == 4) {
                    dots.geometry.vertices[3].setX(intersects[0].point.x);
                    dots.geometry.vertices[1].setY(intersects[0].point.y);
                }
                dots.geometry.verticesNeedUpdate = true;

                // update the intersection points on the edges
                vanishingLineLowerLeft =  new THREE.Line3(dots.geometry.vertices[0], dots.geometry.vertices[1]);
                vanishingLineUpperLeft =  new THREE.Line3(dots.geometry.vertices[0], dots.geometry.vertices[2]);
                vanishingLineUpperRight =  new THREE.Line3(dots.geometry.vertices[0], dots.geometry.vertices[3]);
                vanishingLineLowerRight =  new THREE.Line3(dots.geometry.vertices[0], dots.geometry.vertices[4]);
                ulIntersection = getIntersectionOnAPoint(upEdge, vanishingLineUpperLeft);
                if (ulIntersection == null) {
                    ulIntersection = getIntersectionOnAPoint(leftEdge, vanishingLineUpperLeft);
                } 
                edgeDotMesh.geometry.vertices[0].setX(ulIntersection.x);
                edgeDotMesh.geometry.vertices[0].setY(ulIntersection.y);
                urIntersection = getIntersectionOnAPoint(upEdgeOpposite, vanishingLineUpperRight);
                if (urIntersection == null) {
                    urIntersection = getIntersectionOnAPoint(rightEdge, vanishingLineUpperRight);
                } 
                edgeDotMesh.geometry.vertices[1].setX(urIntersection.x);
                edgeDotMesh.geometry.vertices[1].setY(urIntersection.y);
                llIntersection = getIntersectionOnAPoint(bottomEdge, vanishingLineLowerLeft);
                if (llIntersection == null) {
                    llIntersection = getIntersectionOnAPoint(leftEdge, vanishingLineLowerLeft);
                } 
                edgeDotMesh.geometry.vertices[2].setX(llIntersection.x);
                edgeDotMesh.geometry.vertices[2].setY(llIntersection.y);
                lrIntersection = getIntersectionOnAPoint(bottomEdgeOpposite, vanishingLineLowerRight);
                if (lrIntersection == null) {
                    lrIntersection = getIntersectionOnAPoint(rightEdge, vanishingLineLowerRight);
                } 
                edgeDotMesh.geometry.vertices[3].setX(lrIntersection.x);
                edgeDotMesh.geometry.vertices[3].setY(lrIntersection.y);
                edgeDotMesh.geometry.verticesNeedUpdate = true;

            }
            //console.log("old pos z", geometry.attributes.position.z)
            // var xy = getMouseWithoutOffset(event);
            // controlPoints.vertices[currentIndex].setX(xy.x);
            // controlPoints.vertices[currentIndex].setY(xy.y);
            // console.log("x", planePoint.x);
            // console.log("y", planePoint.y);
            //controlPoints.attributes.position.setXY(currentIndex, planePoint.x, planePoint.y);
            //controlPoints.attributes.position.needsUpdate = true;
            //controlPoints.verticesNeedUpdate = true;
            //dots = new THREE.Points( controlPoints, dotMaterial );
        }
    }

    window.addEventListener("mouseup", mouseUp, false);
    function mouseUp(event) {
        //console.log("Mouse up")
        dragging = false;
        currentIndex = null;
    }



    function setRaycaster(event) {
        getMouse(event);
        //console.log("mouse-x", )
        raycaster.setFromCamera(mouse, camera);
        //console.log("ray", raycaster.ray.direction);
    }

}

//-------------------------oldsection////
// https://discourse.threejs.org/t/solved-how-to-find-intersection-between-two-rays/6464/5
function isPositive( start, end, intersection ){ // all parameters are THREE.Vector3()
    let v1 = new THREE.Vector3().copy( end ).sub( start );
    let v2 = new THREE.Vector3().copy( intersection ).sub( start );
    return v1.dot( v2 ) >= 0;
}

// params (THREE.Line3, THREE.Line3)
function getIntersectionOnAPoint(line1, line2)
{ 
    var intersection = null;
    var A = line1.start;
    var B = line1.end;
    var C = line2.start;
    var D = line2.end;

    // Line AB represented as a1x + b1y = c1 
    var a1 = B.y - A.y; 
    var b1 = A.x - B.x; 
    var c1 = a1*(A.x) + b1*(A.y); 

    // Line CD represented as a2x + b2y = c2 
    var a2 = D.y - C.y; 
    var b2 = C.x - D.x; 
    var c2 = a2*(C.x)+ b2*(C.y); 

    var determinant = a1*b2 - a2*b1; 

    if (determinant != 0) { 
        var x = (b2*c1 - b1*c2)/determinant; 
        var y = (a1*c2 - a2*c1)/determinant; 
        intersection = new THREE.Vector3(x, y); 
    }
  
    // if there is an intersection. verify intersection occurs on the two line segments
    // when calculating from start to end
    if (intersection) {
        var line1result = isPositive( line1.start, line1.end, intersection );
        var line2result = isPositive( line2.start, line2.end, intersection );
        if ( line1result && line2result ) {
            // do nothing when the intersection is not "false" as both results are "true"
    }
    else { // 
        // set intersection to null when the intersection is "false" as one of results is "false"
        intersection = null;
    }
    }
    return intersection;
}

function calculateLineIntersection(line1,  line2) {
    // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
    var denominator;
    var a, b;
    var numerator1, numerator2;
    var result = null;
    denominator = ((line2.end.y - line2.start.y) * (line1.end.x - line1.start.x)) - ((line2.end.x - line2.start.x) * (line1.end.y - line1.start.y));
    if (denominator == 0) {
        return result;
    }
    a = line1.start.y - line2.start.y;
    b = line1.start.x - line2.start.x;
    numerator1 = ((line2.end.x - line2.start.x) * a) - ((line2.end.y - line2.start.y) * b);
    numerator2 = ((line1.end.x - line1.start.x) * a) - ((line1.end.y - line1.start.y) * b);
    a = numerator1 / denominator;
    b = numerator2 / denominator;

    // if we cast these lines infinitely in both directions, they intersect here:
    var intersect_x = line1.start.x + (a * (line1.end.x - line1.start.x));
    var intersect_y = line1Start.y + (a * (line1.end.y - line1.start.y));
    result = new THREE.Vector3(intersect_x , intersect_y);

/*
        // it is worth noting that this should be the same as:
        x = line2StartX + (b * (line2EndX - line2StartX));
        y = line2StartX + (b * (line2EndY - line2StartY));
        */
    // if line1 is a segment and line2 is infinite, they intersect if:
    // if (a > 0 && a < 1) {
    //     result.onLine1 = true;
    // }
    // // if line2 is a segment and line1 is infinite, they intersect if:
    // if (b > 0 && b < 1) {
    //     result.onLine2 = true;
    // }
    // if line1 and line2 are segments, they intersect if both of the above are true
    return result;
};

function calculateDepth() {
    // 0-center(vanish point) 1-lowerleft 2-upperleft 3-upperright 4-lowerright
    //     0: Vector3 {x: -5, y: 3.75, z: 0}
    // 1: Vector3 {x: 5, y: 3.75, z: 0}
    // 2: Vector3 {x: -5, y: -3.75, z: 0}
    // 3: Vector3 {x: 5, y: -3.75, z: 0}
    var h = mesh.geometry.vertices[0].y - dots.geometry.vertices[0].y;
    var l = dots.geometry.vertices[0].y - mesh.geometry.vertices[2].y;
    var a = dots.geometry.vertices[2].y - dots.geometry.vertices[0].y;
    var b = dots.geometry.vertices[0].y - dots.geometry.vertices[1].y;
    var f = camera.getFocalLength();
    var d_top = h * f /a -f;
    var d_bottom = l * f/b - f;
    var wl = dots.geometry.vertices[0].x - mesh.geometry.vertices[0].x;
    var wr = mesh.geometry.vertices[1].x - dots.geometry.vertices[0].x ;
    var c = dots.geometry.vertices[0].x - dots.geometry.vertices[2].x;
    var d = dots.geometry.vertices[3].x - dots.geometry.vertices[0].x;
    var d_left = wl * f/c - f;
    var d_right = wr * f/d - f;
    var ah = (f + d_top)*a/f;
    var bh = (f + d_bottom)*b/f;
    var cw = (f + d_left)*c/f;
    var dw = (f + d_right)*d/f;
    var rear_height = ah + bh;
    var rear_width = cw + dw;
    // console.log("h", h);
    // console.log("l", l);
     console.log("f", f);
    // console.log("a", a);
    // console.log("b", b);
    console.log("d_bottom", d_bottom);
    //console.log("1y", dots.geometry.vertices[0].y - dots.geometry.vertices[1].y);
    console.log("d_top", d_top);
    // console.log("wl", wl);
    // console.log("wr", wr);
    // console.log("c", c);
    // console.log("d", d);
    console.log("d_left", d_left);
    console.log("d_right", d_right);
    // console.log("rear_height", rear_height);
    // console.log("rear_width", rear_width);
    //console.log("ah bh cw dw", ah, bh, cw, dw); 
    //dots.geometry.vertices.push( new THREE.Vector3( -rear_width/2,  rear_height/2, d_bottom ));
    //dots.geometry.verticesNeedUpdate = true;
    createFaceGeometry(d_top, d_bottom, d_left, d_right);
    controls.enabled = true;
}

function createFaceGeometry(d_top, d_bottom, d_left, d_right) {
    var box_geometry = new THREE.Geometry();

    // 0: Vector3 {x: -5, y: 3.75, z: 0}
    // 1: Vector3 {x: 5, y: 3.75, z: 0}
    // 2: Vector3 {x: -5, y: -3.75, z: 0}
    // 3: Vector3 {x: 5, y: -3.75, z: 0}
    var half_w = Math.abs(mesh.geometry.vertices[0].x);
    var half_h = Math.abs(mesh.geometry.vertices[0].y);
    // vertices
    var depth = Math.max(d_top, d_bottom, d_left, d_right);
    // box_geometry.vertices = [
    //     new THREE.Vector3( -half_w,  -half_h, -depth ) , //       (dummy 0)
    //     new THREE.Vector3( -half_w,  -half_h, -depth ) , //       (1)
    //     new THREE.Vector3( half_w,  -half_h, -depth ), //       (2)
    //     new THREE.Vector3( -half_w,  -half_h,  -depth + d_bottom ), //       (3)
    //     new THREE.Vector3( half_w,  -half_h, -depth + d_bottom ), //       (4)
    //     new THREE.Vector3( -half_w,  -half_h, -depth + d_left ), //       (5)
    //     new THREE.Vector3( half_w,  -half_h,  -depth + d_right ), //       (6)
    //     new THREE.Vector3( -half_w,  half_h, -depth ), //       (7)
    //     new THREE.Vector3( half_w,  half_h, -depth ), //       (8)
    //     new THREE.Vector3( -half_w,  half_h, -depth + d_top ), //       (9)
    //     new THREE.Vector3( half_w,  half_h,  -depth + d_top ), //       (10)
    //     new THREE.Vector3( -half_w,  half_h,  -depth + d_left ), //       (11)
    //     new THREE.Vector3( half_w,  half_h, -depth + d_right )  //       (12)
    // ];
    box_geometry.vertices = [
        new THREE.Vector3( -half_w,  -half_h, 0 ) , //       (dummy 0)
        new THREE.Vector3( -half_w,  -half_h, 0 ) , //       (1)
        new THREE.Vector3( half_w,  -half_h, 0 ), //       (2)
        new THREE.Vector3( -half_w,  -half_h,  d_bottom ), //       (3)
        new THREE.Vector3( half_w,  -half_h,  d_bottom ), //       (4)
        new THREE.Vector3( -half_w,  -half_h, d_left ), //       (5)
        new THREE.Vector3( half_w,  -half_h,  d_right ), //       (6)
        new THREE.Vector3( -half_w,  half_h, 0 ), //       (7)
        new THREE.Vector3( half_w,  half_h, 0 ), //       (8)
        new THREE.Vector3( -half_w,  half_h, d_top ), //       (9)
        new THREE.Vector3( half_w,  half_h,  d_top ), //       (10)
        new THREE.Vector3( -half_w,  half_h,  d_left ), //       (11)
        new THREE.Vector3( half_w,  half_h, d_right )  //       (12)
    ];

    // faces must be specified in counter-clockwise order
    box_geometry.faces.push(
        // new THREE.Face4( 1, 2, 3, 4 ),  // bottom
        // new THREE.Face4( 1, 2, 7, 8 ),  // rear
        // new THREE.Face4( 1, 7, 5, 11 ),  // left
        // new THREE.Face4( 2, 8, 6, 12 ),  // right
        // new THREE.Face4( 7, 8, 9, 10) // top
        new THREE.Face3( 3, 2, 1 ),  new THREE.Face3( 3, 4, 2 ), // bottom
        new THREE.Face3( 8, 7, 1 ),  new THREE.Face3( 2, 8, 1 ), // rear
        new THREE.Face3( 1, 7, 5 ),  new THREE.Face3( 7, 11, 5 ),  // left
        new THREE.Face3( 12, 8, 2 ),  new THREE.Face3( 6, 12, 2 ),  // right
        new THREE.Face3( 10, 9, 7 ),  new THREE.Face3(8, 10, 7 ) // top
    );
  
    // normals ( since they are not specified directly )
    box_geometry.computeFaceNormals();
    box_geometry.computeVertexNormals();

    var box_material = new THREE.MeshBasicMaterial( { color : 0x00ff00 } );
    // An array of Materials
    var materialArray = [
        new THREE.MeshBasicMaterial({
            color: 0xff0000
        }),
        new THREE.MeshBasicMaterial({
            color: 0xff0000
        }),
        new THREE.MeshBasicMaterial({
            color: 0x00ff00
        }),
        new THREE.MeshBasicMaterial({
            color: 0x00ff00
        }),
        new THREE.MeshBasicMaterial({
            color: 0x0000ff
        }),
        new THREE.MeshBasicMaterial({
            color: 0x0000ff
        }),
        new THREE.MeshBasicMaterial({
            color:  0xff8000
        }),
        new THREE.MeshBasicMaterial({
            color:  0xff8000
        }),
        new THREE.MeshBasicMaterial({
            color: 0x0080ff
        }),
        new THREE.MeshBasicMaterial({
            color: 0x0080ff
        })
    ];
    box_geometry.faces.forEach(function (face, i) {
        face.materialIndex = i;
    });
    // mesh
    var box_mesh = new THREE.Mesh( box_geometry, materialArray );
    var planeObject = scene.getObjectByName('planeMeshObject');
    var pointObject = scene.getObjectByName('controlPoints');
    var lineObject = scene.getObjectByName('vanishingLine');
    var edgePointObject = scene.getObjectByName('edgePoints');
    scene.remove( planeObject );
    scene.remove( pointObject );
    scene.remove( lineObject );
    scene.remove( edgePointObject );
    scene.add( box_mesh );
    // var cubeGeometry = new THREE.CubeGeometry(5, 5, 5);
    // var cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    // var cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    //cube.rotation.y = Math.PI * 45 / 180;
   //scene.add(cube);
//     var geometry = new THREE.BoxGeometry( 1, 1, 1 );
// var material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
// var cube = new THREE.Mesh( geometry, material );
// scene.add( cube );

//     var skyboxGeometry = new THREE.CubeGeometry(10000, 10000, 10000);
// var skyboxMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
// var skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);

// scene.add(skybox);

    var pointLight = new THREE.PointLight(0xffffff);
pointLight.position.set(1, 1, 100);

scene.add(pointLight);

}


