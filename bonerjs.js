
var DIR = { OUT: 0, LEFT: 1, RIGHT: 2 };

function ImageGraphic(srcImg) {
    var original = srcImg;
    var canvas = document.createElement("canvas");
    var options = {};
    var spriteRows = 1;
    var spriteCols = 1;
    var rowIdx = 0;
    var colIdx = 0;
    var horizOrientation = 1;
    var vertOrientation = 1;

    this.getType = function () {
        return "image";
    }
    this.updateOptions = function (opts) {
        canvas.height = 0;
        options = opts;
    }
    this.getOptions = function () {
        return options;
    }
    this.flipVert = function () {
        vertOrientation *= -1;
    }
    this.flipHoriz = function () {
        horizOrientation *= -1;
    }

    this.getImage = function (height) {
        var ctx = canvas.getContext("2d");
        var spriteHeight = original.height / spriteRows;
        var spriteWidth = original.width / spriteCols;
        var scale = height / spriteHeight;
        var width = spriteWidth * scale;
        if (width == 0 || height == 0) return null;
        canvas.height = height;
        canvas.width = width;
        ctx.save();
        // Set the origin to the center of the image
        ctx.translate(width / 2, height / 2);
        ctx.scale(horizOrientation, vertOrientation);//flip
        ctx.drawImage(original, spriteWidth * colIdx, spriteHeight * rowIdx, spriteWidth, spriteHeight, -width/2, -height/2, width, height);
        ctx.restore();
        return canvas;
    }
    this.setSpriteDims = function (rows, cols) {
        spriteCols = cols;
        spriteRows = rows;
    }
    this.getSpriteDims = function () {
        return { rows: spriteRows, cols: spriteCols };
    }
    this.setSpriteIdx = function (row, col) {
        rowIdx = row;
        colIdx = col;
    }
    this.getSpriteIdx = function () {
        return { row: rowIdx, col: colIdx };
    }
}
ImageGraphic.fromUrl = function (srcUrl) {
    var img = new Image();
    img.src = srcUrl;
    return new ImageGraphic(img);
}

function ShapeGraphic(type, widthRatio, opts) {
    var canvas = document.createElement("canvas");
    var drawType = type;
    var ratio = widthRatio;
    var options = opts;
    canvas.height = 0;

    this.getType = function () {
        return drawType;
    }
    this.updateOptions = function (opts) {
        canvas.height = 0;
        options = opts;
    }
    this.getOptions = function () {
        return options;
    }
    this.getImage = function (height) {
        if (height == canvas.helght) return canvas;
        var ctx = canvas.getContext("2d");
        var width = height * ratio;
        canvas.height = height;
        canvas.width = width;
        var halfWidth = width / 2;
        var halfHeight = height / 2;
        if (options) {
            if (options.color) ctx.fillStyle = options.color;
        }
        switch (drawType) {
            case "rect":
                ctx.beginPath();
                ctx.rect(0,0, width, height);
                ctx.fill();
                break;
            case "ellipse":
                ctx.beginPath();
                ctx.ellipse(halfWidth, halfHeight,halfWidth,halfHeight,0, 0, 2 * Math.PI);
                ctx.fill();
                break;
        }
        return canvas;
    }
}

function SoundObject(srcUrl) {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    var audioBuffer = null;
    var source = null;
    var bufferSize = 4096;
    var lastSampleVol = 0;
    fetch(srcUrl)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(function (buf) {
            audioBuffer = buf;
        });
    this.getBuffer = function () {
        return audioBuffer;
    }
    this.onVolUp = function (isUp) {

    }

    var node = audioContext.createScriptProcessor(bufferSize, 1, 1);
    var that = this;
    node.onaudioprocess = function (e) {
        var buflen = e.inputBuffer.length;
        var input = e.inputBuffer.getChannelData(0);
        var output = e.outputBuffer.getChannelData(0);
        var max = 0;
        var cur = 0;
        for (var i = 0; i < buflen; i++) {
            output[i] = input[i];
            cur = Math.abs(input[i]);
            if (cur > max) max = cur;
        }
        that.onVolUp(max > lastSampleVol);
        lastSampleVol = max;
    }

    this.play = function () {
        lastSampleVol = 0;
        return new Promise(function (resolve, reject) {
            if (source) source.stop();
            source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(node);
            node.connect(audioContext.destination);
            source.onended = function (e) {
                console.warn("Ended playback");
                node.disconnect();
                source.disconnect();
                resolve();
            }
            source.start();
        })
    }
}

