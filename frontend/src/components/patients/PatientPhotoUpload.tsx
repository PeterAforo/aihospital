import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Camera, Upload, RotateCcw, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { patientService } from '@/services/patient.service';

interface PatientPhotoUploadProps {
  patientId: string;
  currentPhotoUrl?: string;
  onClose: () => void;
  onUploaded: () => void;
}

type Mode = 'select' | 'camera' | 'preview';

export default function PatientPhotoUpload({ patientId, currentPhotoUrl, onClose, onUploaded }: PatientPhotoUploadProps) {
  const [mode, setMode] = useState<Mode>('select');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return patientService.uploadPhoto(patientId, file);
    },
    onSuccess: () => {
      stopCamera();
      onUploaded();
    },
    onError: (error: any) => {
      console.error('Upload failed:', error);
    },
  });

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setMode('camera');
    } catch (error) {
      console.error('Camera access denied:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        stopCamera();
        setMode('preview');
      }
    }
  }, [stopCamera]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
        setMode('preview');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    let fileToUpload: File;

    if (selectedFile) {
      fileToUpload = selectedFile;
    } else if (capturedImage) {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      fileToUpload = new File([blob], `patient-${patientId}-${Date.now()}.jpg`, { type: 'image/jpeg' });
    } else {
      return;
    }

    uploadMutation.mutate(fileToUpload);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setSelectedFile(null);
    setMode('select');
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900">
            {mode === 'select' && 'Update Photo'}
            {mode === 'camera' && 'Take Photo'}
            {mode === 'preview' && 'Preview Photo'}
          </h3>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {mode === 'select' && (
            <div className="space-y-4">
              {/* Current photo preview */}
              <div className="flex justify-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center overflow-hidden">
                  {currentPhotoUrl ? (
                    <img src={currentPhotoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-12 h-12 text-white/70" />
                  )}
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={startCamera}
                >
                  <Camera className="w-8 h-8 text-blue-500" />
                  <span>Take Photo</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-green-500" />
                  <span>Upload File</span>
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {mode === 'camera' && (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Circular overlay guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-4 border-white/50 rounded-full" />
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { stopCamera(); setMode('select'); }}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={capturePhoto}>
                  <Camera className="w-4 h-4 mr-2" />
                  Capture
                </Button>
              </div>
            </div>
          )}

          {mode === 'preview' && capturedImage && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-blue-500">
                  <img src={capturedImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handleRetake}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retake
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Save Photo
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
