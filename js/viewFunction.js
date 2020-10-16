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
var totalFillRange;
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
    texture = loader.load(userImageURL);
    var material = new THREE.MeshLambertMaterial({
        map: loader.load(userImageURL)
    });
    imageMaterial = new THREE.MeshBasicMaterial({
        map: loader.load(userImageURL)
    });
    var _URL = window.URL || window.webkitURL;
    var img = new Image();
    img.onload = function () {
        imgHeight = img.height;
        imgWidth = img.width;
        var aspectRatio = imgHeight/imgWidth;
        imgPlaneHeight = imgPlaneWidth*aspectRatio;
        var planeGeometry = new THREE.PlaneGeometry(imgPlaneWidth, imgPlaneHeight);
        mesh = new THREE.Mesh(planeGeometry, material);
        mesh.name = 'planeMeshObject';
        mesh.position.set(0,0,0);

        controls = new THREE.OrbitControls( camera, renderer.domElement  );
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


function addControlPoints() {
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
            if (intersects.length > 0) {
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
        } else if (dragging && currentIndex !== null && currentName == "foregroundMask") { // adjusting foreground mask

        }
    }

    window.addEventListener("mouseup", mouseUp, false);
    function mouseUp(event) {
        dragging = false;
        currentIndex = null;
        settingForegroundMask = false;
    }

    function setRaycaster(event) {
        getMouse(event);
        raycaster.setFromCamera(mouse, camera);
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

function isBlank(canvasID) {
    var canvas = document.getElementById(canvasID);
    return !canvas.getContext('2d')
      .getImageData(0, 0, canvas.width, canvas.height).data
      .some(channel => channel !== 0);
}

function constructScene() {
    // if (maskPoints != null && isBlank("inpaint")) {
    //     // alert("Please inpaint the image first");
    //     // return;
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
    if (maskPoints != null && !isBlank("inpaint")) { // there is foreground mask so use inpainted image
        origin = cv.imread("inpaint");
    }
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
        var l = halfH;
        //var l = dots.geometry.vertices[0].y - mesh.geometry.vertices[2].y;
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
            grabCutMask("mask", minX, minY, maxX, maxY, 2);
            maskImage.src = canvas.toDataURL();
            var loader = new THREE.TextureLoader();
            var maskMaterial  = new THREE.MeshLambertMaterial({
                map: loader.load(canvas.toDataURL())
            });
            maskMaterial.transparent = true;
            var maskPlaneGeometry = new THREE.PlaneGeometry(w_mask, h_mask);
            maskPlane= new THREE.Mesh(maskPlaneGeometry, maskMaterial);
            xtrans_mask = maskPoints.vertices[i].x * (d_mask+f)/f; //maskPoints.vertices[i].x * (d_mask+f)/f;
            maskPlane.translateX(xtrans_mask + w_mask/2 );
            maskPlane.translateY(-(halfH - h_mask/2)); //-halfH + q
            // xtrans_mask = maskPoints.vertices[i].x * (d_mask+f)/f; //maskPoints.vertices[i].x * (d_mask+f)/f;
            // maskPlane.translateX(xtrans_mask/2 );
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

function grabCutMask(maskCanvas, minX, minY, maxX, maxY, boarder) {
    widthMask = maxX - minX;
    heightMask = maxY - minY;
    let src = cv.imread(maskCanvas);
    cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
    let maskGrabcut = new cv.Mat();
    let bgdModel = new cv.Mat();
    let fgdModel = new cv.Mat();
    let rect = new cv.Rect(boarder, boarder, widthMask - boarder, heightMask - boarder);
    cv.grabCut(src, maskGrabcut, rect, bgdModel, fgdModel, 1, cv.GC_INIT_WITH_RECT);
    // add alpha channel
    cv.cvtColor(src, src, cv.COLOR_RGB2RGBA, 0);
    // draw foreground
    for (let i = 0; i < src.rows; i++) {
        for (let j = 0; j < src.cols; j++) {
            if (maskGrabcut.ucharPtr(i, j)[0] == 0 || maskGrabcut.ucharPtr(i, j)[0] == 2) {
                // set background to transparent
                src.ucharPtr(i, j)[3] = 0;
            }
        }
    }
    cv.imshow(maskCanvas, src);
    src.delete(); maskGrabcut.delete(); bgdModel.delete(); fgdModel.delete(); 
}

//-----------------------------------------------------------------------------
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
    var canvas=document.getElementById("inpaint");
    canvas.width = imgWidth;
    canvas.height = imgHeight;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(texture.image, 0, 0);
    var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var masku8 = new Uint8Array(imgWidth * imgHeight);
    console.log("imgData", imgData);
    console.log("data length", imgData.data.length);
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
            }
        }
    }

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

    var src = cv.imread(texture.image);
    grayMat = new cv.Mat();
    cv.cvtColor(src, grayMat, cv.COLOR_RGBA2GRAY, 0);
    src.delete();

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
    totalFillRange = sumArray(fillRange);
    inpaintAndShowProgress(imgu8, imgu8R, imgu8G, imgu8B, imgData, ctx);
    ctx.putImageData(imgData, 0, 0);
}

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
    if (sumArray(fillRange) != 0) {
        getEdge(fillRange);
        updatePriority(fillRange);
        var targetPoint = getTargetPoint();
        var bestPatchRange = getBestPatchRange(imgu8, targetPoint, diffMethod);
        console.log("best patch range", bestPatchRange[0], bestPatchRange[1]);
        fillImage(imgu8, targetPoint, bestPatchRange);
        fillImage(imgu8R, targetPoint, bestPatchRange);
        fillImage(imgu8G, targetPoint, bestPatchRange);
        fillImage(imgu8B, targetPoint, bestPatchRange);
        updateFillRange(fillRange, targetPoint);
        var percentage = ((1.0 - sumArray(fillRange)/totalFillRange) * 100.0).toFixed(2);
        document.getElementById("progress").innerHTML = "Inpaint progress: " + percentage.toString() + "%";
        console.log("fillrange is now", sumArray(fillRange));
        console.log("Inpaint progress", percentage.toString() + "%")
        for (var i = 0; i < imgu8R.length; i ++) {
            if (fillRange[i] == 0) {
                imgData.data[4*i ] = imgu8R[i];
                imgData.data[4*i + 1 ] = imgu8G[i];
                imgData.data[4*i + 2] = imgu8B[i];
            }
        }
        ctx.putImageData(imgData, 0, 0);
        setTimeout(inpaint, delay, imgu8, imgu8R, imgu8G, imgu8B, imgData, ctx);
    }
}

