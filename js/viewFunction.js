document.body.classList.add("loading");
var scene = new THREE.Scene();
var planes = [];
var container;
var objects = []
var allPoints = [];
var mesh; // the plane mesh to display image
var dots; //control points
var controls;
var maskPoints; // points indicating region to be inpainted
var mask;
var maskLinePoints;
var maskLine;
var sceneCreated = false;
var front; // the edge of inpaint region
var grayMat;
var confidence;
var isophote;
var DTerm;
var priority;
var edgeDotMesh; // points on border of image
var imageMaterial;
var bottomPlane;
var topPlane;
var rearPlane;
var leftPlane;
var rightPlane;
var myImage;
var texture;
var fillRange; 
// var fillRangeOriginal;
var masku8;
var imgu8Original;
// size of the plane that displays the image
var imgPlaneWidth = 10;
var imgPlaneHeight = 7.5;
var imgHeight;
var imgWidth;
var cameraPositions = []
var currCameraPos = 0;
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
//cameraPositions.push([0, 0, 5]);

function onOpenCvReady() {
    document.body.classList.remove("loading");
}

init()
  
function init(){
    document.getElementById('userImage').addEventListener('change', function(e) {

    var userImage = e.target.files[0];   
    myImage = e.target.files[0];
    var userImageURL = URL.createObjectURL( userImage );

    container = document.getElementById('container');      
    // camera = new THREE.OrthographicCamera();
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    var loader = new THREE.TextureLoader();
    //var i_loader = new THREE.ImageLoader();
    //i_loader.load(userImageURL);
    texture = loader.load(userImageURL);
    var material = new THREE.MeshLambertMaterial({
        map: loader.load(userImageURL)
    });
    imageMaterial = new THREE.MeshBasicMaterial({
        map: loader.load(userImageURL)
    });
    //console.log("w", i_loader.tw);
    var _URL = window.URL || window.webkitURL;
    var img = new Image();
    img.onload = function () {
        imgHeight = img.height;
        imgWidth = img.width;
        //alert(width + " " + height);
        var aspectRatio = imgHeight/imgWidth;
        imgPlaneHeight = imgPlaneWidth*aspectRatio;
        var planeGeometry = new THREE.PlaneGeometry(imgPlaneWidth, imgPlaneHeight);
        mesh = new THREE.Mesh(planeGeometry, material);
        mesh.name = 'planeMeshObject';
        // console.log("plane vertices", planeGeometry.vertices)
        mesh.position.set(0,0,0);

        controls = new THREE.OrbitControls( camera, renderer.domElement  );
        //controls.addEventListener( 'change', render );
        controls.enabled = false;
        for (var i = 0; i <4; i ++) {
            var worldLoc = mesh.worldToLocal(planeGeometry.vertices[i]);
            console.log("worldToLocal", worldLoc);
            var x = (planeGeometry.vertices[i].x/ window.innerWidth) * 2 - 1;
            var y = -(planeGeometry.vertices[i].y / window.innerHeight) * 2 + 1;
            console.log("X", x)
            console.log("Y", y)

        }
        scene.add(mesh);
        planes.push(mesh);
        var light = new THREE.PointLight( 0xffffff, 1, 0 );

        // Specify the light's position
        light.position.set(1, 1, 100 );

        // Add the light to the scene
        scene.add(light)
        addControlPoints();
        animate();
    }
    img.src = _URL.createObjectURL(userImage);
    } ); 
}

function animate() {
    requestAnimationFrame(animate);
    camera.lookAt(scene.position);
    TWEEN.update();
    controls.update();
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
    for (var i = 0; i < controlPoints.vertices.length; i++) {
        allPoints.push(controlPoints.vertices[i]);
    }
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
    edgeDotMesh = new THREE.Points( edgePoints, edgeDotMaterial );
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
    var currentName = null;
    var settingForegroundMask = false;

    window.addEventListener("mousedown", mouseDown, false);
    function mouseDown(event) {
        event.preventDefault();
        dragging = true;
        getMouse(event);
        console.log("mouseX", mouse.x);
        console.log("mouseY", mouse.y);
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
            currentName = intersects[0].object.name;
            console.log("intersects", currentIndex);
        } else {
            // add new foreground object points
            var intersects = raycaster.intersectObjects(planes);
            if (maskPoints == null && !sceneCreated) {
                if (intersects.length > 0) {
                    maskPoints = new THREE.Geometry();
                    settingForegroundMask = true;
                    maskPoints.vertices.push(new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0)); // upper left
                    maskPoints.vertices.push(new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0)); // upper right
                    maskPoints.vertices.push(new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0)); // lower left
                    maskPoints.vertices.push(new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0)); // lower right
                    var maskMaterial = new THREE.PointsMaterial( { size: 0.2, color: "yellow" } );
                    mask = new THREE.Points( maskPoints, maskMaterial );
                    mask.name = "foregroundMask";
                    objects.push(mask);
                    allPoints.push(new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0));
                    scene.add(mask);
                    maskLinePoints = new THREE.Geometry();
                    maskLinePoints.vertices.push(new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0),
                                                new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0),
                                                new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0),
                                                new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0),
                                                new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0),
                                                new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0),
                                                new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0),
                                                new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0));
                    var maskLineMaterial = new THREE.LineBasicMaterial( { color: "white" } );
                    maskLine = new THREE.LineSegments(maskLinePoints, maskLineMaterial );
                    maskLine.name = "maskLine";
                    scene.add(maskLine);
                }
            } else {
                if (intersects.length > 0 && !sceneCreated) {
                    var mVertices = maskPoints.vertices;
                    mVertices.push(new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0)); // upper left
                    mVertices.push(new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0)); // upper right
                    mVertices.push(new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0)); // lower left
                    mVertices.push(new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0)); // lower right
                    maskPoints = new THREE.Geometry();
                    maskPoints.vertices = mVertices;
                    scene.remove(mask);
                    settingForegroundMask = true;
                    var maskMaterial = new THREE.PointsMaterial( { size: 0.2, color: "yellow" } );
                    mask = new THREE.Points( maskPoints, maskMaterial );
                    mask.name = "foregroundMask";
                    objects.push(mask);
                    allPoints.push(new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0));
                    scene.add(mask);

                    lineVertices = maskLinePoints.vertices;
                    lineVertices.push(new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0),
                                        new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0),
                                        new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0),
                                        new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0),
                                        new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0),
                                        new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0),
                                        new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0),
                                        new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 0));
                    maskLinePoints = new THREE.Geometry();
                    maskLinePoints.vertices = lineVertices;
                    scene.remove(maskLine);
                    var maskLineMaterial = new THREE.LineBasicMaterial( { color: "white" } );
                    maskLine = new THREE.LineSegments(maskLinePoints, maskLineMaterial );
                    maskLine.name = "maskLine";
                    scene.add(maskLine);
                }
            }
        }
    }

    window.addEventListener("mousemove", mouseMove, false);
    function mouseMove(event) {
        setRaycaster(event);
        var intersects = raycaster.intersectObjects(planes);
        if (settingForegroundMask) { // adding a new foreground object mask
            if (intersects.length > 0) {
                var n = mask.geometry.vertices.length;

                mask.geometry.vertices[n-3].setX(intersects[0].point.x);
                mask.geometry.vertices[n-2].setY(intersects[0].point.y);
                mask.geometry.vertices[n-1].setX(intersects[0].point.x);
                mask.geometry.vertices[n-1].setY(intersects[0].point.y); 
                mask.geometry.verticesNeedUpdate = true;

                maskLine.geometry.vertices[2 * n - 7].setX(intersects[0].point.x);
                maskLine.geometry.vertices[2 * n - 6].setX(intersects[0].point.x);
                maskLine.geometry.vertices[2 * n - 5].setX(intersects[0].point.x);
                maskLine.geometry.vertices[2 * n - 5].setY(intersects[0].point.y);
                maskLine.geometry.vertices[2 * n - 4].setX(intersects[0].point.x);
                maskLine.geometry.vertices[2 * n - 4].setY(intersects[0].point.y);
                maskLine.geometry.vertices[2 * n - 3].setY(intersects[0].point.y);
                maskLine.geometry.vertices[2 * n - 2].setY(intersects[0].point.y);
                maskLine.geometry.verticesNeedUpdate = true;
            }
        } else if (dragging && currentIndex !== null && currentName == "controlPoints") { // adjusting control points
            //var intersectionPoint;
            if (intersects.length > 0) {
                //console.log("intersection point", intersects[0].point);
                dots.geometry.vertices[currentIndex].setX(intersects[0].point.x);
                dots.geometry.vertices[currentIndex].setY(intersects[0].point.y);
                // console.log("new point x", intersects[0].point.x);
                // console.log("new point y", intersects[0].point.y);
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
        } else if (dragging && currentIndex !== null && currentName == "foregroundMask") { // adjusting foreground mask

        }
    }

    window.addEventListener("mouseup", mouseUp, false);
    function mouseUp(event) {
        //console.log("Mouse up")
        dragging = false;
        currentIndex = null;
        settingForegroundMask = false;
    }

    function setRaycaster(event) {
        getMouse(event);
        //console.log("mouse-x", )
        raycaster.setFromCamera(mouse, camera);
        //console.log("ray", raycaster.ray.direction);
    }

}

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

