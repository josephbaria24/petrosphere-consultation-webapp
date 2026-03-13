"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Camera, RefreshCw, Check, X, SwitchCamera } from "lucide-react";
import { toast } from "sonner";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export default function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [isFrontCamera]);

  const startCamera = async () => {
    setIsLoading(true);
    try {
      if (stream) {
        stopCamera();
      }
      const constraints = {
        video: {
          facingMode: isFrontCamera ? "user" : "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      };
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        // Optimization for mobile: ensure play() is called explicitly
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.error("Video play error:", playErr);
        }
      }
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      console.error("Camera error:", err);
      
      const errorMessage = err.name === "NotAllowedError" || err.message?.includes("Permission") 
        ? "Camera access was denied. Please enable it in browser settings."
        : "Could not access camera (" + (err.name || "Error") + "). Check device settings.";
      
      toast.error(errorMessage);
      onCancel();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      setCapturedImage(dataUrl);
    }
  };

  const handleUsePhoto = () => {
    if (!capturedImage) return;

    // Convert dataUrl to File
    const byteString = atob(capturedImage.split(",")[1]);
    const mimeString = capturedImage.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });

    stopCamera();
    onCapture(file);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-lg aspect-[3/4] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-8">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-black/40 border-white/20 text-white hover:bg-black/60 w-12 h-12"
                onClick={() => {
                  stopCamera();
                  onCancel();
                }}
              >
                <X className="w-6 h-6" />
              </Button>

              <button
                className="w-16 h-16 rounded-full bg-white border-4 border-zinc-400 active:scale-95 transition-transform"
                onClick={capturePhoto}
                title="Capture Photo"
              />

              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-black/40 border-white/20 text-white hover:bg-black/60 w-12 h-12"
                onClick={() => setIsFrontCamera(!isFrontCamera)}
              >
                <SwitchCamera className="w-6 h-6" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-6 px-4">
              <Button
                variant="secondary"
                className="flex-1 gap-2 h-12 rounded-xl"
                onClick={() => setCapturedImage(null)}
              >
                <RefreshCw className="w-4 h-4" /> Retake
              </Button>
              <Button
                variant="default"
                className="flex-1 gap-2 h-12 rounded-xl bg-green-600 hover:bg-green-700"
                onClick={handleUsePhoto}
              >
                <Check className="w-4 h-4" /> Use Photo
              </Button>
            </div>
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
      
      <p className="mt-6 text-zinc-400 text-sm">
        {!capturedImage ? "Frame your shot and press the shutter" : "Review your capture"}
      </p>
    </div>
  );
}