function fillImage(image, targetPoint, sourcePatchRange) {
    var targetPatchRange = getPatchRange(targetPoint);
    var start = (imgWidth * targetPatchRange[1][0]) + targetPatchRange[0][0];
    var end =  (imgWidth * targetPatchRange[1][1]) + targetPatchRange[0][1];
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
    for (var i = start; i < end; i ++) {
        if (fillRange[i] > 0) {
            image[i] = image[i + offset];
        }
    }
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
    front = new cv.Mat();
    //cv.cvtColor(src, src, cv.COLOR_RGB2GRAY, 0);
    cv.Laplacian(src, front, cv.CV_8U, 1, 1, 0, cv.BORDER_DEFAULT); 
    //cv.Canny(src, dst, 50, 100, 3, false);
    cv.imshow('inpaint', front);
    src.delete();// dst.delete();
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
    // NOTE: might be 255 since masku8 values are set to 255
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
    var targetIsophote = [isophote[0][targetPos[0]], isophote[1][targetPos[1]]]; // make sure xy is correct
    var targetIsophoteVal = Math.sqrt(targetIsophote[0]**2 + targetIsophote[1]**2);
    var graySourcePatch = getPatchData(grayMat.data, sourcePatchRange);
    var sourcePatchWidth = sourcePatchRange[0][1] - sourcePatchRange[0][0] + 1;
    var sourcePatchHeight = sourcePatchRange[1][1] - sourcePatchRange[1][0] + 1;
    var sourcePatchGradient = getGradient(graySourcePatch, sourcePatchWidth, sourcePatchHeight);
    var sourcePatchVal = new Float32Array(graySourcePatch.length);
    for (var i = 0; i < sourcePatchVal.length; i ++) {
        sourcePatchVal[i] = Math.sqrt(sourcePatchGradient[0][i]**2 + sourcePatchGradient[1][i]**2);
    }
    var maxPatchPos = getArgMax(sourcePatchVal); // unravelIndex(getArgMax(sourcePatchVal), sourcePatchWidth);
    var sourceIsophote = [-sourcePatchGradient[1][maxPatchPos],
                            sourcePatchGradient[0][maxPatchPos]];
    var sourceIsophoteVal = sourcePatchVal[getArgMax(sourcePatchVal)];
    var dotProduct = Math.abs(sourceIsophote[0]*targetIsophote[0] + sourceIsophote[1]*targetIsophote[1]);
    var norm = sourceIsophoteVal * targetIsophoteVal;
    var cosTheta = 0;
    if (norm != 0) {
        cosTheta = dotProduct/norm;
    }
    var diffVal = Math.abs(sourceIsophoteVal - targetIsophoteVal);
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
        }
    }
    src.delete();
    dstx.delete();
    dsty.delete();
    return [xUnitNormal, yUnitNormal];
}

