export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext;
  public analyser: AnalyserNode | null = null;
  public stream: MediaStream | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async startRecording(deviceId?: string): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    const constraints: MediaStreamConstraints = {
      audio: deviceId 
        ? { deviceId: { exact: deviceId }, echoCancellation: false, autoGainControl: true, noiseSuppression: false } 
        : { echoCancellation: false, autoGainControl: true, noiseSuppression: false }
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.stream = stream;
    
    // Setup Analyser for visualizer
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
    this.mediaStreamSource.connect(this.analyser);

    this.mediaRecorder = new MediaRecorder(stream);
    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(200); // 200ms timeslice to force emitting chunks
  }

  async stopRecording(): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('Recorder not initialized'));
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const mimeType = this.mediaRecorder!.mimeType || 'audio/webm';
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
          
          // Stop all tracks to release microphone
          this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());
          this.mediaStreamSource?.disconnect();
          this.analyser?.disconnect();

          // Resample to 22050 Hz, mono for basic-pitch
          const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
            1, // mono
            Math.max(1, Math.ceil(audioBuffer.duration * 22050)),
            22050
          );
          
          const source = offlineCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(offlineCtx.destination);
          source.start();
          
          const resampledBuffer = await offlineCtx.startRendering();
          
          resolve(resampledBuffer);
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }
}