/**
* Shared by one or more bones
* @param {number} x
* @param {number} y
*/
function Joint(x, y) {
    this.x = x;
    this.y = y;
}
Joint.prototype.rotateAroundPoint = function(cx, cy, rad) {
    //translate
    var jx = this.x - cx;
    var jy = this.y - cy;
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    // rotate point
    var xnew = jx * c - jy * s;
    var ynew = jx * s + jy * c;
    // translate point back:
    this.x = xnew + cx;
    this.y = ynew + cy;
    return this;//to allow chaining
}



function Skeleton(rootJoint) {
    var root = rootJoint;
    var jointBones = new Map();
    jointBones.set(root, []);
    var boneCount = 0;

    /**
 * On object represented by two points
 * It's "width" is only specified by it's graphic
 * @constructor
 * @param {Joint} firstJoint - joint[0] and is always closest to root
 * @param {Joint} secondJoint - joint[1] and farther from root
 * @param {string} name
 */
function Bone (firstJoint, secondJoint, name) {
    this.joints = [firstJoint, secondJoint];
    this.name = name;
    this.drawingLayer = 0;
    this.direction = 0;// 1, 0, -1
    var imgGraphic = null;

    this.setGraphic = function (iGraphic) {
        imgGraphic = iGraphic;
    }
    this.getGraphic = function () {
        return imgGraphic;
    }
    this.getImage = function () {
        if (imgGraphic != null) {
            return imgGraphic.getImage(this.getLength());
        }
        return null;
    }
}
Bone.prototype.getLength = function () {
    var xDist = this.joints[0].x - this.joints[1].x;
    var yDist = this.joints[0].y - this.joints[1].y;
    return Math.sqrt(xDist * xDist + yDist * yDist);
}

Bone.prototype.getJointIdx = function (joint) {
    if (this.joints[0] == joint) return 0;
    if (this.joints[1] == joint) return 1;
    return -1;
}
Bone.prototype.getOppositeJoint = function (joint) {
    var idx = this.getJointIdx(joint);
    if (idx == 0) return this.joints[1];
    if (idx == 1) return this.joints[0];
    return null;
}
Bone.prototype.getAngle = function () {
    var joint = this.joints[0];
    var oppo = this.joints[1];
    var angleRadians = Math.atan2(oppo.y - joint.y, oppo.x - joint.x);
    return angleRadians;
}
Bone.prototype.getAngleFromJoint = function(joint){
    var oppo = bone.getOppositeJoint(joint);
    var angleRadians = Math.atan2(oppo.y - joint.y, oppo.x - joint.x);
    return angleRadians;
}

    this.addBone = function (newJoint, oldJoint, name) {
        boneCount++;
        if (!name) name = "bone" + boneCount;
        if (oldJoint) {
            var found = jointBones.has(oldJoint);
            if (!found) {
                throw "oldjoint is not part of the skeleton";
            }
        } else {
            oldJoint = root;
        }
        var b = new Bone(oldJoint, newJoint, name);
        jointBones.set(newJoint, []);
        jointBones.get(newJoint).push(b);
        jointBones.get(oldJoint).push(b);
        return b;
    }

    this.containsBone = function (bone) {
        if (!(bone instanceof Bone)) return false;
        var keyIter = jointBones.keys();
        for (var key of keyIter) {
            var bones = jointBones.get(key);
            if (bones.indexOf(bone) > -1) return true;
        }
        return false;
    }

    this.toJson = function () {
        var joints = Array.from(jointBones.keys());
        var bones = this.getAllBones();
        var boneDefs = [];
        for (var i = 0; i < bones.length; i++) {
            var def = {};
            var bone = bones[i];
            def.joints = [joints.indexOf(bone.joints[0]), joints.indexOf(bone.joints[1])];
            def.name = bone.name;
            def.drawingLayer = bone.drawingLayer;
            boneDefs.push(def);
        }
        var skel = { joints: joints, bones: boneDefs };
        return JSON.stringify(skel);
    }
    this.getAllBones = function getAllBones() {
        var boneAry = [];
        jointBones.forEach(function (bones, joint) {
            for (var i = 0; i < bones.length; i++) {
                if (boneAry.indexOf(bones[i]) == -1) boneAry.push(bones[i]);
            }
        })
        return boneAry;
    }
    this.getAllJoints = function getAllJoints() {
        return Array.from(jointBones.keys());
    }

    /**
     * jointIdx is the joint the downstream bones are connected from
     * @param {Bone} startBone
     * @param {Joint} jointIdx
     */
    this.getDownStreamBones = function getDownStreamBones(startBone, jointIdx) {
        var boneAry = [];
        var joint = startBone.joints[jointIdx];
        var connected = jointBones.get(joint);
        for (var i = 0; i < connected.length; i++) {
            var curBone = connected[i];
            if (curBone != startBone) {
                boneAry.push(curBone);
                var idx = -1;//other end of curBone
                if (curBone.joints[0] == joint) idx = 1;
                if (curBone.joints[1] == joint) idx = 0;
                Array.prototype.push.apply(boneAry, getDownStreamBones(curBone, idx));
            }
        }
        return boneAry;
    }

    this.move = function (x,y) {
        jointBones.forEach(function (bones, joint) {
            joint.x += x;
            joint.y += y;
        })
    }
    this.moveTo = function (x, y) {
        var dx = x - root.x;
        var dy = y - root.y;
        this.move(dx, dy);
    }
}

