
Tour Into the Picture
=============
Overview
-------------
This is an interactive three.js based web program that generates a 3D scene model from an image (the process is known as single view reconstruction). It follows the techniques described in [Tour Into the Picture](http://graphics.cs.cmu.edu/courses/15-463/2011_fall/Papers/TIP.pdf) by Horry et al., modeling the scene as an axis-parallel box with five faces. 

<p align="center">
  <img width="300" height="200" src="https://image.freepik.com/free-photo/empty-cardboard-box-inside-view-view-from_94046-4.jpg">
  <p align="center">The box layout<p align="center">
</p>

Objectives
-------------
Through this project I wish to accomplish the following:
- Build something with the three.js library.
- Review computer graphics concepts, such as coordinate systems (local, world, screen), transformation matrices and raytracing (for user interaction).
- Figure out the implementation of the functionalities (the paper leaves out the description of the process).

Instructions
-------------
To use the program, first upload an image of your choice. Input images that work best have a single-vanishing-point perspective and show each of the five planes clearly. The image/ folder contains some valid input pictures. 

<p float="left">
<img src="image/building.png" width="400">
<img float="right" src="image/perspective_room.bmp" width="200">
<img src="image/cafe-at-night.jpg" width="180">
</p>

As for the second part of input, indicate the vanishing point and the back plane of the box by dragging around the blue control points on the image plane. The program will update the vanishing lines connecting the vanishing points to the corners of the back plane. Try to make them match the perspective lines in the original input image as closely as possible. 

Once the above step is finished, we can construct the 3D box scene based on the specified coordinates. The process includes calculating 3D coordinates of the box from the 2D specified points, and rectifying each of the five image sections using perspective transform. Finally, we construct the geometry and apply the textuers to its five faces. The user can move around inside of the box in order to look at the scene from different perspectives. Alternatively, once the scene has been constructed, the user can click Tour Scene, and an animated scene walkthrough will be displayed. Enjoy!

Gallery
-------------
Below are some images produced from the program. As you can see, after the reconstruction, we can generate new perspectives of the scene from only one image.

<p float="left">
<img src="sample-result/1-1.png" width="430">
<img src="sample-result/1-3.png" width="430">
</p>
<p float="left">
<img src="sample-result/1-2.png" height="300">
<img src="sample-result/2-1.png" height="300">
<img src="sample-result/2-2.png" width="140">
</p>
<p float="left">
<img src="sample-result/3-1.png" height="300">
<img src="sample-result/3-2.png" height="300">
</p>
</p>
<p float="left">
<img src="sample-result/3-3.png" width="300">
<img src="sample-result/4-1.png" height="300">
</p>
<p float="left">
<img src="sample-result/4-3.png" width="600">
<img src="sample-result/4-2.png" width="250">
</p>

Here is a sample "tour" into an image:
<p align="center">
  <img width="700" src="/sample-result/demo1.gif">
</p>
