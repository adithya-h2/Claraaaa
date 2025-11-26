import React, { useState, useEffect } from 'react';

interface RoboFaceProps {
  amplitude: number; // 0.0 to 1.0 (Robot speaking volume)
  isListening: boolean;
}

const RoboFace: React.FC<RoboFaceProps> = ({ amplitude, isListening }) => {
  const [isBlinking, setIsBlinking] = useState(false);

  // Blinking Logic
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      // Random blink interval between 2s and 6s
      const nextBlink = Math.random() * 4000 + 2000; 
      timeoutId = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 150); // Blink duration
      }, nextBlink);
    };
    scheduleBlink();
    return () => clearTimeout(timeoutId);
  }, []);

  // -- Mouth Logic --
  // Improved lip sync - more responsive to audio amplitude
  // Use a smoother curve for better visual sync
  const normalizedAmplitude = Math.min(1, Math.max(0, amplitude));
  
  // Debug: Log amplitude occasionally
  useEffect(() => {
    if (normalizedAmplitude > 0.1) {
      console.log('[RoboFace] Amplitude:', normalizedAmplitude.toFixed(3));
    }
  }, [normalizedAmplitude]);
  
  // Increased mouth size and responsiveness - make it much more dramatic
  const baseMouthHeight = 8;
  const baseMouthWidth = 200;
  // Use exponential curve for more dramatic movement
  const amplitudeMultiplier = Math.pow(normalizedAmplitude, 0.7); // Slight curve for more visible movement
  const mouthHeight = baseMouthHeight + (amplitudeMultiplier * 80); // Much more responsive (increased from 50)
  const mouthWidth = baseMouthWidth + (amplitudeMultiplier * 60); // More responsive width (increased from 40)

  // -- Eye Logic --
  const isSpeaking = amplitude > 0.05;

  let scaleY = 1;
  let scaleX = 1;

  if (isBlinking) {
    scaleY = 0.1; // Close eyes (blink)
    scaleX = 1.1; // Slight squash width
  } else if (isSpeaking) {
    // "Emotive" shape when speaking:
    // Stretch Y slightly to look "engaged" or "wide-eyed"
    // Squash X slightly to maintain mass
    scaleY = 1 + (amplitude * 0.4); 
    scaleX = 1 - (amplitude * 0.1);
  }

  // Smooth transitions for organic feel
  const eyeStyle: React.CSSProperties = {
    transform: `scale(${scaleX}, ${scaleY})`,
  };
  
  // Fade out slightly when not connected/listening
  const containerOpacity = isListening ? 1 : 0.6;

  const eyeBaseStyle: React.CSSProperties = {
    width: '220px', // Much larger - cover half screen
    height: '220px', // Much larger - cover half screen
    backgroundColor: '#22c55e',
    boxShadow: '0 0 50px #22c55e', // Increased glow for larger eyes
    borderRadius: '55px', // Increased border radius for larger eyes
    transition: 'transform 0.1s ease-in-out',
    ...eyeStyle
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '500px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000',
      overflow: 'hidden'
    }}>
      
      {/* Eyes Container */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '200px', // Increased from 64px to 200px for more distance
        width: '100%',
        marginBottom: '80px', // Increased margin
        position: 'relative',
        zIndex: 10,
        transition: 'opacity 0.5s',
        opacity: containerOpacity
      }}>
        {/* Left Eye */}
        <div style={eyeBaseStyle}></div>
        {/* Right Eye */}
        <div style={eyeBaseStyle}></div>
      </div>

      {/* Mouth Container */}
      <div style={{
        height: '128px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        position: 'relative',
        zIndex: 10,
        transition: 'opacity 0.5s',
        opacity: containerOpacity
      }}>
        {/* Rounded mouth edges to match smoother eyes */}
        <div 
          style={{
            backgroundColor: '#22c55e',
            boxShadow: '0 0 25px #22c55e',
            transition: 'all 0.05s linear', // Faster, linear transition for more responsive movement
            borderRadius: '8px',
            height: `${mouthHeight}px`,
            width: `${mouthWidth}px`,
            minHeight: `${baseMouthHeight}px`, // Ensure minimum size
            minWidth: `${baseMouthWidth}px`
          }}
        ></div>
      </div>

      {/* Status Text */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        color: '#166534',
        fontSize: '12px',
        fontFamily: 'monospace',
        letterSpacing: '0.5em'
      }}>
        {isListening ? "LISTENING..." : "STANDBY"}
      </div>
    </div>
  );
};

export default RoboFace;

