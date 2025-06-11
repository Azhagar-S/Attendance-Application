"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/app/firebase/config';
import { Loader2 } from 'lucide-react';

export default function MemberPanelLayout({ children }) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthValid, setIsAuthValid] = useState(false); 

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthValid(true);
      } else {
        setIsAuthValid(false);
      }
    });

    setIsMounted(true);
  }, [auth]);
  
  if (!isMounted) { 
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {children}
       <footer className="text-center text-sm text-slate-500 py-6">
            Attendance Portal &copy; {new Date().getFullYear()}
        </footer>
    </div>
  );
}