function isBlank(canvasID) {
    var canvas = document.getElementById(canvasID);
    return !canvas.getContext('2d')
      .getImageData(0, 0, canvas.width, canvas.height).data
      .some(channel => channel !== 0);
}

function constructScene() {
    // if (maskPoints != null && isBlank("inpaint")) {
    //     alert("Please inpaint the image first");
    //     return;
    // }
    // 0-center(vanish point) 1-lowerleft 2-upperleft 3-upperright 4-lowerright
    // 0: Vector3 {x: -5, y: 3.75, z: 0}
    // 1: Vector3 {x: 5, y: 3.75, z: 0}
    // 2: Vector3 {x: -5, y: -3.75, z: 0}
    // 3: Vector3 {x: 5, y: -3.75, z: 0}
    var h = mesh.geometry.vertices[0].y - dots.geometry.vertices[0].y;
    var l = dots.geometry.vertices[0].y - mesh.geometry.vertices[2].y;
    var a = dots.geometry.vertices[2].y - dots.geometry.vertices[0].y;
    var b = dots.geometry.vertices[0].y - dots.geometry.vertices[1].y;
    var f = camera.getFocalLength();
    var dTop = h * f /a -f;
    var dBottom = l * f/b - f;
    var wl = dots.geometry.vertices[0].x - mesh.geometry.vertices[0].x;
    var wr = mesh.geometry.vertices[1].x - dots.geometry.vertices[0].x ;
    var c = dots.geometry.vertices[0].x - dots.geometry.vertices[2].x;
    var d = dots.geometry.vertices[3].x - dots.geometry.vertices[0].x;
    var dLeft = wl * f/c - f;
    var dRight = wr * f/d - f;
    console.log("f", f);
    console.log("dBottom", dBottom);
    console.log("dTop", dTop);
    console.log("dLeft", dLeft);
    console.log("dRight", dRight);
    //createFaceGeometry(dTop, dBottom, dLeft, dRight);
    var coordinates = getTransformCoordinates(dTop, dBottom, dLeft, dRight);
    warpImageOntoCanvas(coordinates.Bottom.source, coordinates.Bottom.target, "bottom");
    warpImageOntoCanvas(coordinates.Rear.source, coordinates.Rear.target, "rear");
    warpImageOntoCanvas(coordinates.Left.source, coordinates.Left.target, "left");
    warpImageOntoCanvas(coordinates.Right.source, coordinates.Right.target, "right");
    warpImageOntoCanvas(coordinates.Top.source, coordinates.Top.target, "top");
    createTexturedBoxGeometry(dTop, dBottom, dLeft, dRight); 
    // enable orbit controls
    controls.enabled = true;
    addCameraPositions(dTop, dBottom, dLeft, dRight);
    // remove the control points
    var planeObject = scene.getObjectByName('planeMeshObject');
    var pointObject = scene.getObjectByName('controlPoints');
    var lineObject = scene.getObjectByName('vanishingLine');
    var edgePointObject = scene.getObjectByName('edgePoints');
    scene.remove( planeObject );
    scene.remove( pointObject );
    scene.remove( lineObject );
    scene.remove( edgePointObject );
}

function convertToPixelCoord(loc, planeWidth, planeHeight, imageWidth, imageHeight) {
    var heightRatio = imageHeight/planeHeight;
    var widthRatio = imageWidth/planeWidth;
    // console.log("ratio", width_ratio, height_ratio);
    var imageCoord = {
        TL:{x:(loc.TL.x+(planeWidth/2)) * widthRatio, y:(-loc.TL.y+(planeHeight/2)) * heightRatio},     
        TR:{x:(loc.TR.x+(planeWidth/2)) * widthRatio, y: (-loc.TR.y+(planeHeight/2)) * heightRatio},     
        BR:{x:(loc.BR.x+(planeWidth/2)) * widthRatio, y:(-loc.BR.y+(planeHeight/2)) * heightRatio},    
        BL:{x:(loc.BL.x+(planeWidth/2)) * widthRatio, y:(-loc.BL.y+(planeHeight/2)) * heightRatio}
    }
    return imageCoord;
}

// TODO: calculate intersection point for plane vertices outside of image plane
function getTransformCoordinates(dTop, dBottom, dLeft, dRight) {
    // anchors defining the warped rectangle
    // bottom plane
    var imgWidth = texture.image.width;
    var imgHeight = texture.image.height;
    var sourceLocalBottom={
        //  edge points: ul ur ll lr
        TL:{x:dots.geometry.vertices[1].x, y:dots.geometry.vertices[1].y},     
        TR:{x:dots.geometry.vertices[4].x, y: dots.geometry.vertices[4].y},     
        BR:{x:edgeDotMesh.geometry.vertices[3].x, y:edgeDotMesh.geometry.vertices[3].y},    
        BL:{x:edgeDotMesh.geometry.vertices[2].x, y:edgeDotMesh.geometry.vertices[2].y}     
    }
    var sourceBottom = convertToPixelCoord(sourceLocalBottom, imgPlaneWidth, imgPlaneHeight, imgWidth, imgHeight);

    console.log("sourceLocalBottom", sourceLocalBottom);
    console.log("sourceBottom", sourceBottom);
    // cornerpoints defining the desire unwarped rectangle
    var targetBottom={
        TL:{x:0, y: 0},
        TR:{x:imgWidth, y:0 },
        BR:{x:imgWidth, y:dBottom/imgPlaneHeight * imgHeight},
        BL:{x:0, y:dBottom/imgPlaneHeight * imgHeight}
    }
    console.log("targetBottom", targetBottom);
    // rear
    var sourceLocalRear={
        //  edge points: ul ur ll lr
        TL:{x:dots.geometry.vertices[2].x, y:dots.geometry.vertices[2].y},     
        TR:{x:dots.geometry.vertices[3].x, y:dots.geometry.vertices[3].y},     
        BR:{x:dots.geometry.vertices[4].x, y: dots.geometry.vertices[4].y},    
        BL:{x:dots.geometry.vertices[1].x, y:dots.geometry.vertices[1].y}    
    }
    var sourceRear = convertToPixelCoord(sourceLocalRear, imgPlaneWidth, imgPlaneHeight, imgWidth, imgHeight);
    console.log("sourceLocalRear", sourceLocalRear);
    console.log("sourceRear", sourceRear);
    var targetRear={
        TL:{x:0, y: 0},
        TR:{x:imgWidth, y:0 },
        BR:{x:imgWidth, y:imgHeight},
        BL:{x:0, y:imgHeight}
    }
    console.log("targetRear", targetRear);
    // left
    var sourceLocalLeft={
        //  edge points: ul ur ll lr
        TL:{x:edgeDotMesh.geometry.vertices[0].x, y:edgeDotMesh.geometry.vertices[0].y},     
        TR:{x:dots.geometry.vertices[2].x, y:dots.geometry.vertices[2].y},     
        BR:{x:dots.geometry.vertices[1].x, y: dots.geometry.vertices[1].y},    
        BL:{x:edgeDotMesh.geometry.vertices[2].x, y:edgeDotMesh.geometry.vertices[2].y} 
    }
    var sourceLeft = convertToPixelCoord(sourceLocalLeft, imgPlaneWidth, imgPlaneHeight, imgWidth, imgHeight);
    console.log("sourceLocalLeft", sourceLocalLeft);
    console.log("sourceLeft", sourceLeft);
    var targetLeft={
        TL:{x:0, y: 0},
        TR:{x:dLeft/imgPlaneWidth * imgWidth, y:0 },
        BR:{x:dLeft/imgPlaneWidth * imgWidth, y:imgHeight},
        BL:{x:0, y:imgHeight}
    }
    console.log("targetLeft", targetLeft);
    // right
    var sourceLocalRight={
        //  edge points: ul ur ll lr
        TL:{x:dots.geometry.vertices[3].x, y: dots.geometry.vertices[3].y},     
        TR:{x:edgeDotMesh.geometry.vertices[1].x, y:edgeDotMesh.geometry.vertices[1].y},     
        BR:{x:edgeDotMesh.geometry.vertices[3].x, y:edgeDotMesh.geometry.vertices[3].y},    
        BL:{x:dots.geometry.vertices[4].x, y: dots.geometry.vertices[4].y}
    }
    var sourceRight = convertToPixelCoord(sourceLocalRight, imgPlaneWidth, imgPlaneHeight, imgWidth, imgHeight);
    console.log("sourceLocalRight", sourceLocalRight);
    console.log("sourceRight", sourceRight);
    var targetRight={
        TL:{x:0, y: 0},
        TR:{x:dRight/imgPlaneWidth * imgWidth, y:0 },
        BR:{x:dRight/imgPlaneWidth * imgWidth, y:imgHeight},
        BL:{x:0, y:imgHeight}
    }
    console.log("targetRight", targetRight);
    // top
    var sourceLocalTop={
        //  edge points: ul ur ll lr
        TL:{x:edgeDotMesh.geometry.vertices[0].x, y:edgeDotMesh.geometry.vertices[0].y},     
        TR:{x:edgeDotMesh.geometry.vertices[1].x, y:edgeDotMesh.geometry.vertices[1].y},     
        BR:{x:dots.geometry.vertices[3].x, y: dots.geometry.vertices[3].y},    
        BL:{x:dots.geometry.vertices[2].x, y:dots.geometry.vertices[2].y}  
    }
    var sourceTop = convertToPixelCoord(sourceLocalTop, imgPlaneWidth, imgPlaneHeight, imgWidth, imgHeight);
    console.log("sourceLocalTop", sourceLocalTop);
    console.log("sourceTop", sourceTop);
    var targetTop={
        TL:{x:0, y: 0},
        TR:{x:imgWidth, y:0 },
        BR:{x:imgWidth, y:dTop/imgPlaneHeight * imgHeight},
        BL:{x:0, y:dTop/imgPlaneHeight * imgHeight}
    }
    console.log("targetTop", targetTop);
    var coordinates={
        Bottom: {source: sourceBottom, target: targetBottom},
        Rear: {source: sourceRear, target: targetRear},
        Left: {source: sourceLeft, target: targetLeft},
        Right: {source: sourceRight, target: targetRight},
        Top: {source: sourceTop, target: targetTop}
    }
    return coordinates;

}

