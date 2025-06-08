// components/DashboardWidget.jsx
"use client"; // Necessary for hooks and browser APIs

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Shadcn UI
import { Button } from "@/components/ui/button"; // Shadcn UI (optional for signature)

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Import SignaturePad (if you still need it)
// npm install react-signature-canvas (if not already installed)


export default function DashboardWidget({
  employeeName,
  showSignature = false,
  defaultLatitude = 13.0827, // Default to Chennai, India
  defaultLongitude = 80.2707,
  defaultLocationName = "Chennai, India (Default)"
}) {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [signature, setSignature] = useState('');
  const [location, setLocation] = useState({
    lat: defaultLatitude,
    lng: defaultLongitude,
    name: defaultLocationName,
    status: "Initializing..." // To show status like "Fetching...", "Unavailable", "Available"
  });

  const sigPadRef = useRef(null);
 // const [signatureDataUrl, setSignatureDataUrl] = useState(null);

  // Effect for Date & Time
  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timerId); // Cleanup on unmount
  }, []);

  // Effect for Geolocation
  useEffect(() => {
    setLocation(prev => ({ ...prev, status: "Fetching location..." }));
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            name: "Current Location",
            status: "Location available"
          });
        },
        (error) => {
          console.warn("Error getting location:", error.message);
          setLocation(prev => ({
            ...prev, // Keep default lat/lng
            name: defaultLocationName, // Ensure default name is used
            status: `Geolocation error: ${error.message}. Using default.`
          }));
        }
      );
    } else {
      console.warn("Geolocation is not supported by this browser.");
      setLocation(prev => ({
        ...prev, // Keep default lat/lng
        name: defaultLocationName, // Ensure default name is used
        status: "Geolocation not supported. Using default."
      }));
    }
  }, [defaultLatitude, defaultLongitude, defaultLocationName]); // Rerun if default props change

  const formatDate = (date) => {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString();
  };

  const clearSignature = () => {
    sigPadRef.current?.clear();
    //setSignatureDataUrl(null);
  };

  const saveSignature = () => {
    if (sigPadRef.current) {
      if (sigPadRef.current.isEmpty()) {
        alert("Please provide a signature first.");
        return;
      }
      const dataUrl = sigPadRef.current.getTrimmedCanvas().toDataURL("image/png");
      //setSignatureDataUrl(dataUrl);
      console.log("Signature Saved (Data URL):", dataUrl);
      alert("Signature would be saved here!");
    }
  };

  return (
    <Card className="w-full max-w-sm mx-auto shadow-md">
      <CardHeader>
        <CardTitle>Status Board</CardTitle>
        {employeeName && <CardDescription>User: {employeeName}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date and Time Section */}
        <div>
          <h3 className="text-md font-semibold mb-1">Current Date & Time</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">{formatDate(currentDateTime)}</p>
          <p className="text-xl font-semibold text-indigo-600 dark:text-indigo-400">{formatTime(currentDateTime)}</p>
        </div>

        <hr />

        {/* Location Section - Now with an empty container visually */}
        <div>
          <h3 className="text-md font-semibold mb-1">Location</h3>
          {/* Empty container where the map used to be */}
          <div className="h-20 w-full rounded-md border border-dashed bg-gray-50 dark:bg-gray-700 flex items-center justify-center mb-2">
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">Location Area</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Status: {location.status}
          </p>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {location.name}: ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
          </p>

          <div className="mt-2">
              <Label htmlFor="signature" className="text-sm">Employee Signature (Optional)</Label>
              <Input 
                id="signature" 
                name="signature" 
                placeholder="Type your name to sign" 
                value={signature}
                onChange={(e) => setSignature(e.target.value)} 
                className="mt-1"
              />
            </div>
        </div>

        {/* Optional Employee Signature Section */}
        {/* {showSignature && (
          <>
            <hr />
            <div>
              <h3 className="text-md font-semibold mb-1">Sign In/Out</h3>
              {signatureDataUrl ? (
                <div className="border p-2 rounded-md bg-gray-50 dark:bg-gray-700">
                  <p className="text-xs mb-1">Signed:</p>
                  <img src={signatureDataUrl} alt="Employee Signature" className="border rounded-md mx-auto" style={{maxHeight: '100px'}} />
                  <Button onClick={() => setSignatureDataUrl(null)} variant="link" size="sm" className="mt-1 text-indigo-600 dark:text-indigo-400">
                    Sign Again
                  </Button>
                </div>
              ) : (
                <>
                  <div className="border rounded-md w-full h-32 bg-gray-100 dark:bg-gray-700 touch-none">
                    <SignatureCanvas
                      ref={sigPadRef}
                      penColor="black"
                      canvasProps={{ className: "w-full h-full rounded-md" }}
                    />
                  </div>
                  <div className="flex space-x-2 mt-2 justify-end">
                    <Button onClick={clearSignature} variant="outline" size="sm">Clear</Button>
                    <Button onClick={saveSignature} size="sm">Confirm Sign</Button>
                  </div>
                </>
              )}
            </div>
          </>
        )} */}
      </CardContent>
    </Card>
  );
}