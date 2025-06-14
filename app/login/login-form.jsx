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
import { RecaptchaVerifier, signInWithPhoneNumber, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/app/firebase/config";
import { collection, doc, getDocs, query, setDoc, updateDoc, where, serverTimestamp, addDoc } from "firebase/firestore";
import {db} from '@/app/firebase/config'
import { onAuthStateChanged } from "firebase/auth";

export default function LoginForm() {
    const router = useRouter();
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [confirmation, setConfirmation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [user, setUser] = useState(null);
    const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);
    const [loginMethod, setLoginMethod] = useState('phone'); // 'phone' or 'email'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Initialize recaptcha
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
                try {
                    window.recaptchaVerifier.clear();
                } catch (e) {
                    console.log("Error clearing recaptcha:", e);
                }
                window.recaptchaVerifier = null;
            }
        };
    }, []);

    // Auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            console.log("Auth state changed:", user ? "User logged in" : "User logged out");
        });

        return () => unsubscribe();
    }, []);

    // Helper function to handle user routing after authentication
    const handleUserRouting = async (userData, userDocId = null) => {
        try {
            if (userData.isNew) {
                // New user - route to account setup
                if (userData.role === "admin") {
                    router.push("/createaccount/admin-create-account");
                } else {
                    router.push("/createaccount/employee-create-account");
                }
            } else {
                // Existing user - update last login and route to dashboard
                if (userDocId) {
                    await updateDoc(doc(db, "users", userDocId), { 
                        lastLogin: serverTimestamp() 
                    });
                }
                
                if (userData.role === "admin") {
                    router.push("/admin");
                } else {
                    router.push("/employee");
                }
            }
        } catch (error) {
            console.error("Error in user routing:", error);
            setError("Failed to update user data. Please try again.");
        }
    };

    // Helper function to create user from request data
    const createUserFromRequest = async (requestData, authenticatedUser) => {
        try {
            const newUserData = {
                uid: authenticatedUser.uid,
                phone: requestData.phone,
                email: requestData.email || null,
                role: requestData.role,
                isNew: true,
                isActive: true,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
            };

            // Create user document
            await setDoc(doc(db, "users", authenticatedUser.uid), newUserData);
            
            console.log("User document created successfully");
            return newUserData;
        } catch (error) {
            console.error("Error creating user document:", error);
            throw error;
        }
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!phone) {
            setError("Please enter a phone number");
            return;
        }
        if (phone.length !== 10) {
            setError("Please enter a valid phone number");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // Check if user exists and is active
            const usersQuery = query(collection(db, "users"), where("phone", "==", phone));
            const usersSnapshot = await getDocs(usersQuery);

            if (!usersSnapshot.empty) {
                const userData = usersSnapshot.docs[0].data();
                if (!userData.isActive) {
                    setError("Your account is not active. Please contact the admin.");
                    setLoading(false);
                    return;
                }
            } else {
                // Check if user exists in request collection
                const requestQuery = query(collection(db, "request"), where("phone", "==", phone));
                const requestSnapshot = await getDocs(requestQuery);
                if (requestSnapshot.empty) {
                    setError("User not found. Please contact support.");
                    setLoading(false);
                    return;
                }
            }

            if (!window.recaptchaVerifier) {
                setError("Verification system not initialized. Please refresh the page.");
                setLoading(false);
                return;
            }

            const formattedPhone = "+91" + phone;
            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
            setConfirmation(confirmationResult);
            console.log("OTP sent successfully");

        } catch (err) {
            console.error("Failed to send OTP:", err);
            setError(err.message || "Failed to send OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!otp) {
            setError("Please enter the OTP");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // Verify OTP and authenticate user
            const result = await confirmation.confirm(otp);
            const authenticatedUser = result.user;
            
            console.log("OTP verified, user authenticated:", authenticatedUser.uid);

            // Wait for auth state to propagate
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Check if user exists in users collection
            const usersQuery = query(collection(db, "users"), where("phone", "==", phone));
            const usersSnapshot = await getDocs(usersQuery);

            if (!usersSnapshot.empty) {
                // Existing user in users collection
                const userDoc = usersSnapshot.docs[0];
                const userData = userDoc.data();
                await handleUserRouting(userData, userDoc.id);
                return;
            }

            // User doesn't exist in users collection, check request collection
            const requestQuery = query(collection(db, "request"), where("phone", "==", phone));
            const requestSnapshot = await getDocs(requestQuery);

            if (!requestSnapshot.empty) {
                // User exists in request collection, create user document
                const requestData = requestSnapshot.docs[0].data();
                // const newUserData = await createUserFromRequest(requestData, authenticatedUser);
                await handleUserRouting(requestData);
                return;
            }

            setError("User data not found. Please contact support.");

        } catch (err) {
            console.error("OTP Verification Error:", err);
            
            if (err.code === 'auth/invalid-verification-code') {
                setError("Invalid OTP. Please try again.");
            } else if (err.code === 'permission-denied') {
                setError("Database permission denied. Please check your connection.");
            } else {
                setError("Verification failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };
    
    const handleEmailLogin = async (e) => {
        e.preventDefault();
    
        if (!email || !password) {
            setError("Please enter email and password");
            return;
        }
    
        setLoading(true);
        setError("");
    
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
    
            console.log("Email authentication successful:", user.uid);

            // Wait for auth state to propagate
            await new Promise(resolve => setTimeout(resolve, 1000));

            const q = query(collection(db, "users"), where("email", "==", email));
            const querySnapshot = await getDocs(q);
    
            if (querySnapshot.empty) {
                setError("User data not found in the database.");
                await auth.signOut();
                setLoading(false);
                return;
            }
    
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
    
            if (!userData.isActive) {
                setError("Your account is not active. Please contact the admin.");
                await auth.signOut();
                setLoading(false);
                return;
            }
            
            await handleUserRouting(userData, userDoc.id);
    
        } catch (err) {
            console.error("Email login error:", err.code, err.message);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError("Invalid email or password.");
            } else if (err.code === 'permission-denied') {
                setError("Database permission denied. Please check your connection.");
            } else {
                setError("Login failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setConfirmation(null);
        setOtp("");
        setError("");
        setPhone("");
        setEmail("");
        setPassword("");
    };

    return (
        <div>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl text-center font-bold text-blue-600">Login</CardTitle>
                    {error && <p className="text-red-500 mt-2 text-center">{error}</p>}
                </CardHeader>
                <CardContent>
                    {!confirmation ? (
                        <div className="space-y-4">
                            {loginMethod === 'phone' ? (
                                <>
                                    <form onSubmit={handleSendOtp} className="space-y-4">
                                        <div>
                                            <label className="block text-lg font-medium mb-1 text-gray-800">
                                                Phone Number
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Enter 10-digit phone number"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                                className="w-full p-2 border rounded text-md"
                                                maxLength={10}
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
                                    <Button
                                        variant="link"
                                        onClick={() => {
                                            setLoginMethod('email');
                                            resetForm();
                                        }}
                                        className="w-full"
                                        disabled={loading}
                                    >
                                        Login with Email
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <form onSubmit={handleEmailLogin} className="space-y-4">
                                        <div>
                                            <Label className="block text-lg font-medium mb-1 text-gray-800">Email</Label>
                                            <Input
                                                type="email"
                                                placeholder="Enter your email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full p-2 border rounded text-md"
                                                disabled={loading}
                                            />
                                        </div>
                                        <div>
                                            <Label className="block text-lg font-medium mb-1 text-gray-800">Password</Label>
                                            <Input
                                                type="password"
                                                placeholder="Enter your password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full p-2 border rounded text-md"
                                                disabled={loading}
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                                            disabled={loading}
                                        >
                                            {loading ? "Logging in..." : "Login"}
                                        </Button>
                                    </form>
                                    <Button
                                        variant="link"
                                        onClick={() => {
                                            setLoginMethod('phone');
                                            resetForm();
                                        }}
                                        className="w-full"
                                        disabled={loading}
                                    >
                                        Login with Phone
                                    </Button>
                                </>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <div>
                                <Label className="block text-sm font-medium mb-1">
                                    Enter OTP sent to +91{phone}
                                </Label>
                                <div className="m-5 ms-10">
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
                                onClick={resetForm}
                                className="w-full text-sm text-white bg-gray-500 hover:bg-gray-600"
                                disabled={loading}
                            >
                                Change Details
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>

            <div id="recaptcha-container"></div>
        </div>
    )
}