function warpImageOntoCanvas(source, target, canvasId) {
    var origin = cv.imread(texture.image);
    // if (maskPoints != null) { // there is foreground mask so use inpainted image
    //     origin = cv.imread("inpaint");
    // }
    console.log("origin", origin);
    var destination = new cv.Mat();
    var dsize = new cv.Size(target.BR.x, target.BR.y);
    var sourceCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [source.TL.x, source.TL.y, source.TR.x, source.TR.y,
        source.BR.x, source.BR.y, source.BL.x, source.BL.y]);
    var targetCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [target.TL.x, target.TL.y, target.TR.x, target.TR.y,
        target.BR.x, target.BR.y, target.BL.x, target.BL.y]);
    var transform_matrix = cv.getPerspectiveTransform(sourceCoords, targetCoords);
    cv.warpPerspective(origin, destination, transform_matrix, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
    cv.imshow(canvasId, destination);
    origin.delete();
}

function createTexturedBoxGeometry(dTop, dBottom, dLeft, dRight) {
    // bottom
    var canvasBottom=document.getElementById("bottom");
    var bottomTexture = new THREE.CanvasTexture(canvasBottom);
    var halfW = Math.abs(mesh.geometry.vertices[0].x);
    var halfH = Math.abs(mesh.geometry.vertices[0].y);
    var bottomPlaneGeometry = new THREE.PlaneGeometry(halfW * 2, dBottom);
    var bottomMaterial = new THREE.MeshBasicMaterial({
        map: bottomTexture
    });
    bottomPlane= new THREE.Mesh(bottomPlaneGeometry, bottomMaterial);
    bottomPlane.translateY(-halfH);
    bottomPlane.translateZ(dBottom/2);
    bottomPlane.rotation.x = -Math.PI / 2;
    scene.add(bottomPlane);
    // rear
    var canvasRear=document.getElementById("rear");
    var rearTexture = new THREE.CanvasTexture(canvasRear);
    var rearPlaneGeometry = new THREE.PlaneGeometry(halfW * 2, halfH * 2);
    var rearMaterial = new THREE.MeshBasicMaterial({
        map: rearTexture
    });
    rearPlane= new THREE.Mesh(rearPlaneGeometry, rearMaterial);
    scene.add(rearPlane);
    // left
    var canvasLeft=document.getElementById("left");
    var leftTexture = new THREE.CanvasTexture(canvasLeft);
    var leftPlaneGeometry = new THREE.PlaneGeometry(dLeft, halfH * 2);
    var leftMaterial = new THREE.MeshBasicMaterial({
        map: leftTexture
    });
    leftPlane= new THREE.Mesh(leftPlaneGeometry, leftMaterial);
    leftPlane.translateX(-halfW);
    leftPlane.translateZ(dLeft/2);
    leftPlane.rotation.y = Math.PI / 2;
    scene.add(leftPlane);
    // right
    var canvasRight=document.getElementById("right");
    var rightTexture = new THREE.CanvasTexture(canvasRight);
    var rightPlaneGeometry = new THREE.PlaneGeometry(dRight, halfH * 2);
    var rightMaterial = new THREE.MeshBasicMaterial({
        map: rightTexture
    });
    rightPlane= new THREE.Mesh(rightPlaneGeometry, rightMaterial);
    rightPlane.translateX(halfW);
    rightPlane.translateZ(dRight/2);
    rightPlane.rotation.y = -Math.PI / 2;
    scene.add(rightPlane);
    // top
    var canvasTop=document.getElementById("top");
    var topTexture = new THREE.CanvasTexture(canvasTop);
    var topPlaneGeometry = new THREE.PlaneGeometry(halfW * 2, dTop);
    var topMaterial = new THREE.MeshBasicMaterial({
        map: topTexture
    });
    topPlane= new THREE.Mesh(topPlaneGeometry, topMaterial);
    topPlane.translateY(halfH);
    topPlane.translateZ(dTop/2);
    topPlane.rotation.x = Math.PI / 2;
    scene.add(topPlane);
    // add foreground mask planes if any
    if (maskPoints != null) { 
        // calculate the depth of the object
        var f = camera.getFocalLength();
        var l = dots.geometry.vertices[0].y - mesh.geometry.vertices[2].y;
        var a = dots.geometry.vertices[2].y - dots.geometry.vertices[0].y;
        var b = dots.geometry.vertices[0].y - dots.geometry.vertices[1].y;
        var canvas=document.getElementById("original");
        canvas.width = imgWidth;
        canvas.height = imgHeight;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(texture.image, 0, 0);
        for (var i = 0; i < maskPoints.vertices.length; i += 4) {
            // the portion between bottom line of the back plane and the top of the mask- can be negative
            var p = dots.geometry.vertices[1].y - maskPoints.vertices[i].y;
            // height of the foreground mask 
            var x = maskPoints.vertices[i].y - maskPoints.vertices[i + 2].y;
            // the distance from bottom of the mask to the bottom of the mesh plane
            var q = maskPoints.vertices[i + 2].y - mesh.geometry.vertices[2].y;
            // Since q/l = d_mask/(d_mask+f)
            var d_mask = f*q/(l-q);
            console.log("d_mask", d_mask);
            // Since x/h_mask = f/(d+f)
            var h_mask = x * (d_mask + f)/f;
            var ratio = (maskPoints.vertices[i + 1].x - maskPoints.vertices[i].x)/ (maskPoints.vertices[i].y - maskPoints.vertices[i + 3].y);
            var w_mask = h_mask * ratio;
            console.log("h_mask", h_mask);
            console.log("w_mask", w_mask);
            // var canvasBottom=document.getElementById("bottom");
            // var bottomTexture = new THREE.CanvasTexture(canvasBottom);
            var inpaintLoc={
                TL:{x:maskPoints.vertices[i].x, y:maskPoints.vertices[i].y},     
                TR:{x:maskPoints.vertices[i + 1].x, y:maskPoints.vertices[i + 1].y},     
                BR:{x:maskPoints.vertices[i + 3].x, y:maskPoints.vertices[i + 3].y},    
                BL:{x:maskPoints.vertices[i + 2].x, y:maskPoints.vertices[i + 2].y}     
            }
            var inpaintRegion = convertToPixelCoord(inpaintLoc, imgPlaneWidth, imgPlaneHeight, imgWidth, imgHeight);
            var minX = Math.round(inpaintRegion.TL.x);
            var minY = Math.round(inpaintRegion.TR.y);
            var maxX = Math.round(inpaintRegion.BR.x);
            var maxY = Math.round(inpaintRegion.BR.y);
            var maskData = ctx.getImageData(minX, minY, maxX, maxY);
            var maskImage = new Image();
            var canvas = document.getElementById("mask");
            var ctx2 = canvas.getContext('2d');
            canvas.width = maxX - minX;
            canvas.height = maxY - minY;
            ctx2.putImageData(maskData, 0, 0);
            maskImage.src = canvas.toDataURL();
            var loader = new THREE.TextureLoader();
            var maskMaterial  = new THREE.MeshLambertMaterial({
                map: loader.load(canvas.toDataURL())
            });
            var maskPlaneGeometry = new THREE.PlaneGeometry(w_mask, h_mask);
            // var maskMaterial = new THREE.MeshBasicMaterial({
            //     color: 0xffffff
            // });
            maskPlane= new THREE.Mesh(maskPlaneGeometry, maskMaterial);
            maskPlane.translateY(-halfH + q);
            xtrans_mask = maskPoints.vertices[i].x * (d_mask+f)/f;
            maskPlane.translateX(xtrans_mask);
            maskPlane.translateZ((dBottom - d_mask)/2);
            // bottomPlane.rotation.x = -Math.PI / 2;
            scene.add(maskPlane);
        }
    }
    var masks = scene.getObjectByName("foregroundMask");
    var maskLines = scene.getObjectByName("maskLine");
    scene.remove(masks);
    scene.remove(maskLines);
    sceneCreated = true;
}

// function getImageURL(imgData, width, height) {
//     var canvas = document.createElement('canvas');
//     var ctx = canvas.getContext('2d');
//     canvas.width = width;
//     canvas.height = height;
//     ctx.putImageData(imgData, 0, 0);
//     return canvas.toDataURL(); //image URL
// }

//-----------------------------------------------------------------------------
function start(source, target, dBottom){
    var canvas=document.getElementById("canvas");
    var ctx=canvas.getContext("2d");
    var canvas1=document.getElementById("bottom");
    var ctx1=canvas1.getContext("2d");

    //console.log("w", texture.image.width);

    // set canvas sizes equal to image size
    // cw=canvas.width=canvas1.width=texture.image.width;
    // ch=canvas.height=canvas1.height=texture.image.height;
    canvas.height = texture.image.height;
    canvas.width = texture.image.width;
    canvas1.height = dBottom/imgPlaneHeight*texture.image.height;
    canvas1.width = texture.image.width;
    
    var halfW = Math.abs(mesh.geometry.vertices[0].x);
    var halfH = Math.abs(mesh.geometry.vertices[0].y);
    // cw=canvas.width=canvas1.width=halfW*2;
    // ch=canvas.height=canvas1.height=dBottom;

    // draw the example image on the source canvas
    ctx.drawImage(texture.image,0,0);

    // unwarp the source rectangle and draw it to the destination canvas
    unwarp(source, target, ctx1);
}

// the triangle version of perspective transform 
// the upper triangle is slightly distorted
// unwarp the source rectangle
function unwarp(anchors,unwarped,context){

    // clear the destination canvas
    context.clearRect(0,0,context.canvas.width,context.canvas.height);
  
    // unwarp the bottom-left triangle of the warped polygon
    mapTriangle(context,
                anchors.TL,  anchors.BR,  anchors.BL,
                unwarped.TL, unwarped.BR, unwarped.BL
               );
  
    // eliminate slight space between triangles
    context.translate(-1,1);
  
    // unwarp the top-right triangle of the warped polygon
    mapTriangle(context,
                anchors.TL,  anchors.BR,  anchors.TR,
                unwarped.TL, unwarped.BR, unwarped.TR
               );
  
}

// Perspective mapping: Map warped triangle into unwarped triangle
// TODO: Fix the upper triangle 
function mapTriangle(ctx, p0, p1, p2, p_0, p_1, p_2) {


    // break out the individual triangles x's & y's
    var x0=p_0.x, y0=p_0.y;
    var x1=p_1.x, y1=p_1.y;
    var x2=p_2.x, y2=p_2.y;
    var u0=p0.x,  v0=p0.y;
    var u1=p1.x,  v1=p1.y;
    var u2=p2.x,  v2=p2.y;
  
    // save the unclipped & untransformed destination canvas
    ctx.save();
  
    // clip the destination canvas to the unwarped destination triangle
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.clip();
  
    // Compute matrix transform
    var delta   = u0 * v1 + v0 * u2 + u1 * v2 - v1 * u2 - v0 * u1 - u0 * v2;
    var delta_a = x0 * v1 + v0 * x2 + x1 * v2 - v1 * x2 - v0 * x1 - x0 * v2;
    var delta_b = u0 * x1 + x0 * u2 + u1 * x2 - x1 * u2 - x0 * u1 - u0 * x2;
    var delta_c = u0 * v1 * x2 + v0 * x1 * u2 + x0 * u1 * v2 - x0 * v1 * u2 - v0 * u1 * x2 - u0 * x1 * v2;
    var delta_d = y0 * v1 + v0 * y2 + y1 * v2 - v1 * y2 - v0 * y1 - y0 * v2;
    var delta_e = u0 * y1 + y0 * u2 + u1 * y2 - y1 * u2 - y0 * u1 - u0 * y2;
    var delta_f = u0 * v1 * y2 + v0 * y1 * u2 + y0 * u1 * v2 - y0 * v1 * u2 - v0 * u1 * y2 - u0 * y1 * v2;
  
    // Draw the transformed image
    ctx.transform(
      delta_a / delta, delta_d / delta,
      delta_b / delta, delta_e / delta,
      delta_c / delta, delta_f / delta
    );
  
    // draw the transformed source image to the destination canvas
    ctx.drawImage(texture.image,0,0);
  
    // restore the context to it's unclipped untransformed state
    ctx.restore();
}

function animateCamera() {
    //controls.enabled = false;
    interval();
    setInterval(interval, 6000);
}

function addCameraPositions(dTop, dBottom, dLeft, dRight) {
    var halfW = Math.abs(mesh.geometry.vertices[0].x);
    var halfH = Math.abs(mesh.geometry.vertices[0].y);
    var depth = Math.min(dTop, dBottom, dLeft, dRight);
    cameraPositions.push([0, 0, camera.position.z-1]);
    cameraPositions.push([-halfW, 0, camera.position.z - 1]);
    cameraPositions.push([halfW, 0, camera.position.z - 1]);
    cameraPositions.push([0, halfH, camera.position.z - 1]);
    cameraPositions.push([0, -halfH, camera.position.z - 1]);
    cameraPositions.push([0, 0, depth])
    cameraPositions.push([-halfW, 0, depth]);
    cameraPositions.push([halfW, 0, depth]);
    cameraPositions.push([0, halfH, depth]);
    cameraPositions.push([0, -halfH, depth]);
}

function interval() {
    currCameraPos = (currCameraPos) % cameraPositions.length;
    //console.log("new cam pos", cameraPositions[currCameraPos]);
    moveCamera(camera, cameraPositions[currCameraPos], 5000);
    //moveCamera(camera, [0, 5, 5], 5000);
    currCameraPos = currCameraPos + 1;
}

function moveCamera(camera, position, duration) {
    var from = camera.position.clone();
    new TWEEN.Tween(from).to({
        x: position[0],
        y: position[1],
        z: position[2]
      }, duration)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate( function(){
        camera.position.copy(from);
      })
      .start();
}

function inpaintImage() {
    if (maskPoints == null) { // no foreground mask 
        return;
    }
    // console.log("Set Mask");
    // console.log("img", imgWidth);
    var canvas=document.getElementById("inpaint");
    canvas.width = imgWidth;
    canvas.height = imgHeight;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(texture.image, 0, 0);
    var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // var width = imgData.width, height = imgData.height;
    // console.log("w and h", width, height);
    var masku8 = new Uint8Array(imgWidth * imgHeight);
    console.log("imgData", imgData);
    console.log("data length", imgData.data.length);
    // for (var i = 0; i < imgData.data.length / 4; i ++) {

    // }
    //var count = 0; 
    console.log("mask vertices", maskPoints.vertices);
    for (var i = 0; i < maskPoints.vertices.length; i += 4) {
        var inpaintLoc={
            TL:{x:maskPoints.vertices[i].x, y:maskPoints.vertices[i].y},     
            TR:{x:maskPoints.vertices[i + 1].x, y:maskPoints.vertices[i + 1].y},     
            BR:{x:maskPoints.vertices[i + 3].x, y:maskPoints.vertices[i + 3].y},    
            BL:{x:maskPoints.vertices[i + 2].x, y:maskPoints.vertices[i + 2].y}     
        }
        console.log("inpaint Loc", inpaintLoc);
        var inpaintRegion = convertToPixelCoord(inpaintLoc, imgPlaneWidth, imgPlaneHeight, imgWidth, imgHeight);
        console.log("inpaint region in pixel", inpaintRegion);
        var minX = Math.round(inpaintRegion.TL.x);
        var minY = Math.round(inpaintRegion.TR.y);
        var maxX = Math.round(inpaintRegion.BR.x);
        var maxY = Math.round(inpaintRegion.BR.y);
        console.log("x - y", minX, maxX, minY, maxY);
        for (var x = minX; x <= maxX; x ++) {
            for (var y = minY; y <= maxY; y ++) {
                masku8[((imgWidth * y) + x)] = 1; 
                //count += 1;
            }
        }
        //console.log("count", count);
    }
    // for (var i = 0; i < imgHeight*imgWidth; i++) {

    // }
    for (var channel = 0; channel < 3; channel++ ) {
        var imgu8 = new Uint8Array(imgWidth * imgHeight);
        for (var n = 0; n < imgData.data.length; n+=4 ) {
            imgu8[n/4] = imgData.data[n + channel];
        }
        imgu8Original = imgu8.slice();
        var image = InpaintTelea(imgWidth, imgHeight, imgu8, masku8);
        console.log("image", imgu8);
        for (var i = 0; i < imgu8.length; i ++) {
            imgData.data[4*i + channel] = imgu8[i];
        }
    }
    for (var i = 0; i < imgu8.length; i ++) {
        imgData.data[4*i + 3] = 255; //alpha
    }
    ctx.putImageData(imgData, 0, 0);

    // var c = document.createElement('canvas')
	// c.width = merp.width;
	// c.height = merp.height;
	// document.body.appendChild(c)
	// var ctx = c.getContext('2d');
	// ctx.drawImage(merp, 0, 0)
	// var blah = ctx.getImageData(0, 0, c.width, c.height);

	// var width = blah.width, height = blah.height;
	// var mask_u8 = new Uint8Array(width * height);
	// for(var i = 0; i < blah.data.length / 4; i++){
	// 	var Y = .299 * blah.data[4 * i] + .587 * blah.data[4 * i + 1] +  .114 * blah.data[4 * i + 2];

	// 	if(Y > 230){
	// 		var rad = 6

	// 		for(var dx = -rad; dx <= rad; dx++){
	// 			for(var dy = -rad; dy <= rad; dy++){
	// 				if(dx * dx + dy * dy <= rad * rad){
	// 					mask_u8[i + dx + dy * width] = 1;
	// 				}
	// 			}
	// 		}
	// 		// blah.data[i * 4] = 0
	// 		// blah.data[i * 4 + 1] = 0
	// 		// blah.data[i * 4 + 2] = 0
	// 	}
	// }
	// for(var channel = 0; channel < 3; channel++){
	// 	var img_u8 = new Uint8Array(width * height)
	// 	for(var n = 0; n < blah.data.length; n+=4){
	// 		img_u8[n / 4] = blah.data[n + channel]
	// 	}
	// 	InpaintTelea(width, height, img_u8, mask_u8)
	// 	for(var i = 0; i < img_u8.length; i++){
	// 		blah.data[4 * i + channel] = img_u8[i]
	// 	}	
	// }
	// // render result back to canvas
	// for(var i = 0; i < img_u8.length; i++){
	// 	blah.data[4 * i + 3] = 255;
	// }
    
    // ctx.putImageData(blah, 0, 0);
}