Skeleton.prototype.getBounds = function () {
    var minX = Infinity;
    var maxX = -Infinity;
    var minY = Infinity;
    var maxY = -Infinity;
    var joints = this.getAllJoints();
    for (var i = 0; i < joints.length; i++) {
        var j = joints[i];
        if (j.x > maxX) maxX = j.x;
        if (j.x < minX) minX = j.x;
        if (j.y > maxY) maxY = j.y;
        if (j.y < minY) minY = j.y;
    }
    return {
        min: { x: minX, y: minY }, max: { x: maxX, y: maxY }
    }
}
Skeleton.prototype.scale = function (frac) {
    var curSize = this.getBounds();
    var midPt = { x: (curSize.max.x + curSize.min.x) / 2, y: (curSize.max.y + curSize.min.y) / 2 };
    var joints = this.getAllJoints();
    for (var i = 0; i < joints.length; i++) {
        var j = joints[i];
        var dist = { x: j.x - midPt.x, y: j.y - midPt.y };
        j.x = midPt.x + (frac * dist.x);
        j.y = midPt.y + (frac * dist.y);
    }
}
Skeleton.prototype.nameBonesFromProperties = function (obj) {
    for (var p in obj) {
        if (obj.hasOwnProperty(p) && this.containsBone(obj[p])) {
            obj[p].name = p;
        }
    }
}
Skeleton.prototype.rotateBoneTo = function(bone, rad){
    var curAngle = bone.getAngle();
    var rotAngle = rad - curAngle;
    this.rotateBoneAroundEnd(bone, 0, rotAngle);
}
Skeleton.prototype.rotateBoneAroundJoint = function (bone, joint, rad) {
    var idx = -1;
    if (bone.joints[0] == joint) idx = 0;
    if (bone.joints[1] == joint) idx = 1;
    this.rotateBoneAroundEnd(bone, idx, rad);
}
Skeleton.prototype.rotateBoneAroundEnd = function (bone, idx, rad) {
    var joint = bone.joints[idx];
    var cx = joint.x;
    var cy = joint.y;
    var otherSide = idx == 1 ? 0 : 1;
    var boneAry = this.getDownStreamBones(bone, otherSide);
    if (boneAry && boneAry.length > 0) {
        for (var i = 0; i < boneAry.length; i++) {
            var curBone = boneAry[i];
            for (var j = 0; j < 2; j++) {
                var curJoint = curBone.joints[j];
                curJoint.rotateAroundPoint(cx, cy, rad);
            }
        }
    } else {
        bone.joints[otherSide].rotateAroundPoint(cx, cy, rad);
    }
}