function getIsophote(fillRange) {
    var grayMatCopy = grayMat.clone();
    for (var i = 0; i < grayMat.data.length; i ++) {
        if (fillRange[i] == 255) {
            grayMatCopy.data[i] = null;
        }
    }

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
        var patchRange = getPatchRange(position);
        var rowGradientPatch = getPatchData(rowGradient, patchRange);
        var colGradientPatch = getPatchData(colGradient, patchRange);
        var gradientPatch = getPatchData(gradient, patchRange);
        var patchWidth = patchRange[0][1] - patchRange[0][0] + 1; // plus 1
        var patchMaxPos = getArgMax(gradientPatch); //unravelIndex(getArgMax(gradientPatch), patchWidth); //unravel to ravel
        // rotate 90 degrees
        //maxRowGradient[ravelIndex(position, imgWidth)] = -colGradientPatch[patchMaxPos];  //not sure about index
        //maxColGradient[ravelIndex(position, imgWidth)] = rowGradientPatch[patchMaxPos]; //rotate by 90 degrees
        maxColGradient[ravelIndex(position, imgWidth)] = -rowGradientPatch[patchMaxPos];  //not sure about index
        maxRowGradient[ravelIndex(position, imgWidth)] = colGradientPatch[patchMaxPos]; //rotate by 90 degrees
    }
    return [maxRowGradient, maxColGradient]; 
}

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
        DTerm[i] = Math.abs(normal[0][i]*isophote[0][i]**2 + normal[1][i]*isophote[1][i]**2 + 0.001);
    }
}

// return the range of patch around a pixel point, in 1D flat index 
function getPatchRange(point, patchSize = 9) {
    var halfSize = ~~((patchSize-1) / 2); // floor division 
    var patchRange = [[Math.max(0, point[0] - halfSize), Math.min(point[0] + halfSize, imgWidth)], 
                        [Math.max(0, point[1] - halfSize), Math.min(point[1]+halfSize+1, imgHeight)]];
    return patchRange;
}

function updatePriority(fillRange) {
    updateFrontConfidence();
    updateD(fillRange);
    for (var i = 0; i < priority.length; i ++) {
        priority[i] = confidence[i] * DTerm[i] * (front.data[i]/255);
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
    var start = (imgWidth * patchRange[1][0]) + patchRange[0][0];
    var end =  (imgWidth * patchRange[1][1]) + patchRange[0][1];
    return data.slice(start, end);
    
}

function getFrontPositions() {
    var frontPositions = [];
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

// convert 2d matrix index to 1d given width of the 2d array
function ravelIndex(twoDIndex, width) {
    return width * twoDIndex[1] + twoDIndex[0];
}

// convert 1d flat array index to 2d matrix index given width of the matrix 
function unravelIndex(index, width) {
    return [index % width, Math.floor(index/width)]; // [x-width, y-height]
}