function exemplarInpaint() {
    if (maskPoints == null) { // no foreground mask 
        return;
    }
    var canvas=document.getElementById("inpaint");
    canvas.width = imgWidth;
    canvas.height = imgHeight;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(texture.image, 0, 0);
    var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    masku8 = new Uint8Array(imgWidth * imgHeight);
    // move to inside the loop
    var confidenceOriginal = new Float32Array(imgWidth * imgHeight); // condifence for each pixel of the image
    // priority = new Float32Array(imgWidth * imgHeight); // move to inside the loop
    confidenceOriginal.fill(1); // each known pixel has a confidence of 1
    for (var i = 0; i < maskPoints.vertices.length; i += 4) {
        var inpaintLoc={
            TL:{x:maskPoints.vertices[i].x, y:maskPoints.vertices[i].y},     
            TR:{x:maskPoints.vertices[i + 1].x, y:maskPoints.vertices[i + 1].y},     
            BR:{x:maskPoints.vertices[i + 3].x, y:maskPoints.vertices[i + 3].y},    
            BL:{x:maskPoints.vertices[i + 2].x, y:maskPoints.vertices[i + 2].y}     
        }
        console.log("inpaint Loc", inpaintLoc);
        var inpaintRegion = convertToPixelCoord(inpaintLoc, imgPlaneWidth, imgPlaneHeight, imgWidth, imgHeight);
        console.log("inpaint region in pixel", inpaintRegion);
        var minX = Math.round(inpaintRegion.TL.x);
        var minY = Math.round(inpaintRegion.TR.y);
        var maxX = Math.round(inpaintRegion.BR.x);
        var maxY = Math.round(inpaintRegion.BR.y);
        console.log("x - y", minX, maxX, minY, maxY);
        for (var x = minX; x <= maxX; x ++) {
            for (var y = minY; y <= maxY; y ++) {
                masku8[(imgWidth * y) + x] = 255; 
                confidenceOriginal[((imgWidth * y) + x)] = 0;
            }
        }
    }
    //fillRange = masku8.slice(); //move to inside the loop

    // while ( sumArray(fillRange) > 0 ) {
    //     front = getEdge(fillRange);
        

    // }
    var src = cv.imread(texture.image);
    grayMat = new cv.Mat();
    cv.cvtColor(src, grayMat, cv.COLOR_RGBA2GRAY, 0);
    src.delete();

    //getEdge(fillRange);
    //console.log("front", front.data);
    //ctx.putImageData(front.data, 0, 0);

    // for (var channel = 0; channel < 3; channel++ ) {
        var imgu8 = new Uint8Array(imgWidth * imgHeight);
        var imgu8R = new Uint8Array(imgWidth * imgHeight);
        var imgu8G = new Uint8Array(imgWidth * imgHeight);
        var imgu8B = new Uint8Array(imgWidth * imgHeight);
        fillRange = masku8.slice();
        //fillRangeOriginal = 
        confidence = confidenceOriginal.slice();
        priority = new Float32Array(imgWidth * imgHeight);
        for (var n = 0; n < imgData.data.length; n+=4 ) {
            //imgu8[n/4] = imgData.data[n + channel];
            imgu8[n/4] = imgData.data[n + 0];
            imgu8R[n/4] = imgData.data[n + 0];
            imgu8G[n/4] = imgData.data[n + 1];
            imgu8B[n/4] = imgData.data[n + 2];

        }
        //console.log("before", sumArray(imgu8));

        //var image = InpaintTelea(imgWidth, imgHeight, imgu8, masku8);
        //inpaint(imgu8);
        // launch();
        // inpaint(imgu8, imgu8R, imgu8G, imgu8B, imgData, ctx);
        for (var i = 0; i < imgu8.length; i ++) {
            if (fillRange[i] != 0) { // blank out
                imgData.data[4*i ] = 255;
                imgData.data[4*i + 1 ] = 255;
                imgData.data[4*i + 2 ] = 255;
            }
        }
    // }
    for (var i = 0; i < imgu8.length; i ++) {
        imgData.data[4*i + 3] = 255; //alpha
    }
        inpaintAndShowProgress(imgu8, imgu8R, imgu8G, imgu8B, imgData, ctx);
        //window.setTimeout(inpaint, 1000, imgu8, imgu8R,  imgu8G, imgu8B, imgData, ctx);
        //console.log("after", sumArray(imgu8));
    //     for (var i = 0; i < imgu8.length; i ++) {
    //         // imgData.data[4*i + channel] = imgu8[i];
    //         imgData.data[4*i ] = imgu8R[i];
    //         imgData.data[4*i + 1 ] = imgu8G[i];
    //         imgData.data[4*i + 2 ] = imgu8B[i];
    //     }
    // // }
    // for (var i = 0; i < imgu8.length; i ++) {
    //     imgData.data[4*i + 3] = 255; //alpha
    // }
    ctx.putImageData(imgData, 0, 0);
}

// function launch() {
//     var inc = 0,
//         max = 9999;
//         delay = 100; // 100 milliseconds
 
//     function timeoutLoop() {
//         document.getElementById("progress").innerHTML = "Inpaint progress: " + inc.toString() + "%";
//        if (++inc < max)
//           setTimeout(timeoutLoop, delay);
//     }
 
//     setTimeout(timeoutLoop, delay);
//  }
function inpaintAndShowProgress(imgu8, imgu8R, imgu8G, imgu8B, imgData, ctx) {
    var delay = 200; // 200 miliseconds

    setTimeout(inpaint, delay, imgu8, imgu8R, imgu8G, imgu8B, imgData, ctx)
}

