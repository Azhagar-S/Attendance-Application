'use client'

import React, { useState } from 'react'
import LoginForm from './login-form'

const login = () => {

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  return (
    // <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
    //   <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
    //     <h1 className="text-2xl font-bold text-center mb-6 text">
    //       Login with Phone
    //     </h1>

    //     {error && (
    //       <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
    //         {error}
    //       </div>
    //     )}

    //     {!confirmation ? (
    //       <form className="space-y-4">
    //         <div>
    //           <label className="block text-sm font-medium mb-1">
    //             Phone Number
    //           </label>
    //           <input
    //             type="text"
    //             placeholder="Enter 10-digit phone number"
    //             value={phone}
    //             onChange={(e) => setPhone(e.target.value)}
    //             className="w-full p-2 border rounded"
    //             maxLength={13}
    //             disabled={loading}
    //           />
    //         </div>
    //         <button
    //           type="submit"
    //           className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
    //           disabled={loading}
              
    //         >
    //           {loading ? "Sending..." : "Send OTP"}
    //         </button>
    //       </form>
    //     ) : (
    //       <form className="space-y-4">
    //         <div>
    //           <label className="block text-sm font-medium mb-1">
    //             Enter OTP
    //           </label>
    //           <input
    //             type="text"
    //             placeholder="Enter 6-digit OTP"
    //             value={otp}
    //             onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
    //             className="w-full p-2 border rounded"
    //             maxLength={6}
    //             disabled={loading}
    //           />
    //         </div>
    //         <button
    //           type="submit"
    //           className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
    //           disabled={loading}
    //         >
    //           {loading ? "Verifying..." : "Verify OTP"}
    //         </button>
    //         <button
    //           type="button"
    //           onClick={() => setConfirmation(null)}
    //           className="w-full text-sm text-gray-600 hover:text-gray-800"
    //           disabled={loading}
    //         >
    //           Change Phone Number
    //         </button>
    //       </form>
    //     )}

    //     {/* Hidden reCAPTCHA container */}
    //     <div id="recaptcha-container"></div>
    //   </div>
    // </div>

    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
           
           <div className="w-full max-w-sm">
            <LoginForm />
           </div>
    </div>
  )
}

export default login