import { useState, useRef, useEffect } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Webcam from 'react-webcam';

export default function CameraComponent() {
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const webcamRef = useRef<Webcam>(null);

    // Start camera
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: "user", 
                    width: { ideal: 1280 }, 
                    height: { ideal: 720 } 
                }
            });
            
            setIsCameraOpen(true);
            setError(null);
            
            // Wait a bit for the video element to render
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    streamRef.current = stream;
                    videoRef.current.play().catch(err => {
                        console.error("Error playing video:", err);
                    });
                }
            }, 100);
            
        } catch (err) {
            setError("Failed to access camera. Please grant camera permissions.");
            console.error("Camera error:", err);
        }
    };

    // Stop camera
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraOpen(false);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    // Auto-capture and upload every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            if (webcamRef.current) {
                const imageSrc = webcamRef.current.getScreenshot();
                console.log(typeof imageSrc, imageSrc);
                
                if (imageSrc) {
                    fetch("http://167.99.189.49:8000/upload/", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ image: imageSrc })
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log("Image uploaded successfully:", data);
                    })
                    .catch(error => {
                        console.error("Error uploading image:", error);
                    });
                }
            }
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Camera Preview
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Error Message */}
                {error && (
                    <Alert className="bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Camera View */}
                {!isCameraOpen ? (
                    <div className="text-center py-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900">
                        <Camera className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                        <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">
                            Camera is off
                        </p>
                        <Button onClick={startCamera}>
                            <Camera className="mr-2 h-4 w-4" />
                            Start Camera
                        </Button>
                    </div>
                ) : (
                    <div className="relative">
                        <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            className="w-full rounded-lg"
                        />
                        <Button
                            onClick={stopCamera}
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                        <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                            Camera Active
                        </div>
                    </div>
                )}

                {/* Instructions when camera is open */}
                {isCameraOpen && (
                    <div className="text-center text-sm text-slate-600 dark:text-slate-400">
                        Position yourself in the frame. Facial recognition will be added soon.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}