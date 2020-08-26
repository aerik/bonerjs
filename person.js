

function Person() {
    var boneSizes = {
        shoulderWidth: 55,
        head: 60,
        trunk: 60,
        arms: 60,
        pelvicWidth: 20,
        legs: 60,
        feet: 15,
        hands: 10
    }
    //left / right oriented as character
    //left is x+, right is x-
    var pelvis = new Joint(100, 100);
    var collar = new Joint(pelvis.x, pelvis.y + boneSizes.trunk);
    var leftScapula = new Joint(collar.x + boneSizes.shoulderWidth / 2, collar.y);
    var rightScapula = new Joint(collar.x - boneSizes.shoulderWidth / 2, collar.y);
    var leftHip = new Joint(pelvis.x + boneSizes.pelvicWidth / 2, pelvis.y);
    var rightHip = new Joint(pelvis.x - boneSizes.pelvicWidth / 2, pelvis.y);
    var leftWrist = new Joint(leftScapula.x, leftScapula.y - boneSizes.arms);
    var rightWrist = new Joint(rightScapula.x, rightScapula.y - boneSizes.arms);
    var leftKnuckle = new Joint(leftWrist.x, leftWrist.y - boneSizes.hands);
    var rightKnuckle = new Joint(rightWrist.x, rightWrist.y - boneSizes.hands);
    var leftAnkle = new Joint(leftHip.x, leftHip.y - boneSizes.legs);
    var rightAnkle = new Joint(rightHip.x, rightHip.y - boneSizes.legs);
    var leftToe = new Joint(leftAnkle.x + boneSizes.feet, leftAnkle.y);
    var rightToe = new Joint(rightAnkle.x - boneSizes.feet, rightAnkle.y);
    var headTop = new Joint(collar.x, collar.y + boneSizes.head);


    var skel = new Skeleton(pelvis);
    this.skeleton = skel;
    this.torso = skel.addBone(collar, pelvis);
    this.leftShoulder = skel.addBone(leftScapula, collar);
    this.rightShoulder = skel.addBone(rightScapula, collar);
    this.leftArm = skel.addBone(leftWrist, leftScapula);
    this.rightArm = skel.addBone(rightWrist, rightScapula);
    this.leftHand = skel.addBone(leftKnuckle, leftWrist);
    this.rightHand = skel.addBone(rightKnuckle, rightWrist);
    this.leftHipBone = skel.addBone(leftHip, pelvis);
    this.rightHipBone = skel.addBone(rightHip, pelvis);
    this.leftLeg = skel.addBone(leftAnkle, leftHip);
    this.rightLeg = skel.addBone(rightAnkle, rightHip);
    this.leftFoot = skel.addBone(leftToe, leftAnkle);
    this.rightFoot = skel.addBone(rightToe, rightAnkle);
    this.head = skel.addBone(headTop, collar);
    //not necessary, but nice
    skel.nameBonesFromProperties(this);

    this.torso.drawingLayer = 1;
    this.head.drawingLayer = 2;
    this.leftArm.drawingLayer = 3;
    this.rightArm.drawingLayer = 3;

    this.torso.setGraphic(new ShapeGraphic("rect", 0.65));
    this.leftShoulder.setGraphic(new ShapeGraphic("rect", 0.3));
    this.rightShoulder.setGraphic(new ShapeGraphic("rect", 0.3));
    this.leftArm.setGraphic(new ShapeGraphic("rect", 0.15));
    this.rightArm.setGraphic(new ShapeGraphic("rect", 0.15));
    this.leftHand.setGraphic(new ShapeGraphic("ellipse", 0.7));
    this.rightHand.setGraphic(new ShapeGraphic("ellipse", 0.7));
    this.leftLeg.setGraphic(new ShapeGraphic("rect", 0.2));
    this.rightLeg.setGraphic(new ShapeGraphic("rect", 0.2));
    this.leftFoot.setGraphic(new ShapeGraphic("rect", 0.3));
    this.rightFoot.setGraphic(new ShapeGraphic("rect", 0.3));
    this.head.setGraphic(new ShapeGraphic("ellipse", 0.7));
}



