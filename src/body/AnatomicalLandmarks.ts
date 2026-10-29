/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vec3 } from '../math/Vec3';
import { BodyProportionsConfig } from './BodyProportions';

export interface LandmarkSet {
  // Head & Face
  crown: Vec3;
  headCenter: Vec3;
  chin: Vec3;
  leftEye: Vec3;
  rightEye: Vec3;
  noseTip: Vec3;
  mouth: Vec3;

  // Neck & Torso
  neckBase: Vec3;
  sternum: Vec3;
  chestCenter: Vec3;
  waistCenter: Vec3;
  pelvisCenter: Vec3;

  // Shoulders & Arms
  leftShoulder: Vec3;
  rightShoulder: Vec3;
  leftElbow: Vec3;
  rightElbow: Vec3;
  leftWrist: Vec3;
  rightWrist: Vec3;
  leftHand: Vec3;
  rightHand: Vec3;
  leftFingertips: Vec3;
  rightFingertips: Vec3;

  // Hips & Legs
  leftHip: Vec3;
  rightHip: Vec3;
  leftKnee: Vec3;
  rightKnee: Vec3;
  leftAnkle: Vec3;
  rightAnkle: Vec3;
  leftHeel: Vec3;
  rightHeel: Vec3;
  leftToe: Vec3;
  rightToe: Vec3;
}

