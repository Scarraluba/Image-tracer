/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CharacterModel, CharacterGazeData } from '../body/CharacterModel';
import { MobileTab } from './MobileBottomNav';
import { PROPORTION_PRESETS, BodyProportions } from '../body/BodyProportions';
import {
  Bone,
  Sliders,
  Compass,
  User,
  RotateCcw,
  Circle,
  Eye,
  Link,
  Unlink,
  Sparkles,
  Move,
} from 'lucide-react';

import { ReferenceImageConfig } from '../reference/ReferenceImageModel';
import { ReferenceImagePanel } from './ReferenceImagePanel';

interface SelectedPanelContentProps {
  activeTab: MobileTab;
  character: CharacterModel;
  gazeData?: CharacterGazeData;
  onUpdateCharacter: () => void;
  onResetPose: () => void;
  referenceConfig: ReferenceImageConfig;
  onUpdateReferenceConfig: (newConfig: Partial<ReferenceImageConfig>) => void;
  showTargetPlane?: boolean;
  onToggleTargetPlane?: () => void;
}

export const SelectedPanelContent: React.FC<SelectedPanelContentProps> = ({
  activeTab,
  character,
  gazeData,
  onUpdateCharacter,
  onResetPose,
  referenceConfig,
  onUpdateReferenceConfig,
  showTargetPlane = true,
  onToggleTargetPlane,
}) => {
  const [syncEyes, setSyncEyes] = useState(true);
  const selectedJoint = character.bodyData.skeleton.getJoint(character.selectedJointId);
  const props = character.proportions;

  const handleJointAngleChange = (axis: 'pitch' | 'yaw' | 'roll', val: number) => {
    if (!selectedJoint) return;
    const current = selectedJoint.rotationAngles;
    const newPitch = axis === 'pitch' ? val : current.pitchDeg;
    const newYaw = axis === 'yaw' ? val : current.yawDeg;
    const newRoll = axis === 'roll' ? val : current.rollDeg;
    character.setJointRotation(character.selectedJointId, newPitch, newYaw, newRoll);
    onUpdateCharacter();
  };

  const handleProportionChange = (key: keyof typeof props, val: number) => {
    character.updateProportions({ [key]: val });
    onUpdateCharacter();
  };

  const handleApplyPreset = (presetName: string) => {
    const preset = PROPORTION_PRESETS[presetName];
    if (preset) {
      character.updateProportions(preset);
      onUpdateCharacter();
    }
  };

  const handleEyeGazeChange = (eye: 'left' | 'right', axis: 'yaw' | 'pitch', val: number) => {
    if (eye === 'left') {
      character.leftEyeGaze[axis === 'yaw' ? 'yawDeg' : 'pitchDeg'] = val;
      if (syncEyes) {
        character.rightEyeGaze[axis === 'yaw' ? 'yawDeg' : 'pitchDeg'] = val;
      }
    } else {
      character.rightEyeGaze[axis === 'yaw' ? 'yawDeg' : 'pitchDeg'] = val;
      if (syncEyes) {
        character.leftEyeGaze[axis === 'yaw' ? 'yawDeg' : 'pitchDeg'] = val;
      }
    }
    character.updateKinematics();
    onUpdateCharacter();
  };

  const jointGroups = [
    {
      label: 'Spine & Head',
      joints: ['pelvis', 'waist', 'chest', 'neck', 'head'],
    },
    {
      label: 'Left Arm',
      joints: ['leftShoulder', 'leftElbow', 'leftWrist', 'leftHand'],
    },
    {
      label: 'Right Arm',
      joints: ['rightShoulder', 'rightElbow', 'rightWrist', 'rightHand'],
    },
    {
      label: 'Left Leg',
      joints: ['leftHip', 'leftKnee', 'leftAnkle', 'leftFoot'],
    },
    {
      label: 'Right Leg',
      joints: ['rightHip', 'rightKnee', 'rightAnkle', 'rightFoot'],
    },
  ];

  return (
    <div className="space-y-4 text-xs font-sans text-slate-200">
      {/* --- TAB 1: SKELETON / JOINTS --- */}
      {activeTab === 'joints' && (
        <div className="space-y-3">
          {/* Active Joint Articulation Controls */}
          {selectedJoint && (
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Bone className="w-3.5 h-3.5" /> {selectedJoint.name}
                </span>
                <button
                  onClick={() => {
                    selectedJoint.resetRotation();
                    character.updateKinematics();
                    onUpdateCharacter();
                  }}
                  className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>

              {/* Pitch */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">Pitch (Local X)</span>
                  <span className="font-mono text-sky-400 font-bold">{selectedJoint.rotationAngles.pitchDeg}°</span>
                </div>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  value={selectedJoint.rotationAngles.pitchDeg}
                  onChange={(e) => handleJointAngleChange('pitch', parseFloat(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Yaw */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">Yaw (Local Y)</span>
                  <span className="font-mono text-emerald-400 font-bold">{selectedJoint.rotationAngles.yawDeg}°</span>
                </div>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  value={selectedJoint.rotationAngles.yawDeg}
                  onChange={(e) => handleJointAngleChange('yaw', parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Roll */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">Roll (Local Z)</span>
                  <span className="font-mono text-amber-400 font-bold">{selectedJoint.rotationAngles.rollDeg}°</span>
                </div>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  value={selectedJoint.rotationAngles.rollDeg}
                  onChange={(e) => handleJointAngleChange('roll', parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Quick Joint Selector List */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Tap Joint to Articulate
            </span>
            <div className="space-y-2">
              {jointGroups.map((grp) => (
                <div key={grp.label}>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase mb-1">
                    {grp.label}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {grp.joints.map((jId) => {
                      const j = character.bodyData.skeleton.getJoint(jId);
                      if (!j) return null;
                      const isSelected = jId === character.selectedJointId;
                      return (
                        <button
                          key={jId}
                          onClick={() => {
                            character.selectedJointId = jId;
                            onUpdateCharacter();
                          }}
                          className={`px-2 py-1 rounded-lg text-[11px] transition-all ${
                            isSelected
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 font-semibold'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                          }`}
                        >
                          {j.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: PROPORTIONS --- */}
      {activeTab === 'proportions' && (
        <div className="space-y-3">
          {/* Archetypes */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Proportion Archetypes
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.keys(PROPORTION_PRESETS).map((pName) => (
                <button
                  key={pName}
                  onClick={() => handleApplyPreset(pName)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-800 transition-colors"
                >
                  {pName}
                </button>
              ))}
            </div>
          </div>

          {/* Total Height with Freeform Scaling & Presets */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-bold text-sky-400">Total Height (H)</span>
              <div className="flex items-center gap-1 font-mono">
                <input
                  type="number"
                  min="5"
                  max="5000"
                  step="1"
                  value={props.totalHeight}
                  onChange={(e) => {
                    const newH = parseFloat(e.target.value) || 180;
                    const scaled = BodyProportions.scale(props, newH);
                    character.updateProportions(scaled);
                    onUpdateCharacter();
                  }}
                  className="w-20 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-right text-sky-300 font-bold text-xs outline-none focus:border-sky-500"
                />
                <span className="text-slate-400">units</span>
              </div>
            </div>

            <input
              type="range"
              min="10"
              max="1000"
              step="5"
              value={Math.min(1000, props.totalHeight)}
              onChange={(e) => {
                const newH = parseFloat(e.target.value);
                const scaled = BodyProportions.scale(props, newH);
                character.updateProportions(scaled);
                onUpdateCharacter();
              }}
              className="w-full accent-sky-500 cursor-pointer"
            />

            {/* Scale Presets & Match Reference Image */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Scale:</span>
              <button
                onClick={() => {
                  const scaled = BodyProportions.scale(props, referenceConfig.worldHeight || 180);
                  character.updateProportions(scaled);
                  onUpdateCharacter();
                }}
                className="px-2 py-1 rounded bg-amber-950/70 border border-amber-700 text-amber-200 text-[10px] font-semibold hover:bg-amber-900 transition-colors"
                title="Scale character height to exactly match the reference photo's world height"
              >
                Match Ref ({referenceConfig.worldHeight}u)
              </button>
              {[
                { label: '45u (Mini)', h: 45 },
                { label: '90u (0.5x)', h: 90 },
                { label: '180u (1x)', h: 180 },
                { label: '360u (2x)', h: 360 },
                { label: '720u (4x)', h: 720 },
              ].map(({ label, h }) => (
                <button
                  key={h}
                  onClick={() => {
                    const scaled = BodyProportions.scale(props, h);
                    character.updateProportions(scaled);
                    onUpdateCharacter();
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                    Math.round(props.totalHeight) === h
                      ? 'bg-sky-950 text-sky-300 border-sky-700'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders Grid */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
            {[
              { label: 'Head Height', key: 'headHeight', min: 18, max: 28 },
              { label: 'Head Width', key: 'headWidth', min: 12, max: 20 },
              { label: 'Shoulder Width', key: 'shoulderWidth', min: 32, max: 56 },
              { label: 'Chest Width', key: 'chestWidth', min: 24, max: 42 },
              { label: 'Chest Depth', key: 'chestDepth', min: 14, max: 28 },
              { label: 'Waist Width', key: 'waistWidth', min: 18, max: 36 },
              { label: 'Pelvis Width', key: 'pelvisWidth', min: 22, max: 40 },
              { label: 'Upper Arm Length', key: 'armLength', min: 22, max: 40 },
              { label: 'Forearm Length', key: 'forearmLength', min: 20, max: 35 },
              { label: 'Hand Length', key: 'handLength', min: 12, max: 24 },
              { label: 'Thigh Length', key: 'thighLength', min: 32, max: 55 },
              { label: 'Lower Leg Length', key: 'lowerLegLength', min: 32, max: 55 },
              { label: 'Foot Length', key: 'footLength', min: 18, max: 32 },
            ].map(({ label, key, min, max }) => (
              <div key={key}>
                <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                  <span>{label}</span>
                  <span className="font-mono text-slate-200">
                    {(props[key as keyof typeof props] as number).toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step="0.5"
                  value={props[key as keyof typeof props] as number}
                  onChange={(e) =>
                    handleProportionChange(key as keyof typeof props, parseFloat(e.target.value))
                  }
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 3: DUAL-EYE GAZE --- */}
      {activeTab === 'gaze' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2.5 bg-slate-950/80 rounded-xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-300">Conjugate Gaze Sync</span>
            <button
              onClick={() => setSyncEyes(!syncEyes)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 ${
                syncEyes
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {syncEyes ? <Link className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
              <span>{syncEyes ? 'Synchronized' : 'Independent'}</span>
            </button>
          </div>

          {/* Left Eye */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex justify-between text-[11px]">
              <span className="font-bold text-emerald-400">Left Eye (OD)</span>
              <span className="font-mono text-slate-300">
                Yaw: {character.leftEyeGaze.yawDeg}°, Pitch: {character.leftEyeGaze.pitchDeg}°
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Horizontal Yaw</span>
              <input
                type="range"
                min="-45"
                max="45"
                value={character.leftEyeGaze.yawDeg}
                onChange={(e) => handleEyeGazeChange('left', 'yaw', parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Vertical Pitch</span>
              <input
                type="range"
                min="-35"
                max="35"
                value={character.leftEyeGaze.pitchDeg}
                onChange={(e) => handleEyeGazeChange('left', 'pitch', parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Right Eye (if independent) */}
          {!syncEyes && (
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex justify-between text-[11px]">
                <span className="font-bold text-cyan-400">Right Eye (OS)</span>
                <span className="font-mono text-slate-300">
                  Yaw: {character.rightEyeGaze.yawDeg}°, Pitch: {character.rightEyeGaze.pitchDeg}°
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Horizontal Yaw</span>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  value={character.rightEyeGaze.yawDeg}
                  onChange={(e) => handleEyeGazeChange('right', 'yaw', parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Vertical Pitch</span>
                <input
                  type="range"
                  min="-35"
                  max="35"
                  value={character.rightEyeGaze.pitchDeg}
                  onChange={(e) => handleEyeGazeChange('right', 'pitch', parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Exact Pixel Coordinates & World Readout */}
          {gazeData && (
            <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 font-mono text-[10px] space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-[10px] font-sans uppercase font-bold text-sky-400">
                  Target Area &amp; Exact Ray Pixels
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-bold">
                  {referenceConfig.widthPx} × {referenceConfig.heightPx} px
                </span>
              </div>

              {/* Exact Ray Hit Pixels */}
              {gazeData.leftPixelHit && (
                <div className="space-y-1 bg-slate-900/60 p-2 rounded border border-slate-800/60">
                  <div className="flex justify-between items-center text-emerald-400">
                    <span className="font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Left Eye Ray (OD):
                    </span>
                    <span className="font-bold text-slate-100 text-[11px]">
                      X: {gazeData.leftPixelHit.pixelX} px, Y: {gazeData.leftPixelHit.pixelY} px
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>Target Bound:</span>
                    <span className={gazeData.leftPixelHit.isInsideTarget ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {gazeData.leftPixelHit.isInsideTarget ? 'ON TARGET (INSIDE)' : 'OFF TARGET'}
                    </span>
                  </div>
                </div>
              )}

              {gazeData.rightPixelHit && (
                <div className="space-y-1 bg-slate-900/60 p-2 rounded border border-slate-800/60">
                  <div className="flex justify-between items-center text-cyan-400">
                    <span className="font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block" /> Right Eye Ray (OS):
                    </span>
                    <span className="font-bold text-slate-100 text-[11px]">
                      X: {gazeData.rightPixelHit.pixelX} px, Y: {gazeData.rightPixelHit.pixelY} px
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>Target Bound:</span>
                    <span className={gazeData.rightPixelHit.isInsideTarget ? 'text-cyan-400 font-bold' : 'text-amber-400 font-bold'}>
                      {gazeData.rightPixelHit.isInsideTarget ? 'ON TARGET (INSIDE)' : 'OFF TARGET'}
                    </span>
                  </div>
                </div>
              )}

              {/* Pixel Disparity / Vergence Offset */}
              {gazeData.leftPixelHit && gazeData.rightPixelHit && (
                <div className="flex justify-between pt-1 border-t border-slate-800 text-[10px] text-slate-300">
                  <span className="text-slate-400 font-sans">Dual Ray Disparity:</span>
                  <span className="text-amber-300 font-bold">
                    ΔX: {Math.abs(gazeData.leftPixelHit.pixelX - gazeData.rightPixelHit.pixelX)} px, ΔY: {Math.abs(gazeData.leftPixelHit.pixelY - gazeData.rightPixelHit.pixelY)} px
                  </span>
                </div>
              )}

              {/* World Vectors */}
              <div className="pt-1.5 border-t border-slate-800/80 text-[9px] text-slate-500 space-y-0.5">
                <div className="flex justify-between">
                  <span>Left World Vector:</span>
                  <span>({gazeData.leftGazeDirectionWorld.x.toFixed(3)}, {gazeData.leftGazeDirectionWorld.y.toFixed(3)}, {gazeData.leftGazeDirectionWorld.z.toFixed(3)})</span>
                </div>
                <div className="flex justify-between">
                  <span>Right World Vector:</span>
                  <span>({gazeData.rightGazeDirectionWorld.x.toFixed(3)}, {gazeData.rightGazeDirectionWorld.y.toFixed(3)}, {gazeData.rightGazeDirectionWorld.z.toFixed(3)})</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 4: POSES & ACTOR PLACEMENT --- */}
      {activeTab === 'poses' && (
        <div className="space-y-3">
          {/* Pose Presets */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Pose Presets
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                'Relaxed / A-Pose',
                'T-Pose',
                'Natural Stride',
                'Look Right / Head Turn',
                'Thinking / Pensive',
              ].map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    character.applyPose(p);
                    onUpdateCharacter();
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors text-left ${
                    character.activePosePreset === p
                      ? 'bg-sky-950 text-sky-300 border border-sky-800 font-semibold'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Actor Ground Placement */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Placement on Ground Plane
            </span>
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                <span>Position X</span>
                <span className="font-mono text-slate-200">{character.position.x.toFixed(0)}</span>
              </div>
              <input
                type="range"
                min="-70"
                max="70"
                step="2"
                value={character.position.x}
                onChange={(e) => {
                  character.position = character.position.add(
                    new (character.position.constructor as any)(
                      parseFloat(e.target.value) - character.position.x,
                      0,
                      0
                    )
                  );
                  character.updateKinematics();
                  onUpdateCharacter();
                }}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                <span>Position Z</span>
                <span className="font-mono text-slate-200">{character.position.z.toFixed(0)}</span>
              </div>
              <input
                type="range"
                min="-70"
                max="70"
                step="2"
                value={character.position.z}
                onChange={(e) => {
                  character.position = character.position.add(
                    new (character.position.constructor as any)(
                      0,
                      0,
                      parseFloat(e.target.value) - character.position.z
                    )
                  );
                  character.updateKinematics();
                  onUpdateCharacter();
                }}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                <span>Actor Yaw Orientation</span>
                <span className="font-mono text-slate-200">{character.rotationDeg.toFixed(0)}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="5"
                value={character.rotationDeg}
                onChange={(e) => {
                  character.rotationDeg = parseFloat(e.target.value);
                  character.updateKinematics();
                  onUpdateCharacter();
                }}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Color Tint */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Actor Material Tint
            </span>
            <div className="flex items-center gap-2">
              {['#38bdf8', '#34d399', '#fbbf24', '#c084fc', '#fb7185', '#94a3b8'].map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    character.bodyColor = c;
                    onUpdateCharacter();
                  }}
                  className={`w-7 h-7 rounded-full border transition-transform ${
                    character.bodyColor === c ? 'scale-110 ring-2 ring-white' : 'border-slate-700'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 5: REFERENCE PHOTOGRAPHY & SIZING (PX) --- */}
      {activeTab === 'reference' && (
        <ReferenceImagePanel
          config={referenceConfig}
          onUpdateConfig={onUpdateReferenceConfig}
          showTargetPlane={showTargetPlane}
          onToggleTargetPlane={onToggleTargetPlane}
        />
      )}
    </div>
  );
};