function inpaint(imgu8, imgu8R, imgu8G, imgu8B, imgData, ctx) { //imgu8) { //
    var delay = 200; // 200 miliseconds
    var diffMethod;
    var radios = document.getElementsByName('diffMethod');
    for (var i = 0, length = radios.length; i < length; i++) {
        if (radios[i].checked) {
            diffMethod = radios[i].value;
            break;
        }
    }
    var totalFillRange = sumArray(fillRange);
    var percentage = (1.0 - sumArray(fillRange)/totalFillRange) * 100.0;
    // document.getElementById("progress").innerHTML = "Inpaint progress: " + percentage.toString() + "%";
    if (sumArray(fillRange) != 0) {
        //console.log("fillrange is", sumArray(fillRange));
        getEdge(fillRange);
        updatePriority(fillRange);
        //console.log("priority", sumArray(priority));
        var targetPoint = getTargetPoint();
        //console.log("target point", targetPoint);
        var bestPatchRange = getBestPatchRange(imgu8, targetPoint, diffMethod);
        console.log("best patch range", bestPatchRange[0], bestPatchRange[1]);
        //var bestPatchRange = [[641, 650], [672, 682]];
        fillImage(imgu8, targetPoint, bestPatchRange);
        fillImage(imgu8R, targetPoint, bestPatchRange);
        fillImage(imgu8G, targetPoint, bestPatchRange);
        fillImage(imgu8B, targetPoint, bestPatchRange);
        updateFillRange(fillRange, targetPoint);
        var percentage = (1.0 - sumArray(fillRange)/totalFillRange) * 100.0;
        //setTimeout(inpaint, 1000, imgu8, imgu8R,  imgu8G, imgu8B, imgData, ctx);
        // launch();
        document.getElementById("progress").innerHTML = "Inpaint progress: " + percentage.toString() + "%";
        //document.getElementById("progress").appendChild(document.createTextNode("Inpaint progress: " + percentage.toString() + "%"));
        //innerHTML = "Inpaint progress: " + percentage.toString() + "%";
        console.log("fillrange is now", sumArray(fillRange));
        console.log("Inpaint progress", percentage.toString() + "%")
        for (var i = 0; i < imgu8R.length; i ++) {
            if (fillRange[i] == 0) {
                imgData.data[4*i ] = imgu8R[i];
                imgData.data[4*i + 1 ] = imgu8G[i];
                imgData.data[4*i + 2] = imgu8B[i];
            }
            // imgData.data[4*i ] = imgu8R[i];
            // imgData.data[4*i + 1 ] = imgu8G[i];
            // imgData.data[4*i + 2] = imgu8B[i];
        }
        // for (var i = 0; i < imgu8R.length; i ++) {
        //     imgData.data[4*i + 3] = 255; //alpha
        // }
        ctx.putImageData(imgData, 0, 0);
        //window.setTimeout(inpaint, 1000, imgu8, imgu8R,  imgu8G, imgu8B, imgData, ctx);
        setTimeout(inpaint, delay, imgu8, imgu8R, imgu8G, imgu8B, imgData, ctx);
    }
    // return self.fillimage
    // ctx.putImageData(imgData, 0, 0);
}

function fillImage(image, targetPoint, sourcePatchRange) {
    var targetPatchRange = getPatchRange(targetPoint);
    var start = (imgWidth * targetPatchRange[1][0]) + targetPatchRange[0][0];
    var end =  (imgWidth * targetPatchRange[1][1]) + targetPatchRange[0][1];
    //var targetPatchWidth = targetPatchRange[0][1] - targetPatchRange[0][0] + 1;
    // var targetPatchData = getPatchData(fillRange, targetPatchRange);
    // var fillPointPos = [];
    // for (var i = 0; i < targetPatchData.length; i ++) {
    //     if (targetPatchData[i] > 0) {
    //         fillPointPos.push(i);
    //     }
    // }
    var fillPointPos = [];
    for (var i = start; i < end; i ++) {
        if (fillRange[i] > 0) {
            confidence[i] = confidence[ravelIndex(targetPoint, imgWidth)];
        }
    }
    // update confidence of the target patch

    // var targetConfidence = getPatchData(confidence, targetPatchRange);
    // for (i of fillPointPos) {
    //     targetConfidence[i] = confidence[ravelIndex(targetPoint, imgWidth)];
    // }
    // update pixels of the target patch
    var srcStart = (imgWidth * sourcePatchRange[1][0]) + sourcePatchRange[0][0];
    var srcEnd = (imgWidth * sourcePatchRange[1][1]) + sourcePatchRange[0][1];
    var offset = srcStart - start;
    // for (i of fillPointPos) {
    //     imgu8[i] = imgu8[i + offset];
    // }
    for (var i = start; i < end; i ++) {
        if (fillRange[i] > 0) {
            image[i] = image[i + offset];
        }
    }
    // var sourcePatch = getPatchData(imgu8, sourcePatchRange); // maybe should be original image.data
    // var targetPatch = getPatchData(imgu8, targetPatchRange);
    // for (i of fillPointPos) {
    //     targetPatch[i] = sourcePatch[i];
    // }
    // update fill range 
    // for (var i = start; i < end; i++) {
    //     fillRange[i] = 0;
    // }
}

function updateFillRange(fillRange, targetPoint) {
    var targetPatchRange = getPatchRange(targetPoint);
    var start = (imgWidth * targetPatchRange[1][0]) + targetPatchRange[0][0];
    var end =  (imgWidth * targetPatchRange[1][1]) + targetPatchRange[0][1];
    for (var i = start; i < end; i++) {
        fillRange[i] = 0;
    }
}

function sumArray(array) {
    return array.reduce((a, b) => a + b, 0);
}

function getEdge(fillRange) {
    // use laplacian edge detection to find inpaint boarder
    let src = cv.matFromArray(imgHeight, imgWidth, cv.CV_8UC1, fillRange);
    // let src = cv.Mat.zeros(imgHeight, imgWidth, cv.CV_8UC1);
    // for (var i = 0; i < fillRange.length; i ++) {
    //     if (fillRange[i] == 1) {
    //         var pos = unravelIndex(i, imgWidth);
    //         src.ucharPtr(pos[0], pos[1])[0] = 255;
    //     }
    // }
    //cv.imshow('inpaint', src);
    //let src = cv.matFromImageData(imgData);
    front = new cv.Mat();
    //cv.cvtColor(src, src, cv.COLOR_RGB2GRAY, 0);
    cv.Laplacian(src, front, cv.CV_8U, 1, 1, 0, cv.BORDER_DEFAULT); 
    //cv.Canny(src, dst, 50, 100, 3, false);
    cv.imshow('inpaint', front);
    //console.log("front data", front.data);
    //console.log("front", sumArray(front.data));
    // for (var x = 0; x < 829; x++) {
    //     for (var y = 0; y < 1152; y++) {
    //         if (dst.data[(imgWidth * y) + x] == 255) {
    //             console.log("boarder", x, y, (imgWidth * y) + x);
    //         } 
    //     }
    // }
    // self.front = (cv.Laplacian(self.fill_range, -1) > 0).astype('uint8')
    src.delete();// dst.delete();
    //ctx.putImageData(front.data, 0, 0);

    //return dst;
    //return front;
}

function getBestPatchRange(image, templatePoint, diffMethod) {
    var templatePatchRange = getPatchRange(templatePoint);
    var patchWidth = templatePatchRange[0][1] - templatePatchRange[0][0] + 1;
    var patchHeight = templatePatchRange[1][1] - templatePatchRange[1][0] + 1;
    var bestPatchRange;
    var bestDiff = Infinity;
    var sourcePatchRange;
    var src = cv.imread(texture.image);
    var labImage = new cv.Mat();
    cv.cvtColor(src, labImage, cv.COLOR_BGR2Lab, 0);
    src.delete();
    //Use pixel within a certain range to improve speed
    var xStart = Math.max(0, templatePoint[0] - 250);
    var xEnd = Math.min(imgWidth - patchWidth + 1, templatePoint[0] + 250);
    var yStart = Math.max(0, templatePoint[1] - 250);
    var yEnd = Math.min(imgHeight - patchHeight + 1, templatePoint[1] + 250);

    // for (var x = 0; x < imgWidth - patchWidth + 1; x ++) {
    //     for (var y = 0; y < imgHeight - patchHeight + 1; y ++) {
    for (var x = xStart; x < xEnd; x ++) {
        for (var y = yStart; y < yEnd; y ++) {
            var sourcePatchRange = [[x, x + patchWidth], [y, y + patchHeight]];
            //console.log("sourcePatchRange", sourcePatchRange);
            if (sumArray(getPatchData(masku8, sourcePatchRange)) != 0 || sumArray(getPatchData(fillRange, sourcePatchRange)) != 0) {
                continue;
            }
            var diff;
            if (diffMethod == "sqDiff") {
                diff = getSqDiff(labImage.data, fillRange, templatePatchRange, sourcePatchRange);
            } else if (diffMethod == "sqDiffEuclidean") {
                diff = getSqDiffEuclidean(labImage.data, fillRange, templatePatchRange, sourcePatchRange, templatePoint);
            } else if (diffMethod == "sqDiffGradient") {
                diff = getSqDiffWithGradient(labImage.data, fillRange, templatePatchRange, sourcePatchRange, templatePoint);
            } else if (diffMethod == "sqDiffGradientEuclidean") {
                diff = getSqDiffGradientEuclidean(labImage.data, fillRange, templatePatchRange, sourcePatchRange, templatePoint);
            }
            // var diff = getSqDiffEuclidean(labImage.data, fillRange, templatePatchRange, sourcePatchRange, templatePoint);
            //console.log("diff", diff);
            if (diff < bestDiff) {
                bestDiff = diff;
                bestPatchRange = sourcePatchRange;
            }
        }
    }
    return bestPatchRange;
}

function getSqDiff(image, fillRange, templatePatchRange, sourcePatchRange) {
    var patch = getPatchData(fillRange, templatePatchRange);
    // for (var i = 0; i < patch.length; i ++) {
    //     patch[i] = 255- patch[i]; // NOTE: might be 255 since masku8 values are set to 255
    // }
    //console.log("sourcePatchRange", sourcePatchRange);
    var templatePatch = getPatchData(image, templatePatchRange);
    var sourcePatch = getPatchData(image, sourcePatchRange);
    var diff = 0;
    for (var i = 0; i < patch.length; i ++) { // maybe numjs
        var template = (255 - patch[i]) * templatePatch[i];
        var source = (255 - patch[i]) * sourcePatch[i]; // 1 or 255
        diff += (template - source)**2;
    }
    return diff;
}

