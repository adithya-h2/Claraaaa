import React from 'react';
import RoboFace from './RoboFace';
import { Location } from '../locationsDatabase';
import VideoCallOverlay from './VideoCallOverlay';

const MicOnIcon = ({size=24}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
);

interface FacialExpressionsViewProps {
  amplitude: number; // 0.0 to 1.0 (audio amplitude for lipsync)
  isListening: boolean; // Whether Clara is listening/connected
  locationCard?: { location: Location } | null; // Optional location card to display
  messages?: Array<{ sender: string; text: string; isFinal?: boolean; timestamp?: string; language?: string }>; // Messages to display
  onMicClick?: () => void; // Mic button click handler
  isRecording?: boolean; // Whether currently recording
  onCloseLocationCard?: () => void; // Handler to close location card
  pendingVideoCall?: { staffName: string; staffEmail: string } | null; // Pending video call to accept/decline
  onAcceptVideoCall?: () => void; // Handler to accept video call
  onDeclineVideoCall?: () => void; // Handler to decline video call
  activeVideoCall?: {
    staffName: string;
    activeCall: {
      pc: RTCPeerConnection;
      stream: MediaStream;
      remoteStream: MediaStream | null;
    } | null;
  } | null; // Active video call to display
  onEndVideoCall?: () => void; // Handler to end video call
}

