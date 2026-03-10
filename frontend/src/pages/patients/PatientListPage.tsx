import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Plus, Search, Users, Loader2, Eye, Trash2,
  ClipboardCheck, Camera, Fingerprint, CreditCard, Wifi, X,
} from "lucide-react";
import { patientService } from "@/services/patient.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import PatientAvatar from "@/components/patients/PatientAvatar";
import PatientPhotoUpload from "@/components/patients/PatientPhotoUpload";

export default function PatientListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [photoPatient, setPhotoPatient] = useState<any>(null);
  const [deletePatient, setDeletePatient] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [rfidPatient, setRfidPatient] = useState<any>(null);
  const [rfidValue, setRfidValue] = useState("");
  const [rfidSaving, setRfidSaving] = useState(false);
  const [biometricPatient, setBiometricPatient] = useState<any>(null);
  const [biometricCapturing, setBiometricCapturing] = useState(false);

  // RFID check-in listener
  const [rfidCheckIn, setRfidCheckIn] = useState(false);
  const [rfidScanValue, setRfidScanValue] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["patients", searchQuery],
    queryFn: () => patientService.search({ q: searchQuery, limit: 50 }),
  });

  const patients = data?.data || [];

  const handleDelete = async () => {
    if (!deletePatient) return;
    setDeleting(true);
    try {
      await patientService.delete(deletePatient.id);
      toast({ title: "Deleted", description: `${deletePatient.firstName} ${deletePatient.lastName} deleted` });
      setDeletePatient(null);
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.error || error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleCheckIn = (patient: any) => {
    navigate(`/opd?patientId=${patient.id}&patientName=${encodeURIComponent(`${patient.firstName} ${patient.lastName}`)}&autoCheckIn=true`);
  };

  const handleRfidRegister = async () => {
    if (!rfidPatient || !rfidValue.trim()) return;
    setRfidSaving(true);
    try {
      await patientService.registerRfidCard(rfidPatient.id, rfidValue.trim());
      toast({ title: "RFID Registered", description: `Card ${rfidValue} linked to ${rfidPatient.firstName} ${rfidPatient.lastName}` });
      setRfidPatient(null);
      setRfidValue("");
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.error || error.message, variant: "destructive" });
    } finally {
      setRfidSaving(false);
    }
  };

  const handleBiometricEnroll = async () => {
    if (!biometricPatient) return;
    setBiometricCapturing(true);
    try {
      // Simulate fingerprint capture — in production this calls a native SDK / WebUSB device
      const simulatedTemplate = `FP-${biometricPatient.id}-${Date.now()}`;
      await patientService.registerFingerprint(biometricPatient.id, simulatedTemplate);
      toast({ title: "Fingerprint Registered", description: `Biometric enrolled for ${biometricPatient.firstName} ${biometricPatient.lastName}` });
      setBiometricPatient(null);
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.error || error.message, variant: "destructive" });
    } finally {
      setBiometricCapturing(false);
    }
  };

  const handleRfidCheckIn = async () => {
    if (!rfidScanValue.trim()) return;
    try {
      const res = await patientService.lookupByRfid(rfidScanValue.trim());
      const p = res.data;
      if (p) {
        toast({ title: "Patient Found", description: `${p.firstName} ${p.lastName} (${p.mrn})` });
        setRfidCheckIn(false);
        setRfidScanValue("");
        navigate(`/opd?patientId=${p.id}&patientName=${encodeURIComponent(`${p.firstName} ${p.lastName}`)}&autoCheckIn=true`);
      }
    } catch (error: any) {
      toast({ title: "Not Found", description: "No patient found with this RFID card", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" /> Patients
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage patient records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRfidCheckIn(true)}>
            <Wifi className="w-4 h-4 mr-2" /> RFID Check-in
          </Button>
          <Button onClick={() => navigate("/patients/new")}>
            <Plus className="w-4 h-4 mr-2" /> New Patient
          </Button>
        </div>
      </div>

      {/* Search & Table Card */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              placeholder="Search by name, MRN, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No patients found</h3>
            <p className="text-sm text-gray-500">Get started by registering a new patient</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">MRN</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Gender</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">NHIS</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map((patient: any, index: number) => (
                  <motion.tr
                    key={patient.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    {/* Patient with photo */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setPhotoPatient(patient)} title="Click to upload photo">
                          <PatientAvatar
                            photoUrl={patient.photoUrl}
                            firstName={patient.firstName}
                            lastName={patient.lastName}
                            size="sm"
                          />
                        </button>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{patient.firstName} {patient.lastName}</p>
                          {patient.dateOfBirth && (
                            <p className="text-xs text-gray-400">
                              {new Date(patient.dateOfBirth).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-blue-600">{patient.mrn}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{patient.phonePrimary || patient.phone}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={patient.gender === "MALE" ? "border-blue-200 text-blue-700 bg-blue-50" : "border-pink-200 text-pink-700 bg-pink-50"}>
                        {patient.gender}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={patient.nhisInfo ? "default" : "secondary"} className={patient.nhisInfo ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                        {patient.nhisInfo ? "Active" : "None"}
                      </Badge>
                    </td>
                    {/* Biometric / RFID badges */}
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {patient.fingerprintEnrolledAt && (
                          <span title="Biometric enrolled" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600">
                            <Fingerprint className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {patient.rfidCardNumber && (
                          <span title={`RFID: ${patient.rfidCardNumber}`} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600">
                            <CreditCard className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {!patient.fingerprintEnrolledAt && !patient.rfidCardNumber && (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>
                    </td>
                    {/* Action buttons */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" title="Check-in" onClick={() => handleCheckIn(patient)}>
                          <ClipboardCheck className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="View / Edit" onClick={() => navigate(`/patients/${patient.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50" title="Upload photo" onClick={() => setPhotoPatient(patient)}>
                          <Camera className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50" title="Register fingerprint" onClick={() => setBiometricPatient(patient)}>
                          <Fingerprint className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" title="Register RFID card" onClick={() => { setRfidPatient(patient); setRfidValue(patient.rfidCardNumber || ""); }}>
                          <CreditCard className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" title="Delete" onClick={() => setDeletePatient(patient)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Photo Upload Modal ── */}
      {photoPatient && (
        <PatientPhotoUpload
          patientId={photoPatient.id}
          currentPhotoUrl={photoPatient.photoUrl}
          onClose={() => setPhotoPatient(null)}
          onUploaded={() => {
            setPhotoPatient(null);
            queryClient.invalidateQueries({ queryKey: ["patients"] });
          }}
        />
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deletePatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeletePatient(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Patient?</h3>
            <p className="text-sm text-gray-600 mb-1">
              Are you sure you want to delete <strong>{deletePatient.firstName} {deletePatient.lastName}</strong> ({deletePatient.mrn})?
            </p>
            <p className="text-xs text-red-500 mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeletePatient(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── RFID Registration Modal ── */}
      {rfidPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setRfidPatient(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" /> Register RFID Card
              </h3>
              <button onClick={() => setRfidPatient(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Assign an RFID card to <strong>{rfidPatient.firstName} {rfidPatient.lastName}</strong>
            </p>
            <div className="mb-4">
              <label className="text-sm font-medium block mb-1">RFID Card Number</label>
              <Input
                value={rfidValue}
                onChange={e => setRfidValue(e.target.value)}
                placeholder="Scan or enter RFID card number..."
                autoFocus
                onKeyDown={e => e.key === "Enter" && handleRfidRegister()}
              />
              <p className="text-xs text-gray-400 mt-1">Place the card on the reader or type the number manually</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRfidPatient(null)}>Cancel</Button>
              <Button onClick={handleRfidRegister} disabled={rfidSaving || !rfidValue.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                {rfidSaving ? "Saving..." : "Register Card"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Biometric Registration Modal ── */}
      {biometricPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setBiometricPatient(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-amber-600" /> Register Fingerprint
              </h3>
              <button onClick={() => setBiometricPatient(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Enroll fingerprint for <strong>{biometricPatient.firstName} {biometricPatient.lastName}</strong>
            </p>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center ${biometricCapturing ? 'border-amber-400 animate-pulse bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                <Fingerprint className={`w-12 h-12 ${biometricCapturing ? 'text-amber-500' : 'text-gray-300'}`} />
              </div>
              <p className="text-sm text-gray-500 text-center">
                {biometricCapturing
                  ? "Capturing fingerprint... Please place finger on the reader."
                  : "Click the button below to start fingerprint capture. Ensure the biometric reader is connected."}
              </p>
              {biometricPatient.fingerprintEnrolledAt && (
                <Badge className="bg-green-100 text-green-700">Already enrolled — will re-enroll</Badge>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setBiometricPatient(null)}>Cancel</Button>
              <Button onClick={handleBiometricEnroll} disabled={biometricCapturing} className="bg-amber-600 hover:bg-amber-700">
                {biometricCapturing ? "Capturing..." : "Start Capture"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── RFID Check-in Modal ── */}
      {rfidCheckIn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setRfidCheckIn(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Wifi className="w-5 h-5 text-blue-600" /> RFID Check-in
              </h3>
              <button onClick={() => { setRfidCheckIn(false); setRfidScanValue(""); }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-20 h-20 rounded-full border-4 border-blue-200 bg-blue-50 flex items-center justify-center animate-pulse">
                <CreditCard className="w-10 h-10 text-blue-400" />
              </div>
              <p className="text-sm text-gray-500 text-center">Scan the patient's RFID card on the reader or type the card number below</p>
            </div>
            <div className="mb-4">
              <Input
                value={rfidScanValue}
                onChange={e => setRfidScanValue(e.target.value)}
                placeholder="RFID card number..."
                autoFocus
                onKeyDown={e => e.key === "Enter" && handleRfidCheckIn()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setRfidCheckIn(false); setRfidScanValue(""); }}>Cancel</Button>
              <Button onClick={handleRfidCheckIn} disabled={!rfidScanValue.trim()}>Look Up & Check-in</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