function getSqDiffEuclidean(image, fillRange,  templatePatchRange, sourcePatchRange) {
    var sqDiff = getSqDiff(image, fillRange, templatePatchRange, sourcePatchRange);
    var euclideandDist = Math.sqrt((templatePatchRange[0][0]-sourcePatchRange[0][0])**2 +
                                    (templatePatchRange[1][0]-sourcePatchRange[1][0])**2);
    return sqDiff + euclideandDist;
}

function getSqDiffWithGradient(image, fillRange, templatePatchRange, sourcePatchRange, targetPos) {
    var sqDiff = getSqDiff(image, fillRange, templatePatchRange, sourcePatchRange);
    //console.log("sqdiff", sqDiff)
    var targetIsophote = [isophote[0][targetPos[0]], isophote[1][targetPos[1]]]; // make sure xy is correct
    var targetIsophoteVal = Math.sqrt(targetIsophote[0]**2 + targetIsophote[1]**2);
    var graySourcePatch = getPatchData(grayMat.data, sourcePatchRange);
    var sourcePatchWidth = sourcePatchRange[0][1] - sourcePatchRange[0][0] + 1;
    var sourcePatchHeight = sourcePatchRange[1][1] - sourcePatchRange[1][0] + 1;
    var sourcePatchGradient = getGradient(graySourcePatch, sourcePatchWidth, sourcePatchHeight);
    //console.log("gradients", sourcePatchGradient[0], sourcePatchGradient[1]);
    var sourcePatchVal = new Float32Array(graySourcePatch.length);
    for (var i = 0; i < sourcePatchVal.length; i ++) {
        sourcePatchVal[i] = Math.sqrt(sourcePatchGradient[0][i]**2 + sourcePatchGradient[1][i]**2);
        //console.log("source grad val", sourcePatchVal[i]);
    }
    //console.log("source patch val", sourcePatchVal);
    var maxPatchPos = getArgMax(sourcePatchVal); // unravelIndex(getArgMax(sourcePatchVal), sourcePatchWidth);
    //console.log("maxpatchpos", maxPatchPos);
    //console.log("")
    var sourceIsophote = [-sourcePatchGradient[1][maxPatchPos],
                            sourcePatchGradient[0][maxPatchPos]];
    // var sourceIsophote = [-sourcePatchGradient[1][maxPatchPos[0]][maxPatchPos[1]],
    //                         sourcePatchGradient[0][maxPatchPos[0]][maxPatchPos[1]]];
    //console.log("source isophote", sourceIsophote);
    var sourceIsophoteVal = sourcePatchVal[getArgMax(sourcePatchVal)];
    // console.log("sourceIsophoteVal ", sourceIsophoteVal );
    // console.log("arg max ", getArgMax(sourcePatchVal) );
    var dotProduct = Math.abs(sourceIsophote[0]*targetIsophote[0] + sourceIsophote[1]*targetIsophote[1]);
    var norm = sourceIsophoteVal * targetIsophoteVal;
    var cosTheta = 0;
    if (norm != 0) {
        cosTheta = dotProduct/norm;
    }
    var diffVal = Math.abs(sourceIsophoteVal - targetIsophoteVal);
    //console.log("gradsqdiff", sqDiff - cosTheta + diffVal)
    return sqDiff - cosTheta + diffVal;
}

function getSqDiffGradientEuclidean(image, fillRange, templatePatchRange, sourcePatchRange, targetPos) {
    var sqDiffGradient = getSqDiffWithGradient(image, fillRange, templatePatchRange, sourcePatchRange, targetPos);
    var euclideandDist = Math.sqrt((templatePatchRange[0][0]-sourcePatchRange[0][0])**2 +
                        (templatePatchRange[1][0]-sourcePatchRange[1][0])**2);
    return sqDiffGradient + euclideandDist;
}

function getNormal(fillRange) {
    var src = cv.matFromArray(imgHeight, imgWidth, cv.CV_8UC1, fillRange);
    var dstx = new cv.Mat();
    var dsty = new cv.Mat();
    // Since white-to-black transition has a negative slope, we need to use higher form datatype
    // in order to keep both edges (https://docs.opencv.org/3.4/da/d85/tutorial_js_gradients.html)
    cv.Scharr(src, dstx, cv.CV_64F, 1, 0, 1, 0, cv.BORDER_DEFAULT);
    cv.Scharr(src, dsty, cv.CV_64F, 0, 1, 1, 0, cv.BORDER_DEFAULT);
    cv.convertScaleAbs(dstx, dstx, 1, 0); // 
    cv.convertScaleAbs(dsty, dsty, 1, 0);
    //var normal = [];
    // initialize to be size imgHeight * imgWidth filled with zeros
    //var norm = Array(imgHeight).fill().map(() => Array(imgWidth).fill(0));  
    //var norm = [];
    var xUnitNormal = new Float64Array(imgWidth * imgHeight);
    var yUnitNormal = new Float64Array(imgWidth * imgHeight);
    for (var i = 0; i < dstx.data.length; i ++) {
        var xNormal = dstx.data[i];
        var yNormal = dsty.data[i];
        if (xNormal != 0 || yNormal != 0 ) {
            var norm = Math.sqrt(xNormal**2 + yNormal**2);
            if (norm == 0 ) {
                norm = 1;
            }
            xUnitNormal[i] = xNormal/norm;
            yUnitNormal[i] = yNormal/norm;
            // if (xUnitNormal[i] != 0) {
            //     console.log("x normal", xUnitNormal[i]);
            // }
            // if (yUnitNormal[i] != 0) {
            //     console.log("y normal", yUnitNormal[i]);
            // }
        }
    }
    src.delete();
    dstx.delete();
    dsty.delete();
    //console.log("xunitnormal", xUnitNormal);
    return [xUnitNormal, yUnitNormal];
}

function getIsophote(fillRange) {
    var grayMatCopy = grayMat.clone();
    for (var i = 0; i < grayMat.data.length; i ++) {
        if (fillRange[i] == 255) {
            grayMatCopy.data[i] = null;
        }
    }

    // grayMat = {data: [1, 2, 6, 3, 4, 5]}
    // imgHeight = 2;
    // imgWidth = 3;
    // console.log("graymat data", grayMat.data);
    // compute the gradient of gray image
    var gradient = new Float32Array(imgWidth * imgHeight); 
    var gradients = getGradient(grayMat.data, imgWidth, imgHeight);
    var rowGradient = gradients[0];
    var colGradient = gradients[1];
    var maxRowGradient = new Float32Array(imgWidth * imgHeight); //ygradient
    var maxColGradient = new Float32Array(imgWidth * imgHeight); // xgradient
    var frontPositions = getFrontPositions();
    for (var i = 0; i < grayMat.data.length; i ++) {
        gradient[i] = Math.sqrt(rowGradient[i]**2 + colGradient[i]**2);
    }
    for (position of frontPositions) {
        //console.log("position", position);
        var patchRange = getPatchRange(position);
        var rowGradientPatch = getPatchData(rowGradient, patchRange);
        var colGradientPatch = getPatchData(colGradient, patchRange);
        var gradientPatch = getPatchData(gradient, patchRange);
        var patchWidth = patchRange[0][1] - patchRange[0][0] + 1; // plus 1
        var patchMaxPos = getArgMax(gradientPatch); //unravelIndex(getArgMax(gradientPatch), patchWidth); //unravel to ravel
        //console.log("patchmaxpos", patchMaxPos);
        // rotate 90 degrees
        //maxRowGradient[ravelIndex(position, imgWidth)] = -colGradientPatch[patchMaxPos];  //not sure about index
        //maxColGradient[ravelIndex(position, imgWidth)] = rowGradientPatch[patchMaxPos]; //rotate by 90 degrees
        maxColGradient[ravelIndex(position, imgWidth)] = -rowGradientPatch[patchMaxPos];  //not sure about index
        maxRowGradient[ravelIndex(position, imgWidth)] = colGradientPatch[patchMaxPos]; //rotate by 90 degrees
        // if (rowGradientPatch[patchMaxPos] != 0) {
        //     console.log("r gradient", rowGradientPatch[patchMaxPos])
        // }
        // if (colGradientPatch[patchMaxPos] != 0) {
        //     console.log("c gradient", colGradientPatch[patchMaxPos])
        // }
        //             patch_max_pos = np.unravel_index(
//                 patch_gradient_val.argmax(),
//                 patch_gradient_val.shape
//             )
//             # 旋转90度
//             max_gradient[point[0], point[1], 0] = \
//                 -patch_y_gradient[patch_max_pos]
//             max_gradient[point[0], point[1], 1] = \
//                 patch_x_gradient[patch_max_pos]

//         return max_gradient
    }
    // console.log("maxrowgradient", sumArray(maxRowGradient));
    // console.log("maxcolgradient", sumArray(maxColGradient));
    return [maxRowGradient, maxColGradient]; 

    // console.log("rowGradient", rowGradient);
    // console.log("col gradient", colGradient);
    // for (var i = 0; i < grayMat.data.length; i ++) {
    //     if (i == 0 || i == grayMat.data.length - 1) {
    //         if (grayMat.data[i] == null || grayMat.data[i-1] == null) {
    //             gradient[i] = 0;
    //         } else {
    //             gradient[i] = grayMat.data[i] - grayMat.data[i-1];
    //         }
    //     } else {
    //         if (grayMat.data[i+1] == null || grayMat.data[i-1] == null) {
    //             gradient[i] = 0;
    //         } else {
    //             gradient[i] = (grayMat.data[i+1] - grayMat.data[i-1]) / 2;
    //         }
    //     }
    // }
}

