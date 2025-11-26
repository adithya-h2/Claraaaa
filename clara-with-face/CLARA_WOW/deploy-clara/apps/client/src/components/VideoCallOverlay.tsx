import React, { useRef, useEffect, useState } from 'react';

interface VideoCallOverlayProps {
  staffName: string;
  activeCall: {
    pc: RTCPeerConnection;
    stream: MediaStream;
    remoteStream: MediaStream | null;
  } | null;
  onEndCall: () => void;
}

const VideoCallOverlay: React.FC<VideoCallOverlayProps> = ({
  staffName,
  activeCall,
  onEndCall,
}) => {
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const staffVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isStaffSpeaking, setIsStaffSpeaking] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);

  // Setup local video stream
  useEffect(() => {
    const startCameraAndAudio = async () => {
      try {
        let stream: MediaStream;
        if (activeCall?.stream) {
          stream = activeCall.stream;
          streamRef.current = stream;
        } else {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          streamRef.current = stream;
        }

        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
          userVideoRef.current.play().catch(console.error);
        }

        // Setup audio analysis for speaker detection
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkSpeaking = () => {
          analyser.getByteTimeDomainData(dataArray);
          let sum = 0;
          for (const amplitude of dataArray) {
            sum += Math.pow(amplitude / 128 - 1, 2);
          }
          const volume = Math.sqrt(sum / dataArray.length);
          const SPEAKING_THRESHOLD = 0.02;

          const audioTrack = streamRef.current?.getAudioTracks()[0];
          if (audioTrack?.enabled) {
            setIsUserSpeaking(volume > SPEAKING_THRESHOLD);
          } else {
            setIsUserSpeaking(false);
          }
          animationFrameRef.current = requestAnimationFrame(checkSpeaking);
        };
        checkSpeaking();
      } catch (err) {
        console.error("Error accessing camera/mic:", err);
      }
    };

    if (activeCall) {
      startCameraAndAudio();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current && !activeCall?.stream) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, [activeCall]);

  // Watch for remote stream and update staff video
  useEffect(() => {
    // First check if we have remoteStream directly
    if (activeCall?.remoteStream && staffVideoRef.current) {
      console.log('[VideoCallOverlay] Setting remote stream from activeCall.remoteStream');
      staffVideoRef.current.srcObject = activeCall.remoteStream;
      staffVideoRef.current.play().catch(err => console.error('Error playing remote video:', err));
      setIsConnected(true);
      
      // Monitor remote audio for speaking detection
      if (activeCall.remoteStream.getAudioTracks().length > 0) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(activeCall.remoteStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkSpeaking = () => {
          analyser.getByteTimeDomainData(dataArray);
          let sum = 0;
          for (const amplitude of dataArray) {
            sum += Math.pow(amplitude / 128 - 1, 2);
          }
          const volume = Math.sqrt(sum / dataArray.length);
          const SPEAKING_THRESHOLD = 0.02;
          setIsStaffSpeaking(volume > SPEAKING_THRESHOLD);
          animationFrameRef.current = requestAnimationFrame(checkSpeaking);
        };
        checkSpeaking();
      }
      return;
    }

    // If no remoteStream but we have PC, check for tracks
    if (!activeCall?.pc) return;

    const pc = activeCall.pc;
    
    const checkRemoteStream = () => {
      // Check for tracks in peer connection
      const receivers = pc.getReceivers();
      if (receivers.length > 0) {
        const tracks = receivers.map(r => r.track).filter(Boolean) as MediaStreamTrack[];
        if (tracks.length > 0) {
          const newRemoteStream = new MediaStream(tracks);
          console.log('[VideoCallOverlay] Found remote stream in peer connection tracks');
          if (staffVideoRef.current) {
            staffVideoRef.current.srcObject = newRemoteStream;
            staffVideoRef.current.play().catch(err => console.error('Error playing remote video:', err));
          }
          setIsConnected(true);
          
          // Monitor remote audio for speaking detection
          if (newRemoteStream.getAudioTracks().length > 0) {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(newRemoteStream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const checkSpeaking = () => {
              analyser.getByteTimeDomainData(dataArray);
              let sum = 0;
              for (const amplitude of dataArray) {
                sum += Math.pow(amplitude / 128 - 1, 2);
              }
              const volume = Math.sqrt(sum / dataArray.length);
              const SPEAKING_THRESHOLD = 0.02;
              setIsStaffSpeaking(volume > SPEAKING_THRESHOLD);
              animationFrameRef.current = requestAnimationFrame(checkSpeaking);
            };
            checkSpeaking();
          }
        }
      }
    };

    checkRemoteStream();

    const handleTrack = (e: RTCTrackEvent) => {
      console.log('[VideoCallOverlay] Track event received:', e);
      if (e.streams && e.streams.length > 0) {
        const remoteStream = e.streams[0];
        console.log('[VideoCallOverlay] Setting remote stream from track event');
        if (staffVideoRef.current) {
          staffVideoRef.current.srcObject = remoteStream;
          staffVideoRef.current.play().catch(err => console.error('Error playing remote video:', err));
        }
        setIsConnected(true);
        
        // Monitor remote audio for speaking detection
        if (remoteStream.getAudioTracks().length > 0) {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const source = audioContext.createMediaStreamSource(remoteStream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkSpeaking = () => {
            analyser.getByteTimeDomainData(dataArray);
            let sum = 0;
            for (const amplitude of dataArray) {
              sum += Math.pow(amplitude / 128 - 1, 2);
            }
            const volume = Math.sqrt(sum / dataArray.length);
            const SPEAKING_THRESHOLD = 0.02;
            setIsStaffSpeaking(volume > SPEAKING_THRESHOLD);
            animationFrameRef.current = requestAnimationFrame(checkSpeaking);
          };
          checkSpeaking();
        }
      }
    };

    pc.addEventListener('track', handleTrack);
    
    return () => {
      pc.removeEventListener('track', handleTrack);
    };
  }, [activeCall?.remoteStream, activeCall?.pc]);

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#202124',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Main Video Area */}
      <div style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
      }}>
        {/* Remote Video (Staff) - Full Screen */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {activeCall?.remoteStream ? (
            <video 
              ref={staffVideoRef} 
              autoPlay 
              playsInline 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                border: isStaffSpeaking ? '4px solid #34a853' : 'none',
                transition: 'border 0.2s',
              }}
            />
          ) : (
            <div style={{
              textAlign: 'center',
              color: '#fff',
            }}>
              <div style={{
                width: '120px',
                height: '120px',
                margin: '0 auto 20px',
                backgroundColor: 'rgba(66, 133, 244, 0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#4285f4' }}>
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>{staffName}</h2>
              <p style={{ color: '#9aa0a6', fontSize: '14px' }}>
                {isConnected ? 'Connected' : 'Connecting...'}
              </p>
            </div>
          )}
          
          {/* Staff Name Badge */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            backgroundColor: 'rgba(32, 33, 36, 0.8)',
            backdropFilter: 'blur(10px)',
            padding: '8px 16px',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 500,
          }}>
            {staffName}
          </div>
        </div>

        {/* Local Video (User) - Picture in Picture (Bottom Right) */}
        <div style={{
          position: 'absolute',
          bottom: '100px',
          right: '20px',
          width: '240px',
          height: '180px',
          backgroundColor: '#2d2e30',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          border: isUserSpeaking ? '3px solid #34a853' : '2px solid rgba(255, 255, 255, 0.1)',
          transition: 'all 0.2s',
        }}>
          {isCameraOn && streamRef.current ? (
            <video 
              ref={userVideoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#2d2e30',
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#9aa0a6' }}>
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            backgroundColor: 'rgba(32, 33, 36, 0.8)',
            backdropFilter: 'blur(10px)',
            padding: '4px 8px',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 500,
          }}>
            You
          </div>
        </div>
      </div>

      {/* Google Meet Style Controls */}
      <div style={{
        backgroundColor: 'rgba(32, 33, 36, 0.95)',
        backdropFilter: 'blur(20px)',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        {/* Mic Toggle */}
        <button
          onClick={toggleMic}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isMicOn ? '#3c4043' : '#ea4335',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isMicOn ? '#5f6368' : '#f44336';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isMicOn ? '#3c4043' : '#ea4335';
          }}
          aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isMicOn ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
          )}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={toggleCamera}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isCameraOn ? '#3c4043' : '#ea4335',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isCameraOn ? '#5f6368' : '#f44336';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isCameraOn ? '#3c4043' : '#ea4335';
          }}
          aria-label={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {isCameraOn ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 6.5l-5.5-3.5H3.5C2.67 3 2 3.67 2 4.5v15c0 .83.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5v-15zM12 13.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 6.5l-5.5-3.5H3.5C2.67 3 2 3.67 2 4.5v15c0 .83.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5v-15zM12 13.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>

        {/* End Call Button */}
        <button
          onClick={onEndCall}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: '#ea4335',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s, transform 0.1s',
            marginLeft: '8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f44336';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ea4335';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          aria-label="End call"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'rotate(135deg)' }}>
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.33.16-.72.12-1.01-.1L4.27 12.5c-1.12-.9-2.5-1.5-4.27-1.5v2c1.77 0 3.15.6 4.27 1.5l1.56-1.12c.29-.22.68-.26 1.01-.1.33.16.56.51.56.9v3.1c1.45-.47 3-.72 4.6-.72s3.15.25 4.6.72v-3.1c0-.39.23-.74.56-.9.33-.16.72-.12 1.01.1l1.56 1.12c1.12.9 2.5 1.5 4.27 1.5v-2c-1.77 0-3.15-.6-4.27-1.5l-1.56 1.12c-.29.22-.68.26-1.01.1-.33-.16-.56-.51-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default VideoCallOverlay;

