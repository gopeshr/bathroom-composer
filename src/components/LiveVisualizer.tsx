import React, { useEffect, useRef } from 'react';

export const LiveVisualizer: React.FC<{ analyser: AnalyserNode | null }> = ({ analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ec4899'; // accent-pink
      ctx.beginPath();

      const sliceWidth = canvas.width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        // value is between 0 and 255. 128 is silence.
        const v = dataArray[i] - 128; 
        
        // amplify the visualizer so hums are easily seen
        const amplified = v * 4; 
        
        // map back to canvas height
        const y = (canvas.height / 2) + (amplified * (canvas.height / 2) / 128.0);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser]);

  if (!analyser) return null;

  return (
    <canvas 
      ref={canvasRef} 
      width={200} 
      height={60} 
      className="absolute top-24 rounded-xl border border-surface-border/50 bg-surface-card/30"
    />
  );
};