Skeleton.prototype.rotateAround = function(x, y, rad){
    var joints = this.getAllJoints();
    for (var i = 0; i < joints.length; i++) {
        var j = joints[i];
        j.rotateAroundPoint(x, y, rad);
    }
}

/**
 * Draws on canvas oriented so that y increases toward top of canvas
 * @param {any} canvas
 */
Skeleton.prototype.renderBones = function (canvas) {
    var cHeight = canvas.height;
    var ctx = canvas.getContext("2d");
    ctx.save();
    ctx.lineStyle = "1px black";
    var bones = this.getAllBones();
    for (var i = 0; i < bones.length; i++) {
        var bone = bones[i];
        ctx.beginPath();
        ctx.moveTo(bone.joints[0].x, cHeight - bone.joints[0].y);
        ctx.lineTo(bone.joints[1].x, cHeight - bone.joints[1].y);
        ctx.stroke();
    }
    ctx.restore();
}
Skeleton.prototype.renderImages = function (canvas) {
    var cHeight = canvas.height;
    var ctx = canvas.getContext("2d");
    ctx.save();
    ctx.lineStyle = "1px black";
    var bones = this.getAllBones();
    bones.sort(function (a, b) {
        return a.drawingLayer - b.drawingLayer;
    })
    for (var i = 0; i < bones.length; i++) {
        var bone = bones[i];
        var img = bone.getImage();
        if (img != null) {
            if (img.height == 0 || img.width == 0) {
                console.log(bone);
                break;
            }
            var g = bone.getGraphic();
            var opts = g.getOptions();
            var boneCx = (bone.joints[0].x + bone.joints[1].x) / 2;
            if (opts.xOffset) {
                boneCx -= opts.xOffset * (bone.joints[0].x - bone.joints[1].x);
            }
            var boneCy = cHeight - (bone.joints[0].y + bone.joints[1].y) / 2;
            var angle = bone.getAngle();
            ctx.save();
            // move to the center of the canvas
            ctx.translate(boneCx, boneCy);
            // rotate the canvas to the specified degrees
            ctx.rotate(-(angle - Math.PI / 2));//assume image is oriented vertically
            ctx.drawImage(img, - img.width / 2, - img.height / 2);
            ctx.restore();
        }
    }
    ctx.restore();
}

/**
 * Executes renderFunc steps times over totalDur milliseconds
 * @param {any} renderFunc
 * @param {number} steps
 * @param {number} totalDur
 * @returns {Promise}
 */
function animateFor(moveFunc, steps, waitms) {
    var timeout = 33;//30fps
    if (waitms) timeout = waitms;
    var remaining = steps;
    return new Promise(function (resolve, reject) {
        var innerFunc = function () {
            moveFunc();
            remaining--;
            if (remaining > 0) {
                setTimeout(innerFunc, timeout);
            } else {
                resolve();
            }
        }
        innerFunc();
    });
}

function animateUntil(moveFunc, waitms) {
    var timeout = 33;//30fps
    if (waitms) timeout = waitms;
    return new Promise(function (resolve, reject) {
        var innerFunc = function () {
            if (moveFunc()) {
                resolve();
            } else {
                setTimeout(innerFunc, timeout);
            }
        }
        innerFunc();
    });
}

function wait(milliSecs) {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, milliSecs);
    });
}