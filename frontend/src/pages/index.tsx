import Webcam from "react-webcam";
import { useRef, useEffect } from "react";

const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: "user"
};

export default function App() {
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (webcamRef.current) {
        const imageSrc = webcamRef.current.getScreenshot();
        console.log(typeof imageSrc, imageSrc);
        
        fetch("http://167.99.189.49:8000/upload/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ image: imageSrc })
        }).then(response => {
          return response.json();
        }).then(data => {
          console.log("Image uploaded successfully:", data);
        }).catch(error => {
          console.error("Error uploading image:", error);
        })
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Webcam
        audio={false}
        height={720}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={1280}
        videoConstraints={videoConstraints}
      />
    </div>
  );
}
