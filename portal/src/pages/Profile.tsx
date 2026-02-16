import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, Heart, Shield, Pill, AlertTriangle, Loader2 } from 'lucide-react';
import { portalService, PatientProfile } from '../services/portal.service';
import { format } from 'date-fns';

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ email: '', phoneSecondary: '', address: '', city: '', region: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    portalService.getProfile().then((p) => {
      setProfile(p);
      setEditData({ email: p?.email || '', phoneSecondary: p?.phoneSecondary || '', address: p?.address || '', city: p?.city || '', region: p?.region || '' });
    }).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await portalService.updateProfile(editData as any);
      setProfile((prev) => prev ? { ...prev, ...editData } : prev);
      setIsEditing(false);
    } catch { /* ignore */ }
    setIsSaving(false);
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-600" size={32} /></div>;
  if (!profile) return <div className="text-center py-12 text-gray-500">Failed to load profile</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <button onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={isSaving}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
          {isSaving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : isEditing ? 'Save Changes' : 'Edit Profile'}
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center gap-4 mb-6">
          {profile.photoUrl ? (
            <img src={profile.photoUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
              <User className="text-primary-600" size={28} />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-900">{profile.title} {profile.firstName} {profile.lastName}</h2>
            <p className="text-sm text-gray-500">MRN: {profile.mrn} &bull; {profile.gender} &bull; DOB: {format(new Date(profile.dateOfBirth), 'MMM dd, yyyy')}</p>
            {profile.bloodGroup && <span className="inline-block mt-1 px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs font-medium">Blood: {profile.bloodGroup}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Phone size={16} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Primary Phone</p>
              <p className="text-sm text-gray-800">{profile.phonePrimary}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail size={16} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Email</p>
              {isEditing ? (
                <input value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="text-sm border border-gray-300 rounded px-2 py-1 w-full" />
              ) : (
                <p className="text-sm text-gray-800">{profile.email || '—'}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 md:col-span-2">
            <MapPin size={16} className="text-gray-400" />
            <div className="flex-1">
              <p className="text-xs text-gray-400">Address</p>
              {isEditing ? (
                <input value={editData.address} onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  className="text-sm border border-gray-300 rounded px-2 py-1 w-full" />
              ) : (
                <p className="text-sm text-gray-800">{[profile.address, profile.city, profile.region].filter(Boolean).join(', ')}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Health Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-500" />
            <h3 className="font-medium text-gray-800 text-sm">Allergies</h3>
          </div>
          {profile.allergies.length === 0 ? (
            <p className="text-sm text-gray-400">No known allergies</p>
          ) : (
            <div className="space-y-1">
              {profile.allergies.map((a) => (
                <div key={a.id} className="text-sm">
                  <span className="font-medium text-gray-700">{a.allergen}</span>
                  <span className="text-xs text-gray-400 ml-1">({a.severity})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Heart size={16} className="text-primary-500" />
            <h3 className="font-medium text-gray-800 text-sm">Chronic Conditions</h3>
          </div>
          {profile.chronicConditions.length === 0 ? (
            <p className="text-sm text-gray-400">None recorded</p>
          ) : (
            <div className="space-y-1">
              {profile.chronicConditions.map((c) => (
                <p key={c.id} className="text-sm text-gray-700">{c.conditionName}</p>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Pill size={16} className="text-purple-500" />
            <h3 className="font-medium text-gray-800 text-sm">Current Medications</h3>
          </div>
          {profile.currentMedications.length === 0 ? (
            <p className="text-sm text-gray-400">None recorded</p>
          ) : (
            <div className="space-y-1">
              {profile.currentMedications.map((m) => (
                <div key={m.id} className="text-sm">
                  <span className="text-gray-700">{m.medicationName}</span>
                  {m.dosage && <span className="text-xs text-gray-400 ml-1">{m.dosage}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* NHIS Info */}
      {profile.nhisInfo && (
        <div className="bg-white rounded-xl p-5 shadow-sm mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-green-600" />
            <h3 className="font-medium text-gray-800 text-sm">NHIS Information</h3>
          </div>
          <p className="text-sm text-gray-700">NHIS #: {profile.nhisInfo.nhisNumber}</p>
          {profile.nhisInfo.expiryDate && <p className="text-xs text-gray-400">Expires: {format(new Date(profile.nhisInfo.expiryDate), 'MMM dd, yyyy')}</p>}
        </div>
      )}
    </div>
  );
};

export default Profile;