Person.prototype.pointFeetTo = function(dir){
    switch (dir) {
        case DIR.LEFT:
            this.skeleton.rotateBoneTo(this.rightFoot, 0);
            this.skeleton.rotateBoneTo(this.leftFoot, 0);
            break;
        case DIR.RIGHT:
            this.skeleton.rotateBoneTo(this.rightFoot, Math.PI);
            this.skeleton.rotateBoneTo(this.leftFoot, Math.PI);
            break;
        default:
            this.skeleton.rotateBoneTo(this.rightFoot, Math.PI);
            this.skeleton.rotateBoneTo(this.leftFoot, 0);
    }
}

Person.prototype.stand = function () {
    this.leftLeg.direction = 0;
    this.rightLeg.direction = 0;
    this.skeleton.rotateBoneTo(this.leftLeg, Math.PI * 1.5);
    this.skeleton.rotateBoneTo(this.rightLeg, Math.PI * 1.5);
    this.pointFeetTo(DIR.OUT);
}

Person.prototype.walk = function (walkDir, speed) {
    speed = speed | 0;
    var skel = this.skeleton;
    var leftLegBone = this.leftLeg;
    var rightLegBone = this.rightLeg;
    var direction = 1;//left
    if (walkDir == DIR.RIGHT) {
        direction = -1;
    } else if (walkDir != DIR.LEFT) {
        throw "Cannot walk in that direction";
    }
    if (!leftLegBone.direction) {
        leftLegBone.direction = direction = 1;
    }
    var leftHip = leftLegBone.joints[0];
    var rightHip = rightLegBone.joints[0];
    var legUpAngle = -Math.PI / 3;
    var travelRadians = 2 * legUpAngle;
    var stepDist = speed * direction;
    var rotRad = travelRadians * speed / -100;// 4? calculate?
    skel.rotateBoneAroundJoint(leftLegBone, leftHip, rotRad * leftLegBone.direction);
    skel.rotateBoneAroundJoint(rightLegBone, rightHip, rotRad * - leftLegBone.direction);
    var leftLegAngle = leftLegBone.getAngle();
    if (leftLegBone.direction == -1 && leftLegAngle < travelRadians) leftLegBone.direction = 1;
    if (leftLegBone.direction == 1 && leftLegAngle > legUpAngle) leftLegBone.direction = -1;
    skel.move(stepDist, 0)
}

//Person.prototype.getWalkFunc = function (walkDir, speed) { //px/second
//    var direction = 1;//left
//    if (walkDir == DIR.RIGHT) {
//        direction = -1;
//    } else if(walkDir != DIR.LEFT){
//        throw "Cannot walk in that direction";
//    }
//    var skel = this.skeleton;
//    var leftLegBone = this.leftLeg;
//    var rightLegBone = this.rightLeg;
//    var leftHip = leftLegBone.joints[0];
//    var rightHip = rightLegBone.joints[0];
//    var leftLegDir = direction;
//    var legUpAngle = -Math.PI / 3;
//    var travelRadians = 2 * legUpAngle;
//    var lastRun = new Date();
//    return function () {
//        var now = new Date();
//        var elapsed = now - lastRun +1;//cannot be zero
//        lastRun = now;
//        var stepDist = speed * direction / elapsed;
//        var rotRad = elapsed * travelRadians / -1000;
//        skel.rotateBoneAroundJoint(leftLegBone, leftHip, rotRad * leftLegDir);
//        skel.rotateBoneAroundJoint(rightLegBone, rightHip, rotRad * -leftLegDir);
//        var leftLegAngle = leftLegBone.getAngle();
//        if (leftLegDir == -1 && leftLegAngle < travelRadians) leftLegDir = 1;
//        if (leftLegDir == 1 && leftLegAngle > legUpAngle) leftLegDir = -1;
//        skel.move(stepDist,0)
//    }
//}

