/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CharacterModel } from '../body/CharacterModel';
import { PROPORTION_PRESETS, BodyProportions } from '../body/BodyProportions';
import {
  User,
  Sliders,
  ChevronDown,
  ChevronRight,
  Circle,
  Bone,
  Eye,
  Move,
  RotateCw,
  Palette,
  Sparkles,
} from 'lucide-react';

interface ModelHierarchyPanelProps {
  character: CharacterModel;
  onUpdateCharacter: () => void;
  onSelectJoint: (jointId: string) => void;
}

export const ModelHierarchyPanel: React.FC<ModelHierarchyPanelProps> = ({
  character,
  onUpdateCharacter,
  onSelectJoint,
}) => {
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'proportions' | 'transform'>('hierarchy');
  const props = character.proportions;

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

  // Skeletal Joint Groups for clean navigation
  const jointTree = [
    {
      group: 'Spine & Head',
      joints: [
        { id: 'pelvis', name: 'Pelvis (Root)' },
        { id: 'waist', name: 'Waist (Lower Spine)' },
        { id: 'chest', name: 'Chest (Mid Spine)' },
        { id: 'neck', name: 'Neck Base' },
        { id: 'head', name: 'Head & Skull' },
      ],
    },
    {
      group: 'Left Arm (Character Left)',
      joints: [
        { id: 'leftShoulder', name: 'Left Shoulder' },
        { id: 'leftElbow', name: 'Left Elbow' },
        { id: 'leftWrist', name: 'Left Wrist' },
        { id: 'leftHand', name: 'Left Hand' },
      ],
    },
    {
      group: 'Right Arm (Character Right)',
      joints: [
        { id: 'rightShoulder', name: 'Right Shoulder' },
        { id: 'rightElbow', name: 'Right Elbow' },
        { id: 'rightWrist', name: 'Right Wrist' },
        { id: 'rightHand', name: 'Right Hand' },
      ],
    },
    {
      group: 'Left Leg',
      joints: [
        { id: 'leftHip', name: 'Left Hip' },
        { id: 'leftKnee', name: 'Left Knee' },
        { id: 'leftAnkle', name: 'Left Ankle' },
        { id: 'leftFoot', name: 'Left Foot' },
      ],
    },
    {
      group: 'Right Leg',
      joints: [
        { id: 'rightHip', name: 'Right Hip' },
        { id: 'rightKnee', name: 'Right Knee' },
        { id: 'rightAnkle', name: 'Right Ankle' },
        { id: 'rightFoot', name: 'Right Foot' },
      ],
    },
    {
      group: 'Procedural Eyes',
      joints: [
        { id: 'leftEye', name: 'Left Eye (OD)' },
        { id: 'rightEye', name: 'Right Eye (OS)' },
      ],
    },
  ];

  return (
    <aside className="w-84 h-full bg-slate-900/95 border-r border-slate-800 flex flex-col text-slate-200 select-none overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 p-1">
        <button
          onClick={() => setActiveTab('hierarchy')}
          className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'hierarchy'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bone className="w-3.5 h-3.5" />
          <span>Joints</span>
        </button>
        <button
          onClick={() => setActiveTab('proportions')}
          className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'proportions'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Proportions</span>
        </button>
        <button
          onClick={() => setActiveTab('transform')}
          className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'transform'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Move className="w-3.5 h-3.5" />
          <span>Transform</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
        {/* TAB 1: SKELETAL JOINTS HIERARCHY */}
        {activeTab === 'hierarchy' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300 uppercase tracking-wider">
                Skeletal Joint Chain
              </span>
              <span className="font-mono text-sky-400">
                Selected: {character.selectedJointId}
              </span>
            </div>

            {jointTree.map((sec) => (
              <div key={sec.group} className="border border-slate-800 rounded-lg p-2 bg-slate-950/40 space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  {sec.group}
                </div>
                <div className="space-y-0.5">
                  {sec.joints.map((j) => {
                    const isSelected = j.id === character.selectedJointId;
                    return (
                      <button
                        key={j.id}
                        onClick={() => {
                          character.selectedJointId = j.id;
                          onSelectJoint(j.id);
                          onUpdateCharacter();
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Circle className={`w-2 h-2 ${isSelected ? 'fill-amber-400 text-amber-400' : 'text-sky-400'}`} />
                          <span>{j.name}</span>
                        </div>
                        {isSelected && <span className="text-[10px] font-mono text-amber-400 font-bold">ACTIVE</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: ANATOMICAL PROPORTIONS */}
        {activeTab === 'proportions' && (
          <div className="space-y-3">
            {/* Presets */}
            <div>
              <label className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
                Proportion Archetypes
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.keys(PROPORTION_PRESETS).map((name) => (
                  <button
                    key={name}
                    onClick={() => handleApplyPreset(name)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Height */}
            <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="font-semibold text-sky-300">Total Height (H)</span>
                <span className="font-mono text-slate-200">{props.totalHeight} units</span>
              </div>
              <input
                type="range"
                min="140"
                max="220"
                step="2"
                value={props.totalHeight}
                onChange={(e) => {
                  const newH = parseFloat(e.target.value);
                  const scaled = BodyProportions.scale(props, newH);
                  character.updateProportions(scaled);
                  onUpdateCharacter();
                }}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Sliders Grid */}
            <div className="space-y-2 font-sans">
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
                    <span className="font-mono text-slate-300">
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

        {/* TAB 3: CHARACTER WORLD TRANSFORM & COLOR */}
        {activeTab === 'transform' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-950/60 rounded border border-slate-800 space-y-3">
              <span className="text-[11px] font-semibold uppercase text-slate-400 block">
                Character Placement in World
              </span>

              {/* Position X */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Position X (Ground lateral)</span>
                  <span className="font-mono text-slate-200">{character.position.x.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="80"
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

              {/* Position Z */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Position Z (Depth)</span>
                  <span className="font-mono text-slate-200">{character.position.z.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="80"
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

              {/* Character Rotation Yaw */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Character Yaw Orientation</span>
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

            {/* Actor Skin/Mesh Color Swatches */}
            <div className="p-3 bg-slate-950/60 rounded border border-slate-800 space-y-2">
              <span className="text-[11px] font-semibold uppercase text-slate-400 block">
                Actor Surface Material
              </span>
              <div className="flex items-center gap-2">
                {[
                  { name: 'Cerulean', hex: '#38bdf8' },
                  { name: 'Emerald', hex: '#34d399' },
                  { name: 'Amber', hex: '#fbbf24' },
                  { name: 'Purple', hex: '#c084fc' },
                  { name: 'Rose', hex: '#fb7185' },
                  { name: 'Slate', hex: '#94a3b8' },
                ].map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => {
                      character.bodyColor = c.hex;
                      onUpdateCharacter();
                    }}
                    className={`w-6 h-6 rounded-full border transition-transform ${
                      character.bodyColor === c.hex ? 'scale-110 ring-2 ring-white' : 'border-slate-700'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
