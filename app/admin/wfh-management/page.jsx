'use client'
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Calendar, 
  MapPin, 
  Phone, 
  FileText, 
  Filter,
  Search,
  Eye,
  Download,
  MoreHorizontal,
  Building2,
  Mail,
  X
} from 'lucide-react';
import { db } from '@/app/firebase/config';
import { collection, query, getDocs, where, doc, updateDoc } from 'firebase/firestore';
import { auth } from '@/app/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { constructFrom } from 'date-fns';




const AdminWFHRequests = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setLoading(true);
        try {
          const phone = user.phoneNumber.slice(3);
          const userQuery = query(collection(db, "users"), where("phone", "==", phone));
          const userSnapshot = await getDocs(userQuery);

          if (!userSnapshot.empty) {
            const adminUid = userSnapshot.docs[0].id;
            
            const requestsQuery = query(collection(db, "wfh_requests"), where("adminuid", "==", adminUid));
            const requestsSnapshot = await getDocs(requestsQuery);
            
            const fetchedRequests = requestsSnapshot.docs.map(doc => {
              const data = doc.data();
              console.log(data,"data");

              const sDate = data.startDate;
              console.log(sDate,"sDate");
              return {
                id: doc.id,
                ...data,
                startDate: data.startDate,
                endDate: data.endDate,
                submittedAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
              }
            });
            
            setRequests(fetchedRequests);
            
          } else {
            console.error("Admin user not found.");
            setRequests([]);
          }
        } catch (error) {
          console.error('Error fetching WFH requests:', error);
          setRequests([]);
        } finally {
          setLoading(false);
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);



  console.log(requests,"requests");
  
  // Filter and search functionality
  useEffect(() => {
    let filtered = requests;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(request => request.status === filterStatus);
    }

    // Search by employee name or email
    if (searchTerm) {
      filtered = filtered.filter(request => 
        (request.employeeName && request.employeeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (request.employeeEmail && request.employeeEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (request.department && request.department.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredRequests(filtered);
  }, [requests, filterStatus, searchTerm]);

  const handleApprove = async (requestId) => {
    try {
      const requestRef = doc(db, "wfh_requests", requestId);
      await updateDoc(requestRef, {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        adminNotes: 'Approved by admin'
      });

      const updatedRequests = requests.map(request => 
        request.id === requestId 
          ? { 
              ...request, 
              status: 'approved', 
              approvedAt: new Date().toISOString(),
              adminNotes: 'Approved by admin'
            }
          : request
      );
      
      setRequests(updatedRequests);
      console.log('Approved request:', requestId);
      
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleReject = async (requestId, adminNotes = '') => {
    try {
      const requestRef = doc(db, "wfh_requests", requestId);
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        adminNotes: adminNotes || 'Rejected by admin'
      });

      const updatedRequests = requests.map(request => 
        request.id === requestId 
          ? { 
              ...request, 
              status: 'rejected', 
              rejectedAt: new Date().toISOString(),
              adminNotes: adminNotes || 'Rejected by admin'
            }
          : request
      );
      
      setRequests(updatedRequests);
      console.log('Rejected request:', requestId);
      
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Employee Name', 'Email', 'Department', 'Request Type', 'Start Date', 'End Date', 'Status', 'Submitted Date'],
      ...filteredRequests.map(request => [
        request.employeeName,
        request.employeeEmail,
        request.department,
        request.requestType,
        request.startDate,
        request.endDate,
        request.status,
        formatDate(request.submittedAt)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wfh_requests.csv';
    a.click();
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const StatusBadge = ({ status }) => {
    const statusConfig = {
      pending: { 
        bgColor: 'bg-yellow-50 border-yellow-200 text-yellow-800', 
        icon: Clock,
        dotColor: 'bg-yellow-400'
      },
      approved: { 
        bgColor: 'bg-green-50 border-green-200 text-green-800', 
        icon: CheckCircle,
        dotColor: 'bg-green-400'
      },
      rejected: { 
        bgColor: 'bg-red-50 border-red-200 text-red-800', 
        icon: XCircle,
        dotColor: 'bg-red-400'
      }
    };

    const config = statusConfig[status?.toLowerCase() || 'pending'];
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${config.bgColor}`}>
        <div className={`w-2 h-2 rounded-full ${config.dotColor}`}></div>
        <Icon size={14} />
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading WFH requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-gray-900">
                Work From Home Requests
              </h1>
              <p className="text-base sm:text-lg text-gray-600 mt-2">
                Manage and review employee WFH requests efficiently
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportToCSV}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm sm:text-base"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search by employee name, email, or department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50 text-sm sm:text-base"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="flex-1 sm:flex-none px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm sm:text-base"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{requests.length}</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">All time submissions</p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl sm:text-3xl font-bold text-yellow-600 mt-1 sm:mt-2">
                    {requests.filter(r => r.status === 'pending').length}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">Awaiting review</p>
                </div>
                <div className="p-2 sm:p-3 bg-yellow-50 rounded-lg">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1 sm:mt-2">
                    {requests.filter(r => r.status === 'approved').length}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">Successfully approved</p>
                </div>
                <div className="p-2 sm:p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-2xl sm:text-3xl font-bold text-red-600 mt-1 sm:mt-2">
                    {requests.filter(r => r.status === 'rejected').length}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">Not approved</p>
                </div>
                <div className="p-2 sm:p-3 bg-red-50 rounded-lg">
                  <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Requests Table - Mobile Responsive */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Requests</h3>
            <p className="text-sm text-gray-600 mt-1">A list of all work from home requests and their current status</p>
          </div>
          
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Employee</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Request Details</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Duration</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {getInitials(request.employeeName)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{request.employeeName}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <Mail className="h-3 w-3" />
                            {request.employeeEmail}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Building2 className="h-3 w-3" />
                            {request.department}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="font-medium text-gray-900 capitalize">
                          {request.requestType} WFH
                        </div>
                        <div className="text-sm text-gray-600 line-clamp-2 max-w-xs">
                          {request.reason}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {request.workLocation.split(',')[0]}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(request.startDate)}
                        </div>
                        <div className="text-sm text-gray-600">
                          to {formatDate(request.endDate)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Submitted: {formatDate(request.submittedAt)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {request.status?.toLowerCase() === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(request.id)}
                              className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden">
            <div className="divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <div key={request.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {getInitials(request.employeeName)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{request.employeeName}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                          <Mail className="h-3 w-3" />
                          {request.employeeEmail}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="font-medium text-gray-900 capitalize text-sm">
                      {request.requestType} WFH
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-2">
                      {request.reason}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {request.workLocation.split(',')[0]}
                    </div>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(request.startDate)} - {formatDate(request.endDate)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Submitted: {formatDate(request.submittedAt)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowModal(true);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    
                    {request.status?.toLowerCase() === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                          title="Approve"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Request Details Modal - Mobile Responsive */}
        {showModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">WFH Request Details</h3>
                    <p className="text-sm text-gray-600 mt-1 truncate">
                      Complete information for {selectedRequest.employeeName}'s work from home request
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-2"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-140px)] sm:max-h-[calc(90vh-140px)]">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Employee Information</h4>
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {getInitials(selectedRequest.employeeName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 truncate">{selectedRequest.employeeName}</div>
                          <div className="text-sm text-gray-600 truncate">{selectedRequest.employeeEmail}</div>
                          <div className="text-xs text-gray-500 truncate">{selectedRequest.department}</div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Current Status</h4>
                      <StatusBadge status={selectedRequest.status} />
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Reason for Request</h4>
                      <p className="text-gray-700 bg-gray-50 p-4 rounded-lg text-sm">{selectedRequest.reason}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Work Location</h4>
                      <p className="text-gray-700 flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
                        <span className="break-words">{selectedRequest.workLocation}</span>
                      </p>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Emergency Contact</h4>
                      <div className="text-gray-700">
                        <p className="font-medium text-sm">{selectedRequest.emergencyContact}</p>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {selectedRequest.emergencyPhone}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Equipment Needed</h4>
                      <p className="text-gray-700 text-sm">{selectedRequest.equipmentNeeded}</p>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Internet Speed</h4>
                      <p className="text-gray-700 text-sm">{selectedRequest.internetSpeed}</p>
                    </div>
                  </div>
                  
                  {selectedRequest.additionalNotes && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Additional Notes</h4>
                      <p className="text-gray-700 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400 text-sm">{selectedRequest.additionalNotes}</p>
                    </div>
                  )}
                  
                  {selectedRequest.adminNotes && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Admin Notes</h4>
                      <p className="text-gray-700 bg-gray-100 p-4 rounded-lg border-l-4 border-gray-400 text-sm">{selectedRequest.adminNotes}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedRequest.status === 'pending' && (
                <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => {
                        handleApprove(selectedRequest.id);
                        setShowModal(false);
                      }}
                      className="flex-1 px-4 sm:px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Approve Request</span>
                      <span className="sm:hidden">Approve</span>
                    </button>
                    <button 
                      onClick={() => {
                        handleReject(selectedRequest.id);
                        setShowModal(false);
                      }}
                      className="flex-1 px-4 sm:px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <XCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Reject Request</span>
                      <span className="sm:hidden">Reject</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWFHRequests;