"use client";
import React, { useState } from "react";
import { User, Users, ShieldAlert, BadgeInfo, Save, Edit3, X, UserCheck, Heart, Activity, UserMinus, Plus } from "lucide-react";

export default function OccupantsRegistry({ sensing }) {
  const occupants = sensing.occupants || [];
  const entities = sensing.analysis?.entities || [];
  const [editingOccupant, setEditingOccupant] = useState(null);
  
  // Local edit states
  const [editName, setEditName] = useState("");
  const [editRelationship, setEditRelationship] = useState("Visitor");
  const [editContactInfo, setEditContactInfo] = useState("");
  const [editGender, setEditGender] = useState("Unspecified");
  const [editHealthStatus, setEditHealthStatus] = useState("Normal Vitals");
  const [editAge, setEditAge] = useState(30);
  const [editTargetBpm, setEditTargetBpm] = useState(72);
  const [editNotes, setEditNotes] = useState("");

  const handleEditClick = (occ) => {
    setEditingOccupant(occ);
    setEditName(occ.name || "");
    setEditRelationship(occ.relationship || "Visitor");
    setEditContactInfo(occ.contactInfo || "");
    setEditGender(occ.gender || "Unspecified");
    setEditHealthStatus(occ.healthStatus || "Normal Vitals");
    setEditAge(occ.age || 30);
    setEditTargetBpm(occ.targetBpm || 72);
    setEditNotes(occ.notes || "");
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!editingOccupant) return;
    
    sensing.updateOccupantDetails(
      editingOccupant.id,
      editName,
      editRelationship,
      editContactInfo,
      editGender,
      editHealthStatus,
      editAge,
      editTargetBpm,
      editNotes
    );
    setEditingOccupant(null);
  };

  // Helper to check if the occupant is currently detected in spatial radar
  const getDetectionStatus = (occ) => {
    // Check if any active entity matches by name/id
    const active = entities.find(
      (ent) => ent.id === occ.id || ent.name?.toLowerCase() === occ.name?.toLowerCase()
    );
    return active ? { online: true, details: active } : { online: false, details: null };
  };

  // Harmonized styling for relationship categories
  const getRelationshipBadge = (rel) => {
    switch (rel) {
      case "Family":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "Relative":
        return "bg-indigo-500/10 border-indigo-500/30 text-indigo-400";
      case "Friend":
        return "bg-purple-500/10 border-purple-500/30 text-purple-400";
      case "Visitor":
      default:
        return "bg-amber-500/10 border-amber-500/30 text-amber-400";
    }
  };

  return (
    <div className="glass p-5 rounded-2xl flex-1 flex flex-col gap-6 bg-white/[0.01]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[var(--border-glass)] pb-3">
        <div>
          <h3 className="text-base font-semibold">Home Surveillance & Health Registry</h3>
          <p className="text-[10px] text-[var(--text-muted)] font-mono">
            Manage systematic occupant profiles, health parameters, heart rate baselines, and contact details
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-mono text-[var(--text-secondary)] glass px-3 py-1.5 rounded-full border border-[var(--border-glass)]">
            Total Registry: {occupants.length} profiles
          </div>
        </div>
      </div>

      {/* Database Analytics summary dashboard cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass p-4 rounded-xl bg-black/20">
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-mono">Active Surveillance</span>
          <span className="text-2xl font-bold font-mono text-cyan-400 mt-1 block">
            {occupants.filter(occ => getDetectionStatus(occ).online).length}
          </span>
          <span className="text-[9px] text-[var(--text-muted)] mt-0.5 block font-mono">Identified by Doppler Biometrics</span>
        </div>
        <div className="glass p-4 rounded-xl bg-black/20">
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-mono">Family & Relatives</span>
          <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
            {occupants.filter(occ => occ.relationship === "Family" || occ.relationship === "Relative").length}
          </span>
          <span className="text-[9px] text-[var(--text-muted)] mt-0.5 block font-mono">Surveillance Whitelisted Profiles</span>
        </div>
        <div className="glass p-4 rounded-xl bg-black/20">
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-mono">Monitored Alerts</span>
          <span className="text-2xl font-bold font-mono text-rose-400 mt-1 block">
            {occupants.filter(occ => occ.healthStatus?.toLowerCase().includes("heart") || occ.healthStatus?.toLowerCase().includes("monitor")).length}
          </span>
          <span className="text-[9px] text-[var(--text-muted)] mt-0.5 block font-mono">Profiles Requiring Vitals Care</span>
        </div>
      </div>

      {/* Grid of registered profiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {occupants.map((occ) => {
          const { online, details } = getDetectionStatus(occ);
          return (
            <div 
              key={occ.id} 
              className={`glass p-4 rounded-xl flex flex-col justify-between border transition-all duration-300 bg-black/20 ${
                online 
                  ? "border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.06)]" 
                  : "border-[var(--border-glass)]"
              }`}
            >
              <div>
                {/* Header status bar */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${online ? "bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" : "bg-gray-600"}`} />
                    <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase">
                      {online ? "Surveilling Now" : "Away"}
                    </span>
                  </div>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${getRelationshipBadge(occ.relationship)}`}>
                    {occ.relationship}
                  </span>
                </div>

                {/* Occupant Name */}
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
                    <User size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-200">{occ.name}</h4>
                    <p className="text-[9px] font-mono text-[var(--text-muted)]">ID: {occ.id.toUpperCase()}</p>
                  </div>
                </div>

                {/* Details list */}
                <div className="mt-4 flex flex-col gap-1.5 text-xs">
                  {occ.contactInfo && (
                    <div className="flex justify-between font-mono">
                      <span className="text-[9px] text-[var(--text-muted)]">CONTACT:</span>
                      <span className="text-gray-300 text-[10px]">{occ.contactInfo}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-mono">
                    <span className="text-[9px] text-[var(--text-muted)]">AGE / SURVEILLANCE:</span>
                    <span className="text-gray-300 text-[10px]">{occ.age} yrs • {occ.gender} • <span className="text-cyan-400 font-semibold">{occ.healthStatus || "Normal Vitals"}</span></span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-[9px] text-[var(--text-muted)]">TARGET HEART RATE:</span>
                    <span className="text-gray-300 text-[10px] font-semibold">{occ.targetBpm || 72} BPM</span>
                  </div>
                  <div className="flex justify-between font-mono border-t border-white/5 pt-1.5 mt-1.5">
                    <span className="text-[9px] text-[var(--text-muted)]">LIVE VITALS:</span>
                    <span className="text-gray-300 text-[10px] font-mono">
                      {online && details?.vitals ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <Heart size={10} className="animate-pulse text-red-500" /> {details.vitals.heartRate} BPM / SpO2 {details.vitals.spo2}%
                        </span>
                      ) : (
                        "Monitoring Offline"
                      )}
                    </span>
                  </div>
                  {occ.notes && (
                    <div className="mt-2 p-2 bg-black/40 rounded border border-white/5 text-[9px] text-gray-400 italic">
                      &quot;{occ.notes}&quot;
                    </div>
                  )}
                </div>
              </div>

              {/* Edit Details Action Button */}
              <button 
                onClick={() => handleEditClick(occ)}
                className="mt-5 w-full py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Edit3 size={12} /> Edit Surveillance Profile
              </button>
            </div>
          );
        })}

        {/* Informational Whitelisting Prompt & Add Button */}
        <div 
          onClick={() => {
            setEditingOccupant({ id: `target-${Date.now()}`, isNew: true });
            setEditName("");
            setEditRelationship("Visitor");
            setEditContactInfo("");
            setEditGender("Unspecified");
            setEditHealthStatus("Normal Vitals");
            setEditAge(30);
            setEditTargetBpm(72);
            setEditNotes("");
          }}
          className="glass p-5 rounded-xl border border-dashed border-white/20 hover:border-cyan-500/50 hover:bg-cyan-500/5 cursor-pointer flex flex-col justify-center items-center text-center transition-all min-h-[220px]"
        >
          <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mb-3">
            <Plus size={24} className="text-cyan-400" />
          </div>
          <h4 className="text-xs font-bold text-gray-300">Add New Surveillance Target</h4>
          <p className="text-[10px] text-[var(--text-muted)] mt-1.5 max-w-[200px] leading-relaxed">
            Manually register a new occupant profile for Doppler biometric tracking and vitals surveillance.
          </p>
        </div>
      </div>

      {/* Editor slide-over modal */}
      {editingOccupant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="glass w-full max-w-md p-6 rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl relative">
            <button 
              onClick={() => setEditingOccupant(null)}
              className="absolute top-4 right-4 p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
              <UserCheck size={18} className="text-cyan-400" />
              <h3 className="text-sm font-bold text-gray-200 font-mono">
                {editingOccupant.isNew ? "New Surveillance Profile" : `Surveillance Profile Editor: ${editingOccupant.id.toUpperCase()}`}
              </h3>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {/* Profile details */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  Identity Systematic Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-black/40 border border-white/10 px-3 py-2 rounded-lg text-xs text-gray-200 focus:outline-none focus:border-cyan-500/50 font-mono w-full"
                  placeholder="e.g. User 123 (Sachin)"
                />
              </div>

              {/* Relationship dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  Surveillance Group Classification
                </label>
                <select
                  value={editRelationship}
                  onChange={(e) => setEditRelationship(e.target.value)}
                  className="bg-black/60 border border-white/10 px-3 py-2 rounded-lg text-xs text-cyan-400 focus:outline-none font-mono cursor-pointer w-full"
                >
                  <option value="Family">Family Member</option>
                  <option value="Relative">Relative</option>
                  <option value="Friend">Friend / Regular Visitor</option>
                  <option value="Visitor">Temporary Visitor / Alert Required</option>
                </select>
              </div>

              {/* Contact Info */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  Access & Contact Details
                </label>
                <input
                  type="text"
                  value={editContactInfo}
                  onChange={(e) => setEditContactInfo(e.target.value)}
                  className="bg-black/40 border border-white/10 px-3 py-2 rounded-lg text-xs text-gray-200 focus:outline-none focus:border-cyan-500/50 font-mono w-full"
                  placeholder="e.g. +1 (555) 0199"
                />
              </div>

              {/* Gender selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  Surveillance Target Gender
                </label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  className="bg-black/60 border border-white/10 px-3 py-2 rounded-lg text-xs text-cyan-400 focus:outline-none font-mono cursor-pointer w-full"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Unspecified">Unspecified / Unknown</option>
                </select>
              </div>

              {/* Vitals & Health status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    Health status
                  </label>
                  <input
                    type="text"
                    value={editHealthStatus}
                    onChange={(e) => setEditHealthStatus(e.target.value)}
                    className="bg-black/40 border border-white/10 px-3 py-2 rounded-lg text-xs text-gray-200 focus:outline-none focus:border-cyan-500/50 font-mono w-full"
                    placeholder="e.g. Normal Vitals"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    Age
                  </label>
                  <input
                    type="number"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    className="bg-black/40 border border-white/10 px-3 py-2 rounded-lg text-xs text-gray-200 focus:outline-none focus:border-cyan-500/50 font-mono w-full"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  Target Heart Rate Baseline (BPM)
                </label>
                <input
                  type="number"
                  value={editTargetBpm}
                  onChange={(e) => setEditTargetBpm(e.target.value)}
                  className="bg-black/40 border border-white/10 px-3 py-2 rounded-lg text-xs text-cyan-400 focus:outline-none focus:border-cyan-500/50 font-mono w-full"
                />
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  Occupant notes / Biometric calibration
                </label>
                <textarea
                  value={editNotes}
                  rows={3}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="bg-black/40 border border-white/10 px-3 py-2 rounded-lg text-xs text-gray-200 focus:outline-none focus:border-cyan-500/50 font-mono w-full resize-none"
                  placeholder="Notes about biometric calibration, routine, or access rights..."
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2.5 mt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingOccupant(null)}
                  className="px-4 py-2 border border-white/5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Save size={13} /> Save Surveillance Calibration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
