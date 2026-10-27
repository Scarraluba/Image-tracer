/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CharacterModel, CharacterGazeData } from '../body/CharacterModel';
import {
  Compass,
  RotateCcw,
  Target,
  CheckCircle2,
  SlidersHorizontal,
  TrendingUp,
  Bone,
  Eye,
  Link,
  Unlink,
} from 'lucide-react';

interface GazeControlPanelProps {
  character: CharacterModel;
  gazeData?: CharacterGazeData;
  onUpdateCharacter: () => void;
  onResetPose: () => void;
}

export const GazeControlPanel: React.FC<GazeControlPanelProps> = ({
  character,
  gazeData,
  onUpdateCharacter,
  onResetPose,
}) => {
  const [syncEyes, setSyncEyes] = useState(true);
  const selectedJoint = character.bodyData.skeleton.getJoint(character.selectedJointId);

  const handleJointAngleChange = (axis: 'pitch' | 'yaw' | 'roll', val: number) => {
    if (!selectedJoint) return;
    const current = selectedJoint.rotationAngles;
    const newPitch = axis === 'pitch' ? val : current.pitchDeg;
    const newYaw = axis === 'yaw' ? val : current.yawDeg;
    const newRoll = axis === 'roll' ? val : current.rollDeg;
    character.setJointRotation(character.selectedJointId, newPitch, newYaw, newRoll);
    onUpdateCharacter();
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

  const posePresets = [
    'Relaxed / A-Pose',
    'T-Pose',
    'Natural Stride',
    'Look Right / Head Turn',
    'Thinking / Pensive',
  ];

  return (
    <aside className="w-88 h-full bg-slate-900/95 border-l border-slate-800 flex flex-col text-slate-200 select-none overflow-hidden">
      {/* Panel Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Articulation & Dual Gaze
          </span>
        </div>
        <button
          onClick={onResetPose}
          className="text-[11px] font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
          title="Reset All Joint Angles to Zero"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset All</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs font-sans">
        {/* 1. Selected Joint Forward Kinematics */}
        <section className="space-y-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Bone className="w-3.5 h-3.5 text-amber-400" /> Joint Articulation
            </span>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
              {selectedJoint?.name || 'Select Joint'}
            </span>
          </div>

          {selectedJoint && (
            <div className="space-y-2.5">
              {/* Pitch (X-Axis) */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-300">Pitch (Local X)</span>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      min="-120"
                      max="120"
                      value={selectedJoint.rotationAngles.pitchDeg}
                      onChange={(e) => handleJointAngleChange('pitch', parseFloat(e.target.value) || 0)}
                      className="w-14 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-right text-sky-400 text-xs outline-none"
                    />
                    <span className="text-slate-400">°</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  step="2"
                  value={selectedJoint.rotationAngles.pitchDeg}
                  onChange={(e) => handleJointAngleChange('pitch', parseFloat(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Yaw (Y-Axis) */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-300">Yaw (Local Y)</span>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      min="-120"
                      max="120"
                      value={selectedJoint.rotationAngles.yawDeg}
                      onChange={(e) => handleJointAngleChange('yaw', parseFloat(e.target.value) || 0)}
                      className="w-14 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-right text-emerald-400 text-xs outline-none"
                    />
                    <span className="text-slate-400">°</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  step="2"
                  value={selectedJoint.rotationAngles.yawDeg}
                  onChange={(e) => handleJointAngleChange('yaw', parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Roll (Z-Axis) */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-300">Roll (Local Z)</span>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      min="-120"
                      max="120"
                      value={selectedJoint.rotationAngles.rollDeg}
                      onChange={(e) => handleJointAngleChange('roll', parseFloat(e.target.value) || 0)}
                      className="w-14 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-right text-amber-400 text-xs outline-none"
                    />
                    <span className="text-slate-400">°</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  step="2"
                  value={selectedJoint.rotationAngles.rollDeg}
                  onChange={(e) => handleJointAngleChange('roll', parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Pose Presets */}
          <div className="pt-2 border-t border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">
              Pose Presets
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {posePresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    character.applyPose(preset);
                    onUpdateCharacter();
                  }}
                  className={`px-2 py-1.5 rounded transition-colors text-left ${
                    character.activePosePreset === preset
                      ? 'bg-sky-950 text-sky-300 border border-sky-800 font-semibold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Dual-Eye Gaze System (Section 16) */}
        <section className="space-y-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-cyan-400" /> Dual-Eye Gaze Controls
            </span>
            <button
              onClick={() => setSyncEyes(!syncEyes)}
              className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${
                syncEyes
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                  : 'bg-slate-800 text-slate-400'
              }`}
              title="Synchronize Left & Right eye rotations (Conjugate Gaze)"
            >
              {syncEyes ? <Link className="w-2.5 h-2.5" /> : <Unlink className="w-2.5 h-2.5" />}
              <span>{syncEyes ? 'Conjugate' : 'Independent'}</span>
            </button>
          </div>

          {/* Left Eye Gaze */}
          <div className="p-2 bg-slate-900/60 rounded border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Left Eye (OD)
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                Yaw: {character.leftEyeGaze.yawDeg.toFixed(0)}°, Pitch: {character.leftEyeGaze.pitchDeg.toFixed(0)}°
              </span>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Yaw (Horizontal)</span>
              </div>
              <input
                type="range"
                min="-45"
                max="45"
                step="1"
                value={character.leftEyeGaze.yawDeg}
                onChange={(e) => handleEyeGazeChange('left', 'yaw', parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Pitch (Vertical)</span>
              </div>
              <input
                type="range"
                min="-35"
                max="35"
                step="1"
                value={character.leftEyeGaze.pitchDeg}
                onChange={(e) => handleEyeGazeChange('left', 'pitch', parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Right Eye Gaze (if independent) */}
          {!syncEyes && (
            <div className="p-2 bg-slate-900/60 rounded border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-cyan-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" /> Right Eye (OS)
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  Yaw: {character.rightEyeGaze.yawDeg.toFixed(0)}°, Pitch: {character.rightEyeGaze.pitchDeg.toFixed(0)}°
                </span>
              </div>

              <div>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  step="1"
                  value={character.rightEyeGaze.yawDeg}
                  onChange={(e) => handleEyeGazeChange('right', 'yaw', parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <input
                  type="range"
                  min="-35"
                  max="35"
                  step="1"
                  value={character.rightEyeGaze.pitchDeg}
                  onChange={(e) => handleEyeGazeChange('right', 'pitch', parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Real-Time Gaze World Vectors Readout */}
          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800/80 font-mono text-[10px] space-y-1.5">
            <div className="text-[10px] uppercase font-sans tracking-wider text-slate-400 flex items-center justify-between">
              <span>World Gaze Vectors</span>
              <span className="text-emerald-400 bg-emerald-950 px-1 rounded border border-emerald-800">
                |d| = 1.0000
              </span>
            </div>

            {gazeData && (
              <>
                {gazeData.leftPixelHit && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Left Ray Pixel:</span>
                    <span>
                      X: {gazeData.leftPixelHit.pixelX} px, Y: {gazeData.leftPixelHit.pixelY} px
                    </span>
                  </div>
                )}
                {gazeData.rightPixelHit && (
                  <div className="flex justify-between text-cyan-400 font-bold">
                    <span>Right Ray Pixel:</span>
                    <span>
                      X: {gazeData.rightPixelHit.pixelX} px, Y: {gazeData.rightPixelHit.pixelY} px
                    </span>
                  </div>
                )}
                {gazeData.targetSpecs && (
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>Target Size:</span>
                    <span>{gazeData.targetSpecs.widthPx} × {gazeData.targetSpecs.heightPx} px</span>
                  </div>
                )}
                <div className="flex justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-800">
                  <span className="text-emerald-500">Left d:</span>
                  <span>
                    ({gazeData.leftGazeDirectionWorld.x.toFixed(3)}, {gazeData.leftGazeDirectionWorld.y.toFixed(3)}, {gazeData.leftGazeDirectionWorld.z.toFixed(3)})
                  </span>
                </div>
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span className="text-cyan-500">Right d:</span>
                  <span>
                    ({gazeData.rightGazeDirectionWorld.x.toFixed(3)}, {gazeData.rightGazeDirectionWorld.y.toFixed(3)}, {gazeData.rightGazeDirectionWorld.z.toFixed(3)})
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800 text-slate-400">
                  <span>Target Area Hit:</span>
                  <span className={gazeData.leftPixelHit?.isInsideTarget ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {gazeData.leftPixelHit?.isInsideTarget ? 'ON TARGET (CONFIRMED)' : 'OFF TARGET'}
                  </span>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
};
