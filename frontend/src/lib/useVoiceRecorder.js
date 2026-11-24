import { useRef, useState } from "react";
import { blobToWav } from "./wav";

/** Same microphone capture the voice desk uses. Resolves with a wav blob when recording stops. */
export function useVoiceRecorder() {
  const [listening, setListening] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const stop = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const start = () => new Promise((resolve, reject) => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setListening(false);
        recorderRef.current = null;
        try {
          const wav = await blobToWav(new Blob(chunksRef.current, { type: recorder.mimeType }));
          resolve(wav);
        } catch (err) {
          reject(err);
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setListening(true);
    }).catch(reject);
  });

  return { listening, start, stop };
}
