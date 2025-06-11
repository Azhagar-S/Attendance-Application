'use client'
import React from 'react'
import {useEffect} from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/app/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { useState } from 'react'

const page = () => {
  const router = useRouter()
  const [user, setUser] = useState(null)
  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log(currentUser)
      if (!currentUser) {
       return router.push('/superadmin/auth')
      }
      else{
        setUser(currentUser)
       return router.push('/superadmin/dashboard')
      }
    })


    const fetchAdminUsers = async () => {
      const adminUsersRef = collection(db, "users");
      const q = query(adminUsersRef, where("email", "==", user.email));
      const querySnapshot = await getDocs(q);
      const adminUsers = querySnapshot.docs.map((doc) => doc.data());
      setAdminUsers(adminUsers);
    };
  
    return () => unsubscribe();
  }, [auth])


  
  return (
    <div>...Loading</div>
  )
}

export default page