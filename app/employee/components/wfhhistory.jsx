import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table'
import { format } from 'date-fns'
import { db } from '@/app/firebase/config'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { auth } from '@/app/firebase/config'

const WfhHistory = () => {

    const [wfhRequests, setWfhRequests] = useState([]);

    useEffect(() => {
        const fetchWfhRequests = async () => {
            const user = auth.currentUser;
            const phone = user.phoneNumber.slice(3);
            const userQuery = query(collection(db, "users"), where("phone", "==", phone));
            const userSnapshot = await getDocs(userQuery);
            const userData = userSnapshot.docs[0].data();
            const adminuid = userData.adminuid;
            const wfhRequests = await getDocs(collection(db, "wfh_requests"), where("adminuid", "==", adminuid));

            if(wfhRequests.empty){
              console.log("No WFH Requests Found");
              return;
            }

            const fetchedRequests = wfhRequests.docs.map(doc => {
                const data = doc.data();
                const startDate = data.startDate;
                const endDate = data.endDate;
                const createdAt = data.createdAt.toDate();

                console.log(startDate,"startDate");
                console.log(endDate,"endDate"); 
                console.log(createdAt,"createdAt");
                const now = new Date();
                return {
                    id: doc.id,
                    ...data,
                    startDate: startDate ? format(startDate, "dd/MM/yy") : 'N/A',
                    endDate: endDate ? format(endDate, "dd/MM/yy") : 'N/A',
                    createdAt: createdAt ? format(createdAt, "dd/MM/yy") : 'N/A'
                }
            });
            setWfhRequests(fetchedRequests);
            console.log(fetchedRequests,"fetchedRequests");
          };
        fetchWfhRequests();
    }, []);
     

    console.log(wfhRequests,"wfhRequests");

 

return (
    <div>
        <Card>
            <CardHeader>
                <CardTitle>WFH History</CardTitle>
                <CardDescription>
                    <p>Work from Home request history</p>
                </CardDescription>
            </CardHeader>

            <CardContent>
            <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">Created At</TableHead>
              <TableHead className="min-w-[100px]">Duration</TableHead>
              <TableHead className="min-w-[100px]">Reason</TableHead>
              <TableHead className="min-w-[120px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>

            {wfhRequests.map((req, index) => (
              <TableRow key={req.id || index}>
                <TableCell>{req.createdAt}</TableCell>
                <TableCell>{req.startDate} - {req.endDate}</TableCell>
                <TableCell>{req.reason}</TableCell>
                <TableCell>{req.status}</TableCell> 
              </TableRow>
            ))}
          </TableBody>
        </Table>
            </CardContent>
        </Card>
       
        
    </div>
  )
}

export default WfhHistory