export class AnatomicalLandmarks {
  /**
   * Calculates all bind-pose 3D landmarks deterministically from proportions.
   * Coordinate system:
   * +X: character's left
   * +Y: up
   * +Z: forward
   */
  static generate(props: BodyProportionsConfig, rootOffset: Vec3 = Vec3.ZERO): LandmarkSet {
    const H = props.totalHeight;

    // Ground plane is Y = 0 + rootOffset.y
    const yGround = rootOffset.y;
    const yAnkle = yGround + props.footHeight;
    const yKnee = yAnkle + props.lowerLegLength;
    const yHip = yKnee + props.thighLength;

    // Torso heights
    const yPelvis = yHip + 2.0;
    let torsoHeight = H - props.headHeight - props.neckLength - yPelvis;
    if (torsoHeight < 15) {
      torsoHeight = 15;
    }
    const yWaist = yPelvis + torsoHeight * 0.45;
    const yChest = yPelvis + torsoHeight * 0.85;
    const yNeckBase = yPelvis + torsoHeight;

    // Head heights driven by neckLength
    const yChin = yNeckBase + props.neckLength * 0.65;
    const yHeadCenter = yNeckBase + props.neckLength + (props.headHeight * 0.45);
    const yCrown = yNeckBase + props.neckLength + props.headHeight;

    // Lateral offsets (+X = Character Left, -X = Character Right)
    const hipX = props.pelvisWidth * 0.35;
    const shoulderX = props.shoulderWidth * 0.5;

    // Eye offsets on the skull
    const eyePupillaryDistance = 6.4; // 3.2 on each side
    const eyeY = yHeadCenter + props.headHeight * 0.05;
    const eyeZ = rootOffset.z + props.headDepth * 0.44;

    // Arm bind-pose in subtle A-pose (slight outward angle 15°)
    const armAngleRad = (15 * Math.PI) / 180;
    const sinA = Math.sin(armAngleRad);
    const cosA = Math.cos(armAngleRad);

    const leftShoulderPos = new Vec3(rootOffset.x + shoulderX, yChest + 2.0, rootOffset.z);
    const rightShoulderPos = new Vec3(rootOffset.x - shoulderX, yChest + 2.0, rootOffset.z);

    const armDeltaX = props.armLength * sinA;
    const armDeltaY = props.armLength * cosA;
    const forearmDeltaX = props.forearmLength * sinA;
    const forearmDeltaY = props.forearmLength * cosA;
    const handDeltaX = props.handLength * sinA;
    const handDeltaY = props.handLength * cosA;

    const leftElbow = new Vec3(leftShoulderPos.x + armDeltaX, leftShoulderPos.y - armDeltaY, leftShoulderPos.z);
    const rightElbow = new Vec3(rightShoulderPos.x - armDeltaX, rightShoulderPos.y - armDeltaY, rightShoulderPos.z);

    const leftWrist = new Vec3(leftElbow.x + forearmDeltaX, leftElbow.y - forearmDeltaY, leftElbow.z);
    const rightWrist = new Vec3(rightElbow.x - forearmDeltaX, rightElbow.y - forearmDeltaY, rightElbow.z);

    const leftHand = new Vec3(leftWrist.x + handDeltaX * 0.5, leftWrist.y - handDeltaY * 0.5, leftWrist.z);
    const rightHand = new Vec3(rightWrist.x - handDeltaX * 0.5, rightWrist.y - handDeltaY * 0.5, rightWrist.z);

    const leftFingertips = new Vec3(leftWrist.x + handDeltaX, leftWrist.y - handDeltaY, leftWrist.z);
    const rightFingertips = new Vec3(rightWrist.x - handDeltaX, rightWrist.y - handDeltaY, rightWrist.z);

    // Legs
    const leftHip = new Vec3(rootOffset.x + hipX, yHip, rootOffset.z);
    const rightHip = new Vec3(rootOffset.x - hipX, yHip, rootOffset.z);

    const leftKnee = new Vec3(leftHip.x, yKnee, rootOffset.z + 0.5);
    const rightKnee = new Vec3(rightHip.x, yKnee, rootOffset.z + 0.5);

    const leftAnkle = new Vec3(leftHip.x, yAnkle, rootOffset.z - 0.5);
    const rightAnkle = new Vec3(rightHip.x, yAnkle, rootOffset.z - 0.5);

    const heelZ = rootOffset.z - props.footLength * 0.3;
    const toeZ = rootOffset.z + props.footLength * 0.7;

    return {
      crown: new Vec3(rootOffset.x, yCrown, rootOffset.z),
      headCenter: new Vec3(rootOffset.x, yHeadCenter, rootOffset.z),
      chin: new Vec3(rootOffset.x, yChin, rootOffset.z + props.headDepth * 0.35),
      leftEye: new Vec3(rootOffset.x + eyePupillaryDistance * 0.5, eyeY, eyeZ),
      rightEye: new Vec3(rootOffset.x - eyePupillaryDistance * 0.5, eyeY, eyeZ),
      noseTip: new Vec3(rootOffset.x, eyeY - 2.5, rootOffset.z + props.headDepth * 0.52),
      mouth: new Vec3(rootOffset.x, yChin + 2.5, rootOffset.z + props.headDepth * 0.42),

      neckBase: new Vec3(rootOffset.x, yNeckBase, rootOffset.z),
      sternum: new Vec3(rootOffset.x, yChest + 1.0, rootOffset.z + props.chestDepth * 0.45),
      chestCenter: new Vec3(rootOffset.x, yChest, rootOffset.z),
      waistCenter: new Vec3(rootOffset.x, yWaist, rootOffset.z),
      pelvisCenter: new Vec3(rootOffset.x, yPelvis, rootOffset.z),

      leftShoulder: leftShoulderPos,
      rightShoulder: rightShoulderPos,
      leftElbow,
      rightElbow,
      leftWrist,
      rightWrist,
      leftHand,
      rightHand,
      leftFingertips,
      rightFingertips,

      leftHip,
      rightHip,
      leftKnee,
      rightKnee,
      leftAnkle,
      rightAnkle,
      leftHeel: new Vec3(leftHip.x, yGround, heelZ),
      rightHeel: new Vec3(rightHip.x, yGround, heelZ),
      leftToe: new Vec3(leftHip.x, yGround, toeZ),
      rightToe: new Vec3(rightHip.x, yGround, toeZ),
    };
  }
}
