import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import {
  Video, VideoOff, Mic, MicOff, Phone, Monitor,
  MessageSquare, Users, Clock, Maximize,
} from 'lucide-react';

interface CallState {
  isConnected: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  duration: number;
  participants: number;
}

export default function VideoCallPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [callState, setCallState] = useState<CallState>({
    isConnected: false,
    isMuted: false,
    isVideoOff: false,
    isScreenSharing: false,
    duration: 0,
    participants: 1,
  });
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; time: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [notes, setNotes] = useState('');
  const [roomUrl, setRoomUrl] = useState('');

  // Fetch session details
  const { data: sessionData } = useQuery({
    queryKey: ['teleconsult-session', sessionId],
    queryFn: () => api.get(`/telemedicine/sessions/${sessionId}`).then(r => r.data),
    enabled: !!sessionId,
  });

  const session = sessionData as any;

  // Create room mutation
  const createRoomMut = useMutation({
    mutationFn: () => api.post(`/telemedicine/sessions/${sessionId}/room`, {
      enableRecording: false,
      enableScreenShare: true,
    }).then(r => r.data),
    onSuccess: (data: any) => {
      if (data.roomUrl) {
        setRoomUrl(data.roomUrl);
        startLocalMedia();
      }
    },
  });

  // End session mutation
  const endSessionMut = useMutation({
    mutationFn: () => api.patch(`/telemedicine/sessions/${sessionId}/end`, {
      notes,
      duration: callState.duration,
    }).then(r => r.data),
    onSuccess: () => {
      stopCall();
      navigate('/telemedicine');
    },
  });

  // Start local media (camera + mic)
  const startLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: true,
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setCallState(prev => ({ ...prev, isConnected: true, participants: 1 }));

      // Start duration timer
      timerRef.current = setInterval(() => {
        setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
    } catch (err) {
      console.error('Failed to access media devices:', err);
    }
  }, []);

  // Toggle mute
  const toggleMute = () => {
    const video = localVideoRef.current;
    if (video?.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setCallState(prev => ({ ...prev, isMuted: !prev.isMuted }));
    }
  };

  // Toggle video
  const toggleVideo = () => {
    const video = localVideoRef.current;
    if (video?.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
      setCallState(prev => ({ ...prev, isVideoOff: !prev.isVideoOff }));
    }
  };

  // Stop call
  const stopCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const video = localVideoRef.current;
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      video.srcObject = null;
    }
    setCallState(prev => ({ ...prev, isConnected: false }));
  };

  // Send chat message
  const sendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, {
      sender: 'You',
      text: chatInput,
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    }]);
    setChatInput('');
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      const video = localVideoRef.current;
      if (video?.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const patientName = session ? `${session.patient?.firstName || ''} ${session.patient?.lastName || ''}`.trim() : 'Patient';
  // doctorName available for future use in UI
  void (session ? `Dr. ${session.doctor?.firstName || ''} ${session.doctor?.lastName || ''}`.trim() : 'Doctor');

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#111827' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', background: '#1f2937', borderBottom: '1px solid #374151' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: callState.isConnected ? '#22c55e' : '#ef4444' }} />
          <span style={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>
            {callState.isConnected ? 'Connected' : 'Waiting to connect'}
          </span>
          {callState.isConnected && (
            <span style={{ color: '#9ca3af', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock style={{ width: 14, height: 14 }} /> {formatDuration(callState.duration)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#9ca3af', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users style={{ width: 14, height: 14 }} /> {callState.participants} participant{callState.participants !== 1 ? 's' : ''}
          </span>
          <span style={{ color: 'white', fontSize: '0.8125rem' }}>{patientName}</span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Video Area */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!callState.isConnected ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <Video style={{ width: 36, height: 36, color: '#9ca3af' }} />
              </div>
              <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
                Teleconsultation with {patientName}
              </h2>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
                {session?.scheduledAt ? `Scheduled: ${new Date(session.scheduledAt).toLocaleString()}` : 'Ready to start'}
              </p>
              <button onClick={() => createRoomMut.mutate()} disabled={createRoomMut.isPending}
                style={{
                  padding: '0.75rem 2rem', background: '#22c55e', color: 'white', border: 'none',
                  borderRadius: 12, fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto',
                }}>
                <Video style={{ width: 20, height: 20 }} />
                {createRoomMut.isPending ? 'Starting...' : 'Start Video Call'}
              </button>
              {roomUrl && (
                <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '1rem' }}>
                  Room: {roomUrl}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Remote Video (full screen) */}
              <video ref={remoteVideoRef} autoPlay playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#1f2937' }} />

              {/* Waiting overlay when no remote participant */}
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#1f2937',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                    <span style={{ fontSize: '2rem', color: '#9ca3af' }}>{patientName.charAt(0)}</span>
                  </div>
                  <p style={{ color: 'white', fontSize: '1rem', fontWeight: 600 }}>{patientName}</p>
                  <p style={{ color: '#9ca3af', fontSize: '0.8125rem' }}>Waiting for patient to join...</p>
                </div>
              </div>

              {/* Local Video (picture-in-picture) */}
              <div style={{
                position: 'absolute', bottom: 100, right: 20, width: 200, height: 150,
                borderRadius: 12, overflow: 'hidden', border: '2px solid #374151', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}>
                <video ref={localVideoRef} autoPlay playsInline muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                {callState.isVideoOff && (
                  <div style={{ position: 'absolute', inset: 0, background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <VideoOff style={{ width: 24, height: 24, color: '#9ca3af' }} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div style={{ width: 320, background: '#1f2937', borderLeft: '1px solid #374151', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #374151' }}>
              <h3 style={{ color: 'white', fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>Chat</h3>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ color: '#60a5fa', fontSize: '0.75rem', fontWeight: 600 }}>{msg.sender}</span>
                    <span style={{ color: '#6b7280', fontSize: '0.6875rem' }}>{msg.time}</span>
                  </div>
                  <p style={{ color: '#d1d5db', fontSize: '0.8125rem', margin: 0 }}>{msg.text}</p>
                </div>
              ))}
            </div>
            <div style={{ padding: '0.75rem', borderTop: '1px solid #374151', display: 'flex', gap: '0.5rem' }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Type a message..."
                style={{ flex: 1, padding: '0.5rem', background: '#374151', border: '1px solid #4b5563', borderRadius: 8, color: 'white', fontSize: '0.8125rem' }} />
              <button onClick={sendChat}
                style={{ padding: '0.5rem 0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.8125rem' }}>
                Send
              </button>
            </div>

            {/* Clinical Notes */}
            <div style={{ padding: '0.75rem', borderTop: '1px solid #374151' }}>
              <h4 style={{ color: '#9ca3af', fontSize: '0.75rem', fontWeight: 600, margin: '0 0 0.5rem', textTransform: 'uppercase' }}>Clinical Notes</h4>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Document findings during the call..."
                rows={4}
                style={{ width: '100%', padding: '0.5rem', background: '#374151', border: '1px solid #4b5563', borderRadius: 8, color: 'white', fontSize: '0.8125rem', resize: 'vertical' }} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#1f2937', borderTop: '1px solid #374151' }}>
        <ControlButton icon={callState.isMuted ? MicOff : Mic} label={callState.isMuted ? 'Unmute' : 'Mute'}
          active={callState.isMuted} onClick={toggleMute} disabled={!callState.isConnected} />
        <ControlButton icon={callState.isVideoOff ? VideoOff : Video} label={callState.isVideoOff ? 'Start Video' : 'Stop Video'}
          active={callState.isVideoOff} onClick={toggleVideo} disabled={!callState.isConnected} />
        <ControlButton icon={Monitor} label="Share Screen" onClick={() => {}} disabled={!callState.isConnected} />
        <ControlButton icon={MessageSquare} label="Chat" onClick={() => setShowChat(!showChat)} active={showChat} />
        <ControlButton icon={Maximize} label="Fullscreen" onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})} />

        {/* End Call */}
        <button onClick={() => endSessionMut.mutate()} disabled={!callState.isConnected}
          style={{
            width: 56, height: 56, borderRadius: '50%', background: '#ef4444', border: 'none',
            cursor: callState.isConnected ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: callState.isConnected ? 1 : 0.5,
          }}>
          <Phone style={{ width: 24, height: 24, color: 'white', transform: 'rotate(135deg)' }} />
        </button>
      </div>
    </div>
  );
}

function ControlButton({ icon: Icon, label, onClick, active, disabled }: {
  icon: any; label: string; onClick: () => void; active?: boolean; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={label}
      style={{
        width: 48, height: 48, borderRadius: 12, border: 'none', cursor: disabled ? 'default' : 'pointer',
        background: active ? '#ef4444' : '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.4 : 1, transition: 'background 0.2s',
      }}>
      <Icon style={{ width: 20, height: 20, color: 'white' }} />
    </button>
  );
}
