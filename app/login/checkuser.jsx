import React from 'react'
import page from '../member/createacc/page'
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
const checkuser = async () => {


    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState('login'); 


    // Check if phone exists in "request" collection
    const requestDoc = await getDoc(doc(db, 'request', phoneNumber));
    if (!requestDoc.exists()) {
      alert("You are not authorized, please contact admin.");
      setLoading(false);
      return;
    }


    const memberDoc = await getDoc(doc(db, 'members', phoneNumber));
    if (memberDoc.exists()) {
      // Member exists -> attendance page
      setPage('/member/attendancepage');
    } else {
      // Member does not exist -> create account page
      setPage('/member/createacc');
    }
    

    
  return (
    <div>
        
    </div>
  )
}

export default checkuser