// gray_image = np.copy(self.gray_image)
//         gray_image[self.fill_range == 1] = None
//         gradient = np.nan_to_num(np.array(np.gradient(gray_image)))
//         gradient_val = np.sqrt(gradient[0]**2 + gradient[1]**2)
//         max_gradient = np.zeros([self.height, self.width, 2])
//         front_positions = np.argwhere(self.front == 1)
//         for point in front_positions:
//             patch = self._get_patch_range(point)
//             patch_y_gradient = self._patch_data(gradient[0], patch)
//             patch_x_gradient = self._patch_data(gradient[1], patch)
//             patch_gradient_val = self._patch_data(gradient_val, patch)
//             patch_max_pos = np.unravel_index(
//                 patch_gradient_val.argmax(),
//                 patch_gradient_val.shape
//             )
//             # 旋转90度
//             max_gradient[point[0], point[1], 0] = \
//                 -patch_y_gradient[patch_max_pos]
//             max_gradient[point[0], point[1], 1] = \
//                 patch_x_gradient[patch_max_pos]

//         return max_gradient

function getGradient(data, width, height) { // data is 1d so we need to know the shape in 2d
    var rowGradient = new Float32Array(data.length);
    var colGradient = new Float32Array(data.length);
    var x0, x1, y0, y1, delX, delY;
    for (var x = 0; x < width; x ++) {
        for (var y = 0; y < height; y ++) {
            if (x == 0) {
                x0 = data[ravelIndex([0, y], width)];
                x1 = data[ravelIndex([1, y], width)];
                delX = 1;
                // console.log("flat index", ravelIndex([0, y], imgWidth));
                // console.log("flat index", ravelIndex([1, y], imgWidth));
            } else if (x == width - 1) {
                x0 = data[ravelIndex([width - 2, y], width)];
                x1 = data[ravelIndex([width - 1, y], width)];
                delX = 1;
            } else {
                x0 = data[ravelIndex([x - 1, y], width)];
                x1 = data[ravelIndex([x + 1, y], width)];
                delX = 2;
            }
            if (y == 0) {
                y0 = data[ravelIndex([x, 0], width)];
                y1 = data[ravelIndex([x, 1], width)];
                delY = 1;
            } else if (y == height - 1) {
                y0 = data[ravelIndex([x, height - 2], width)];
                y1 = data[ravelIndex([x, height - 1], width)];
                delY = 1;
            } else {
                y0 = data[ravelIndex([x, y - 1], width)];
                y1 = data[ravelIndex([x, y + 1], width)];
                delY = 2;
            }
            //console.log("x0 x1", x0, x1);
            if (x0 == null || x1 == null) {
                colGradient[ravelIndex([x, y], width)] = 0;
            } else {
                colGradient[ravelIndex([x, y], width)] = (x1 - x0) / delX;
            }
            if (y0 == null || y1 == null) {
                rowGradient[ravelIndex([x, y], width)] = 0;
            } else {
                rowGradient[ravelIndex([x, y], width)] = (y1 - y0) / delY;
            }
        }
    }
    return [rowGradient, colGradient];
}

// update the data term
function updateD(fillRange) {
    var normal = getNormal(fillRange); 
    isophote = getIsophote(fillRange);
    //console.log("isophote", sumArray(isophote[0]), sumArray(isophote[1]));
    DTerm = new Float32Array(imgWidth * imgHeight);
    for (var i = 0; i < DTerm.length; i ++) {
        // console.log("normals and isophote", normal[0][i], normal[1][i], isophote[0][i], isophote[1][i]);
        DTerm[i] = Math.abs(normal[0][i]*isophote[0][i]**2 + normal[1][i]*isophote[1][i]**2 + 0.001);
        // if (DTerm[i] != 0) {
        //     //console.log("normals and isophote", normal[0][i], normal[1][i], isophote[0][i], isophote[1][i]);
        // }
    }
    //console.log("D sum", sumArray(DTerm));
}

// return the range of patch around a pixel point, in 1D flat index 
function getPatchRange(point, patchSize = 9) {
    var halfSize = ~~((patchSize-1) / 2); // floor division 
    // var startX = Math.max(0, point[0] - halfSize);
    // var startY = Math.min(point[0] + halfSize, imgHeight);
    // var endX = Math.max(0, point[1] - halfSize);
    // var endY = Math.min(point[1]+halfSize+1, imgWidth);
    // return [(imgWidth * startY) + startX, (imgWidth * endY) + endX];
    var patchRange = [[Math.max(0, point[0] - halfSize), Math.min(point[0] + halfSize, imgWidth)], 
                        [Math.max(0, point[1] - halfSize), Math.min(point[1]+halfSize+1, imgHeight)]];
    return patchRange;
}

function updatePriority(fillRange) {
    updateFrontConfidence();
    updateD(fillRange);
    for (var i = 0; i < priority.length; i ++) {
        priority[i] = confidence[i] * DTerm[i] * (front.data[i]/255);
        // if (priority[i] > 0) {
        //     //console.log("priority", priority[i]);
        // }
    }
}

function getTargetPoint() {
    return unravelIndex(getArgMax(priority), imgWidth);
}

function updateFrontConfidence() {
    var newConfidence = confidence.slice();
    var frontPositions = getFrontPositions();
    for (position of frontPositions) {
        var patchRange = getPatchRange(position);
        // get the sum of confidence within range
        var patchConfidenceSum = getPatchData(confidence, patchRange).reduce((a, b) => a + b, 0); 
        var area = (patchRange[0][1] - patchRange[0][0]) * (patchRange[1][1] - patchRange[1][0]);
        newConfidence[ravelIndex(position, imgWidth)] = patchConfidenceSum / area / 100; // unsure
        //console.log("confidence", patchConfidenceSum / area / 100);
    }
    confidence = newConfidence;
}

// get the index of the largest element in array
function getArgMax(array) {
    if (array.length === 0) {
        return -1;
    }
    var max = array[0];
    var maxIndex = 0;

    for (var i = 1; i < array.length; i++) {
        if (array[i] > max) {
            maxIndex = i;
            max = array[i];
        }
    }
    return maxIndex;
}

// get a portion of the given 1d data array as specified by the range
function getPatchData(data, patchRange) {
    //var patchData = []
    // for (var i = patchRange[0][0]; i < patchRange[0][1]; i ++) {
    //     patchData.push(imageData[i].slice(patchRange[1][0], patchRange[1][1]));
    // }
    // return patchData;
    // var start = (imgWidth * patchRange[0][1]) + patchRange[0][0];
    // var end =  (imgWidth * patchRange[1][1]) + patchRange[1][0];
    // correct
    // [[x0, x1], [y0, y1]]
    var start = (imgWidth * patchRange[1][0]) + patchRange[0][0];
    var end =  (imgWidth * patchRange[1][1]) + patchRange[0][1];
    //return data.slice(patchRange[0], patchRange[1]);
    return data.slice(start, end);
    
}

function getFrontPositions() {
    var frontPositions = [];
    // for (var x = 0; x < imgHeight; x ++) {
    //     for (var y = 0; y < imgWidth; y++) {
    //         var i = x * imgWidth + y;
    //         if (front.data[i] == 255) {
    //             frontPositions.push([y, x]);
    //         }
    //     }
    // }
    for (var y = 0; y < imgHeight; y ++) {
        for (var x = 0; x < imgWidth; x++) {
            var i = y * imgWidth + x;
            if (front.data[i] == 255) {
                frontPositions.push([x, y]);
            }
        }
    }
    return frontPositions;
}

//     //x_normal = cv.Scharr(self.fill_range, cv.CV_64F, 1, 0)
//         // y_normal = cv.Scharr(self.fill_range, cv.CV_64F, 0, 1)
//         // normal = np.dstack([x_normal, y_normal])
//         // norm = np.sqrt(x_normal**2+y_normal**2).reshape(self.height,
//         //                                                 self.width, 1).repeat(2, axis=2)
//         // norm[norm == 0] = 1
//         // unit_normal = normal/norm
//         // return unit_normal
// }

// convert 2d matrix index to 1d given width of the 2d array
function ravelIndex(twoDIndex, width) {
    return width * twoDIndex[1] + twoDIndex[0];
}

// convert 1d flat array index to 2d matrix index given width of the matrix 
function unravelIndex(index, width) {
    return [index % width, Math.floor(index/width)]; // [x-width, y-height]
}