const LocationCard = ({ location, onClose }: { location: Location; onClose?: () => void }) => {
  return (
    <div style={{
      position: 'relative',
      padding: '24px',
      borderRadius: '20px',
      background: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(34, 197, 94, 0.2)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(34, 197, 94, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      color: '#fff',
      maxWidth: '450px',
      width: '100%',
    }}>
      {/* Close Button - Top Right */}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.3)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 'bold',
            zIndex: 1000,
            transition: 'all 0.2s ease',
            lineHeight: '1'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.6)';
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          aria-label="Close location card"
        >
          ×
        </button>
      )}
      
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '8px',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          flex: 1,
        }}>
          <div style={{
            fontSize: '22px',
            fontWeight: '700',
            color: '#22c55e',
            textShadow: '0 0 10px rgba(34, 197, 94, 0.5)',
          }}>
            {location.name}
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            {location.room_number && (
              <span style={{
                padding: '6px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#22c55e',
                backdropFilter: 'blur(10px)',
              }}>
                Room {location.room_number}
              </span>
            )}
            <span style={{
              padding: '6px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#60a5fa',
              backdropFilter: 'blur(10px)',
            }}>
              {location.floor_name}
            </span>
          </div>
        </div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          borderRadius: '12px',
          background: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          color: '#22c55e',
          fontSize: '12px',
          fontWeight: '600',
          backdropFilter: 'blur(10px)',
        }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"></path>
          </svg>
          <span>{location.building}</span>
        </div>
      </div>

      {/* Start From */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <span style={{
          textTransform: 'uppercase',
          fontSize: '11px',
          letterSpacing: '1.5px',
          fontWeight: '700',
          color: 'rgba(255, 255, 255, 0.6)',
        }}>
          Start from
        </span>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.9)',
          lineHeight: '1.6',
        }}>
          {location.startingPoint}
        </p>
      </div>

      {/* Steps */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <span style={{
          textTransform: 'uppercase',
          fontSize: '11px',
          letterSpacing: '1.5px',
          fontWeight: '700',
          color: 'rgba(255, 255, 255, 0.6)',
        }}>
          Follow these steps
        </span>
        <ol style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {location.steps.map((step, index) => (
            <li key={`${location.key}-step-${index}`} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              backdropFilter: 'blur(10px)',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '14px',
                flexShrink: 0,
                boxShadow: '0 0 15px rgba(34, 197, 94, 0.4)',
              }}>
                {index + 1}
              </div>
              <p style={{
                margin: 0,
                fontSize: '14px',
                lineHeight: '1.6',
                color: 'rgba(255, 255, 255, 0.95)',
                flex: 1,
              }}>
                {step}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* Citations */}
      {location.citations.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <span style={{
            textTransform: 'uppercase',
            fontSize: '11px',
            letterSpacing: '1.5px',
            fontWeight: '700',
            color: 'rgba(255, 255, 255, 0.6)',
          }}>
            Citations
          </span>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            {location.citations.map((cite) => (
              <span key={`${location.key}-cite-${cite}`} style={{
                padding: '6px 14px',
                borderRadius: '12px',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#60a5fa',
                fontSize: '12px',
                fontWeight: '600',
                backdropFilter: 'blur(10px)',
                letterSpacing: '0.5px',
              }}>
                #{cite}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const FacialExpressionsView: React.FC<FacialExpressionsViewProps> = ({
  amplitude,
  isListening,
  locationCard,
  messages = [],
  onMicClick,
  isRecording = false,
  onCloseLocationCard,
  pendingVideoCall,
  onAcceptVideoCall,
  onDeclineVideoCall,
  activeVideoCall,
  onEndVideoCall,
}) => {
  // If there's an active video call, show the video call overlay
  if (activeVideoCall && activeVideoCall.activeCall) {
    return (
      <VideoCallOverlay
        staffName={activeVideoCall.staffName}
        activeCall={activeVideoCall.activeCall}
        onEndCall={onEndVideoCall || (() => {})}
      />
    );
  }

  // When location card is visible, shift facial expression left
  const facialTransform = locationCard ? 'translateX(-15%)' : 'translateX(0)';
  
  // Get the current message being spoken (last message, or the one that's not final yet)
  const getCurrentMessage = () => {
    if (messages.length === 0) return null;
    
    // Find the last non-final message (currently being spoken) or the last final message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (!messages[i].isFinal) {
        return messages[i]; // Currently being spoken
      }
    }
    // If all are final, return the last one
    return messages[messages.length - 1];
  };
  
  const currentMessage = getCurrentMessage();

  // Language display helper
  const getLanguageTag = (lang?: string) => {
    if (!lang || lang === 'en') return null;
    const languageNames: Record<string, string> = {
      'kn': 'ಕನ್ನಡದಲ್ಲಿ ಪ್ರತಿಕ್ರಿಯಿಸುತ್ತಿದೆ',
      'ta': 'தமிழில் பதில் கொடுக்கப்படுகிறது',
      'te': 'తెలుగులో ప్రతిస్పందిస్తోంది',
      'hi': 'हिंदी में जवाब दे रहा है',
      'ml': 'മലയാളത്തിൽ പ്രതികരിക്കുന്നു',
      'mr': 'मराठीत प्रतिसाद देत आहे',
      'en': 'Responding in English'
    };
    return languageNames[lang] || `Responding in ${lang}`;
  };

  return (
    <div className="facial-expressions-container" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      {/* Facial Expression - shifts left when location card appears */}
      <div 
        style={{ 
          flex: locationCard ? '0 0 60%' : '1 1 100%',
          transition: 'transform 0.3s ease-out, flex 0.3s ease-out',
          transform: facialTransform,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          height: '100%'
        }}
      >
        <RoboFace amplitude={amplitude} isListening={isListening} />
        
        {/* Mic Button - Center (Moved Up) */}
        {onMicClick && (
          <button
            onClick={onMicClick}
            style={{
              position: 'absolute',
              bottom: '180px', // Moved up from 120px to avoid overlap with text
              left: '50%',
              transform: 'translateX(-50%)',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: isRecording ? '#D32F2F' : '#FFB800',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.3s ease',
              zIndex: 100
            }}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <MicOnIcon size={32} />
          </button>
        )}
      </div>

      {/* Location Card - appears on the right when available */}
      {locationCard && (
        <div 
          style={{ 
            flex: '0 0 40%',
            padding: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            overflowY: 'auto',
            maxHeight: '100%'
          }}
        >
          <LocationCard location={locationCard.location} onClose={onCloseLocationCard} />
        </div>
      )}
      
      {/* Text Display - Below Mic Button (Static, No Animation) */}
      {currentMessage && currentMessage.text && (
        <div style={{
          position: 'absolute',
          bottom: '30px', // Below the mic button (which is at bottom: 120px)
          left: '50%',
          transform: 'translateX(-50%)',
          width: '85%',
          maxWidth: '600px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 50,
        }}>
          {/* Language Tag - Show above Clara's message */}
          {currentMessage.sender === 'clara' && currentMessage.language && currentMessage.language !== 'en' && (
            <div style={{
              position: 'absolute',
              top: '-28px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              backdropFilter: 'blur(10px)',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '500',
              color: '#22c55e',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              whiteSpace: 'nowrap',
              zIndex: 51,
            }}>
              {getLanguageTag(currentMessage.language)}
            </div>
          )}
          <div
            style={{
              backgroundColor: currentMessage.sender === 'user' 
                ? 'rgba(0, 0, 0, 0.75)' 
                : 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(25px)',
              WebkitBackdropFilter: 'blur(25px)',
              padding: '12px 20px',
              borderRadius: '12px',
              border: currentMessage.sender === 'user'
                ? '1px solid rgba(76, 175, 80, 0.4)'
                : '1px solid rgba(34, 197, 94, 0.5)',
              boxShadow: currentMessage.sender === 'user'
                ? '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 15px rgba(76, 175, 80, 0.2)'
                : '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 15px rgba(34, 197, 94, 0.2)',
              fontSize: '14px',
              fontWeight: '500',
              color: currentMessage.sender === 'user' ? '#4CAF50' : '#22c55e',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              textAlign: 'center',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              minHeight: '40px',
              maxHeight: '120px',
              overflowY: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              letterSpacing: '0.2px',
              width: '100%',
              maxWidth: '100%',
              lineHeight: '1.5',
            }}
          >
            <span style={{
              fontSize: '14px',
              lineHeight: '1.5',
              width: '100%',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              display: 'block',
            }}>
              {currentMessage.text}
            </span>
          </div>
        </div>
      )}

      {/* Video Call Accept/Decline Overlay */}
      {pendingVideoCall && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          gap: '30px'
        }}>
          <div style={{
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '2px solid #22c55e',
            borderRadius: '20px',
            padding: '40px',
            textAlign: 'center',
            maxWidth: '500px',
            boxShadow: '0 0 30px rgba(34, 197, 94, 0.5)'
          }}>
            <h2 style={{
              color: '#22c55e',
              fontSize: '28px',
              marginBottom: '20px',
              fontFamily: 'monospace'
            }}>
              Incoming Video Call
            </h2>
            <p style={{
              color: '#fff',
              fontSize: '20px',
              marginBottom: '40px',
              fontFamily: 'monospace'
            }}>
              {pendingVideoCall.staffName} wants to video call with you
            </p>
            <div style={{
              display: 'flex',
              gap: '20px',
              justifyContent: 'center'
            }}>
              <button
                onClick={onAcceptVideoCall}
                style={{
                  padding: '15px 40px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  backgroundColor: '#22c55e',
                  color: '#000',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)',
                  transition: 'all 0.3s ease',
                  fontFamily: 'monospace'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#16a34a';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#22c55e';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Accept
              </button>
              <button
                onClick={onDeclineVideoCall}
                style={{
                  padding: '15px 40px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                  transition: 'all 0.3s ease',
                  fontFamily: 'monospace'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ef4444';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacialExpressionsView;

