document.body.classList.add("loading");
var scene = new THREE.Scene();
var container;
var objects = []
var mesh; // the plane mesh to display image
var dots; //control points
var controls;
var edgeDotMesh; // points on border of image
var imageMaterial;
var bottomPlane;
var topPlane;
var rearPlane;
var leftPlane;
var rightPlane;
var myImage;
var texture;
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
        var planeGeometry = new THREE.PlaneGeometry(imgPlaneWidth, imgPlaneWidth * aspectRatio);
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

function constructScene() {
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
    // var pointLight = new THREE.PointLight(0xffffff);
    // pointLight.position.set(1, 1, 100);
    // scene.add(pointLight);
    // enable orbit controls
    controls.enabled = true;
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
    var destination = new cv.Mat();
    var dsize = new cv.Size(target.BR.x, target.BR.y);
    var sourceCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [source.TL.x, source.TL.y, source.TR.x, source.TR.y,
        source.BR.x, source.BR.y, source.BL.x, source.BL.y]);
    var targetCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [target.TL.x, target.TL.y, target.TR.x, target.TR.y,
        target.BR.x, target.BR.y, target.BL.x, target.BL.y]);
    var transform_matrix = cv.getPerspectiveTransform(sourceCoords, targetCoords);
    cv.warpPerspective(origin, destination, transform_matrix, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
    cv.imshow(canvasId, destination);
}

function createTexturedBoxGeometry(dTop, dBottom, dLeft, dRight) {
    var halfW = Math.abs(mesh.geometry.vertices[0].x);
    var halfH = Math.abs(mesh.geometry.vertices[0].y);
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
}

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