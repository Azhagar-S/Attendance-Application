'use client'
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
  } from "@/components/ui/input-otp"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RecaptchaVerifier, signInWithPhoneNumber , widgetId} from "firebase/auth";
import { auth } from "@/app/firebase/config";
import { collection, doc, getDocs, query, setDoc, updateDoc, where  , serverTimestamp } from "firebase/firestore";
import {db} from '@/app/firebase/config'
import { onAuthStateChanged } from "firebase/auth";

// import for admin or employee dashboard

import Employee from '@/app/createaccount/employee-create-account/page'
import Admin from '@/app/createaccount/admin-create-account/page'




export default function LoginForm() {
    const router = useRouter();
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [confirmation, setConfirmation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [user, setUser] = useState(null);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);

    const [userData, setUserData] = useState(null);

    // for passing data


    const check = auth.currentUser;
       
      


        useEffect(() => {
          if (typeof window === 'undefined') return;
          
          
          
          const container = document.getElementById("recaptcha-container");
          if (!container) {
            console.error("Recaptcha container element not found.");
            return;
          }
          
          try {
            const recaptchaVerifier = new RecaptchaVerifier(
              auth,
              "recaptcha-container",
              {
                size: "invisible",
              }
            );
            
            window.recaptchaVerifier = recaptchaVerifier;
            setRecaptchaVerifier(recaptchaVerifier);
            
            console.log("RecaptchaVerifier initialized successfully");
          } catch (error) {
            console.error("Error initializing RecaptchaVerifier:", error);
            setError("Failed to initialize verification. Please refresh the page.");
          }
          
          return () => {
            if (window.recaptchaVerifier) {
              window.recaptchaVerifier.clear();
              window.recaptchaVerifier = null;
            }
          };
        }, [auth])

  

      

    const handleSendOtp = async (e) => {
    
    e.preventDefault(); 
    if (!phone) {
      setError("Please enter a phone number");
      return;
    }

    if(phone.length !== 10){
      setError("Please enter a valid phone number");
      return;
    }

    
    setLoading(true);
    setError("");

      

  try {
    
    const q=query(collection(db,"users"),where("phone","==",phone));
    const querySnapshot=await getDocs(q);
    if(!querySnapshot.empty){
      const active=querySnapshot.docs[0];
    const isActive=active.data().isActive;
    if(!isActive){
      setError("Your account is not active. Please contact the admin.");
      setLoading(false);
      return;
    }

    }

      // Check for user
      const adminQuery = query(
        collection(db, "request"),
        where("phone", "==", phone)
      );
      const adminSnapshot = await getDocs(adminQuery);
      const usersQuerySnapshot = querySnapshot.docs[0];
      
      if (adminSnapshot.empty && usersQuerySnapshot.empty) {
        setError("User not found");
        setLoading(false);
        return;
      }

      if (!window.recaptchaVerifier) {
        setError("Verification system not initialized. Please refresh the page.");
        setLoading(false);
        return;
      }

      const formattedPhone = "+91" + phone;    
      console.log("Sending OTP to", formattedPhone);
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        window.recaptchaVerifier
      );
      setConfirmation(confirmationResult);
      console.log("OTP sent successfully");
    } catch (err) {
      setError(err.message || "Failed to send OTP");
      console.log(err);
    } finally {
      setLoading(false);
    }
    }

    // Handle OTP verification

    const handleVerifyOtp = async (e) => {
      e.preventDefault();
    
      if (!otp) {
        setError("Please enter the OTP");
        return;
      }
    
      setLoading(true);
      setError("");
    
      try {
        await confirmation.confirm(otp);
    
        const usersQuery = query(collection(db, "users"), where("phone", "==", phone));
        const usersSnapshot = await getDocs(usersQuery);
    
        const requestQuery = query(collection(db, "request"), where("phone", "==", phone));
        const requestSnapshot = await getDocs(requestQuery);
    
        // Prioritize user data from 'users' collection if it exists
        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          const userData = userDoc.data();
          const requestDoc = requestSnapshot.empty ? null : requestSnapshot.docs[0];
    
          if (userData.isNew) {
            // User is new, route to account creation
            // if (requestDoc) {
            //   await updateDoc(doc(db, "request", requestDoc.id), { isNew: false });
            // }
            if (userData.role === "admin") {
              return router.push("/createaccount/admin-create-account");
            } else { // 'employee'
              return router.push("/createaccount/employee-create-account");
            }
          } else {
            // User is existing, route to dashboard
            await updateDoc(doc(db, "users", userDoc.id), { lastLogin: serverTimestamp() });
            if (requestDoc) {
              await updateDoc(doc(db, "request", requestDoc.id), { lastLogin: serverTimestamp() });
            }
    
            if (userData.role === "admin") {
              return router.push("/admin");
            } else { // 'employee'
              return router.push("/employee");
            }
          }
        } else if (!requestSnapshot.empty) {
          // User only exists in 'request' collection
          const requestDoc = requestSnapshot.docs[0];
          const requestData = requestDoc.data();
          
          await updateDoc(doc(db, "request", requestDoc.id), { isNew: false });
          
          if (requestData.role === "admin") {
            return router.push("/createaccount/admin-create-account");
          } else if (requestData.role === "employee") {
            return router.push("/createaccount/employee-create-account");
          } else {
            setError("User role is invalid.");
          }
        } else {
          setError("User not found.");
        }
      } catch (err) {
        setError("Invalid OTP. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    

  
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-center font-bold text-blue-600">Login</CardTitle>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </CardHeader>
        <CardContent>
        {!confirmation ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-lg font-medium  mb-1 text-gray-800">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="Enter 10-digit phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2 border rounded text-md"
                  maxLength={13}
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
                
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4" >
              <div >
                <Label className="block text-sm font-medium mb-1">
                  Enter OTP
                </Label>
               <div className=" m-5 ms-10">
               <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                    </InputOTPGroup>
                </InputOTP>
               </div>

              </div>
              <Button
                type="submit"
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </Button>
              <Button
                type="button"
                onClick={() => setConfirmation(null)}
                className="w-full text-sm text-white hover:bg-blue-700"
                disabled={loading}
              >
                Change Phone Number
              </Button>
            </form>
          )}
        </CardContent>
        
      </Card>

      <div id="recaptcha-container"></div>
    </div>
  )
}
