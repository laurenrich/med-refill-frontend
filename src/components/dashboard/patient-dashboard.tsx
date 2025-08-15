import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, CheckCircle, AlertCircle, FileText, Loader2, Users, Heart, BookOpen } from "lucide-react"
import HistoryDialog from "@/components/history/history-dialog"

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

interface PatientDashboardProps {
  onNavigateToPatient?: (patientId: string) => void;
  onNavigateToHistory?: (filter?: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export function PatientDashboard({ onNavigateToPatient, onNavigateToHistory, onNavigateToTab }: PatientDashboardProps) {
  console.log("PatientDashboard component rendering");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [dialogType, setDialogType] = useState<"view" | "history" | null>(null);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    patientsAnalyzedToday: 0,
    prescriptionDecisions: 0,
    icdPredictions: 0,
    pendingReviews: 0
  });
  const [analytics, setAnalytics] = useState({
    approvedDecisions: 0,
    deniedDecisions: 0,
    pendingDecisions: 0,
    approvedPercentage: 0,
    deniedPercentage: 0,
    pendingPercentage: 0,
    todayDecisions: 0,
    finalizedPercentage: 0
  });

  // Calculate patient status counts using the same logic as batch processing




    const fetchDashboardData = async () => {
    console.log("=== fetchDashboardData called ===");
    console.log("API_BASE:", API_BASE);
    setLoading(true);
    setError(null);
      try {
        // Fetch recent history
        const historyRes = await fetch(`${API_BASE}/api/v1/history`, { credentials: "include" });
        if (!historyRes.ok) throw new Error("Failed to fetch history");
        const historyData = await historyRes.json();

        // Convert date objects to strings if they exist
        const processedHistory = historyData.map((item: any) => ({
          ...item,
          timestamp: item.timestamp 
            ? (typeof item.timestamp === 'object' 
                ? new Date(item.timestamp).toISOString()
                : item.timestamp)
            : item.timestamp
        }));

        // Sort history by timestamp 
        const sortedHistory = processedHistory.sort((a: any, b: any) => {
          const dateA = new Date(a.timestamp || 0);
          const dateB = new Date(b.timestamp || 0);
          return dateB.getTime() - dateA.getTime(); // Newest first
        });

        setRecentHistory(sortedHistory);

        // Calculate stats
        const today = new Date();
        const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayHistory = processedHistory.filter((item: any) => {
          if (!item.timestamp) return false;
          const itemDate = new Date(item.timestamp);
          const itemDateLocal = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
          return itemDateLocal.getTime() === todayLocal.getTime();
        });

        // Fetch patients data
        let totalPatients = 0;
        try {
          // Use the same endpoint as the patients page
          const endpoints = [
            `${API_BASE}/api/v1/patients`,
            `${API_BASE}/api/v1/patients/all`,
            `${API_BASE}/api/v1/patients/list`,
            `${API_BASE}/api/v1/patients/batch`
          ];
          
          let patientsData = null;
          let success = false;
          
          for (const endpoint of endpoints) {
            try {
              console.log("Trying endpoint:", endpoint);
              const patientsRes = await fetch(endpoint, { credentials: "include" });
              console.log("Response status:", patientsRes.status);
              
              if (patientsRes.ok) {
                patientsData = await patientsRes.json();
                console.log("Success with endpoint:", endpoint);
                console.log("Patients data received:", patientsData);
                success = true;
                break;
              } else {
                const errorText = await patientsRes.text();
                console.log("Failed with endpoint:", endpoint, "Error:", errorText);
              }
            } catch (err) {
              console.log("Error with endpoint:", endpoint, err);
            }
          }
          
          if (success && patientsData) {
            setPatients(Array.isArray(patientsData) ? patientsData : []);
            totalPatients = Array.isArray(patientsData) ? patientsData.length : 0;
            console.log("Total patients count:", totalPatients);
          } else {
            console.error("All patient endpoints failed");
            setPatients([]);
          }
        } catch (err) {
          console.error("Failed to fetch patients:", err);
          setPatients([]);
        }

        const prescriptionHistory = processedHistory.filter((item: any) => 
          item.action_type === "Prescription Refill"
        );

        const icdHistory = processedHistory.filter((item: any) => 
          item.action_type === "ICD Prediction"
        );

        const approvedDecisions = prescriptionHistory.filter((item: any) => {
          const status = item.status?.toLowerCase();
          return status === "approve" || status === "approved" || status?.includes("approved");
        });

        const deniedDecisions = prescriptionHistory.filter((item: any) => {
          const status = item.status?.toLowerCase();
          return status === "deny" || status === "denied" || status?.includes("denied");
        });

        const pendingDecisions = prescriptionHistory.filter((item: any) => {
          const status = item.status?.toLowerCase();
          return status === "escalate" || status === "pending" || status === "review required" || status?.includes("pending") || status?.includes("escalate");
        });

        // Calculate percentages for analytics
        const totalRefillDecisions = prescriptionHistory.length;
        const approvedPercentage = totalRefillDecisions > 0 ? Math.round((approvedDecisions.length / totalRefillDecisions) * 100) : 0;
        const deniedPercentage = totalRefillDecisions > 0 ? Math.round((deniedDecisions.length / totalRefillDecisions) * 100) : 0;
        const pendingPercentage = totalRefillDecisions > 0 ? Math.round((pendingDecisions.length / totalRefillDecisions) * 100) : 0;

        setStats({
          patientsAnalyzedToday: totalPatients || patients.length || 0,
          prescriptionDecisions: prescriptionHistory.length,
          icdPredictions: icdHistory.length,
          pendingReviews: pendingDecisions.length
        });

        // Calculate finalized percentage as the opposite of escalation rate
        const finalizedPercentage = 100 - pendingPercentage;
        


        console.log("New analytics values:", {
          pendingPercentage,
          finalizedPercentage,
          approvedPercentage,
          deniedPercentage,
          totalRefillDecisions,
          approvedDecisions: approvedDecisions.length,
          deniedDecisions: deniedDecisions.length,
          pendingDecisions: pendingDecisions.length
        });

        setAnalytics({
          approvedDecisions: approvedDecisions.length,
          deniedDecisions: deniedDecisions.length,
          pendingDecisions: pendingDecisions.length,
          approvedPercentage: approvedPercentage,
          deniedPercentage: deniedPercentage,
          pendingPercentage: pendingPercentage,
          todayDecisions: todayHistory.length,
          finalizedPercentage: finalizedPercentage
        });
        


      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    console.log("Dashboard component mounted, calling fetchDashboardData");
    fetchDashboardData();
    
    // Add a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log("Dashboard fetch timeout - forcing loading to false");
      setLoading(false);
    }, 10000); // 10 second timeout
    
    return () => clearTimeout(timeout);
  }, []);

  // Listen for global history and patient updates
  useEffect(() => {
    const handleHistoryUpdate = () => {
      fetchDashboardData();
    };

    const handlePatientUpdate = () => {
      fetchDashboardData();
    };

    window.addEventListener('historyUpdated', handleHistoryUpdate);
    window.addEventListener('patientUpdated', handlePatientUpdate);
    return () => {
      window.removeEventListener('historyUpdated', handleHistoryUpdate);
      window.removeEventListener('patientUpdated', handlePatientUpdate);
    };
  }, []);

  if (loading) {
    console.log("Dashboard is in loading state");
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error loading dashboard: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Top Stats Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
        <Card 
          className="group border-0 bg-gradient-to-br from-gray-50 to-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.1)] hover:scale-105 transition-all duration-500 cursor-pointer rounded-2xl overflow-hidden"
          onClick={() => onNavigateToTab && onNavigateToTab("patients")}
        >
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:shadow-md transition-all duration-500">
                <Users className="h-6 w-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.patientsAnalyzedToday}</div>
                <div className="text-sm font-medium text-gray-600">Total Patients</div>
              </div>
            </div>
          </div>
        </Card>

        <Card 
          className="group border-0 bg-gradient-to-br from-gray-50 to-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.1)] hover:scale-105 transition-all duration-500 cursor-pointer rounded-2xl overflow-hidden"
          onClick={() => onNavigateToHistory?.("refill")}
        >
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:shadow-md transition-all duration-500">
                <Heart className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.prescriptionDecisions}</div>
                <div className="text-sm font-medium text-green-600">Refill Decisions</div>
              </div>
            </div>
          </div>
        </Card>

        <Card 
          className="group border-0 bg-gradient-to-br from-gray-50 to-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.1)] hover:scale-105 transition-all duration-500 cursor-pointer rounded-2xl overflow-hidden"
          onClick={() => onNavigateToHistory?.("icd")}
        >
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:shadow-md transition-all duration-500">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.icdPredictions}</div>
                <div className="text-sm font-medium text-blue-600">ICD Predictions</div>
              </div>
            </div>
          </div>
        </Card>
        
        <Card 
          className="group border-0 bg-gradient-to-br from-gray-50 to-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.1)] hover:scale-105 transition-all duration-500 cursor-pointer rounded-2xl overflow-hidden"
          onClick={() => onNavigateToHistory?.("pending")}
        >
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:shadow-md transition-all duration-500">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.pendingReviews}</div>
                <div className="text-sm font-medium text-yellow-600">Pending Reviews</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

            {/* Main Content Area - Two Column Layout */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-3 gap-4">
          {/* Recent Activity - Takes 2/3 of the space */}
          <Card className="col-span-2 border-0 bg-gray-50 shadow-[0_2px_4px_rgba(0,0,0,0.05)] rounded-xl">
          <CardHeader>
            <CardTitle className="text-gray-900">Recent Activity</CardTitle>
            <CardDescription className="text-gray-500">Your most recent decisions and predictions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentHistory.slice(0, 4).map((h: any, index: number) => {
                const getRelativeDate = (timestamp: string) => {
                  if (!timestamp) return "Unknown";
                  
                  const itemDate = new Date(timestamp);
                  const today = new Date();
                  
                  // Check if the date is valid
                  if (isNaN(itemDate.getTime())) {
                    return "Invalid Date";
                  }
                  
                  // Get dates in local timezone for comparison
                  const itemDateLocal = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
                  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  const yesterdayLocal = new Date(todayLocal);
                  yesterdayLocal.setDate(yesterdayLocal.getDate() - 1);
                  
                  if (itemDateLocal.getTime() === todayLocal.getTime()) {
                    return "Today";
                  } else if (itemDateLocal.getTime() === yesterdayLocal.getTime()) {
                    return "Yesterday";
                  } else {
                    // Calculate days ago
                    const timeDiff = todayLocal.getTime() - itemDateLocal.getTime();
                    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
                    
                    if (daysDiff === 1) {
                      return "Yesterday";
                    } else if (daysDiff > 1 && daysDiff <= 7) {
                      return `${daysDiff} days ago`;
                    } else {
                      return itemDate.toLocaleDateString();
                    }
                  }
                };
                
                const date = getRelativeDate(h.timestamp);
                const status = h.status?.toLowerCase();
                
                return (
                  <div
                    key={`${h.patient_id}-${h.action_type}-${index}`}
                    className="p-3 rounded-xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.1)] hover:bg-gray-50 transition-all duration-200 cursor-pointer"
                    onClick={() => { 
                      setSelectedPatient(h);
                      setDialogType("view"); 
                    }}
                  >
                    <div className="flex items-center justify-between">
                      {/* Left: Time and Icon */}
                      <div className="flex items-center gap-3">
                        {/* Date */}
                        <div className="text-sm text-gray-500 font-medium min-w-[80px] text-center">
                          {date}
                        </div>
                        
                        {/* Icon */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          {(() => {
                            if (h.action_type === "ICD Prediction") {
                              return <FileText className="h-4 w-4 text-blue-600" />;
                            } else if (status === "approved" || status === "approve" || status?.includes("approved")) {
                              return <CheckCircle className="h-4 w-4 text-green-600" />;
                            } else if (status === "denied" || status === "deny" || status?.includes("denied")) {
                              return <AlertCircle className="h-4 w-4 text-red-600" />;
                            } else if (status === "escalated" || status === "escalate" || status === "pending") {
                              return <Clock className="h-4 w-4 text-yellow-600" />;
                            } else {
                              return <FileText className="h-4 w-4 text-blue-600" />;
                            }
                          })()}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-600 mb-1">
                            {h.action_type}
                          </div>
                          
                          <div className="text-sm text-gray-700">
                            Patient {h.patient_id} • {h.action_type === "ICD Prediction" ? (h.icd_codes || "No ICD codes") : h.medication}
                          </div>
                        </div>
                      </div>
                      
                      {/* Right: Status Badge */}
                      <div className="flex-shrink-0">
                        {(() => {
                          if (h.action_type === "ICD Prediction") {
                            return (
                              <span className="bg-blue-100 text-blue-800 flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium">
                                <FileText className="h-3 w-3" />
                                Found
                              </span>
                            );
                          } else if (status === "approved" || status === "approve" || status?.includes("approved")) {
                            return (
                              <span className="bg-green-100 text-green-800 flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium">
                                <CheckCircle className="h-3 w-3" />
                                Approved
                              </span>
                            );
                          } else if (status === "denied" || status === "deny" || status?.includes("denied")) {
                            return (
                              <span className="bg-red-100 text-red-800 flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium">
                                <AlertCircle className="h-3 w-3" />
                                Denied
                              </span>
                            );
                          } else if (status === "escalated" || status === "escalate" || status === "pending") {
                            return (
                              <span className="bg-yellow-100 text-yellow-800 flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium">
                                <Clock className="h-3 w-3" />
                                Pending
                              </span>
                            );
                          } else {
                            return (
                              <span className="bg-blue-100 text-blue-800 flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium">
                                <FileText className="h-3 w-3" />
                                {h.status ? h.status.charAt(0).toUpperCase() + h.status.slice(1) : "Processed"}
                              </span>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Decision Analytics */}
        <Card className="w-full border-0 bg-gray-50 shadow-[0_2px_4px_rgba(0,0,0,0.05)] rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-gray-900">Decision Analytics</CardTitle>
            <CardDescription className="text-gray-500">AI decision performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4 pt-8">
              {/* Large Decision Wheel - Centered */}
              <div className="flex justify-center group">
                <div className="relative">
                  <div className="w-28 h-28 rounded-full flex items-center justify-center group-hover:scale-125 transition-all duration-700 ease-out">
                    <svg className="w-28 h-28 transform -rotate-90 group-hover:rotate-0 transition-all duration-1000 ease-out group-hover:scale-110" viewBox="0 0 100 100">
                      {/* Approved - Green */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="8"
                        strokeDasharray={`${(analytics.approvedPercentage / 100) * 251.2} 251.2`}
                        className="transition-all duration-1000 ease-out group-hover:stroke-[12] group-hover:drop-shadow-lg"
                        style={{
                          filter: 'drop-shadow(0 0 0 rgba(16, 185, 129, 0))',
                          transition: 'all 0.7s ease-out'
                        }}
                      />
                      {/* Denied - Red */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="8"
                        strokeDasharray={`${(analytics.deniedPercentage / 100) * 251.2} 251.2`}
                        strokeDashoffset={`-${(analytics.approvedPercentage / 100) * 251.2}`}
                        className="transition-all duration-1000 ease-out group-hover:stroke-[12] group-hover:drop-shadow-lg"
                        style={{
                          filter: 'drop-shadow(0 0 0 rgba(239, 68, 68, 0))',
                          transition: 'all 0.7s ease-out'
                        }}
                      />
                      {/* Pending - Yellow */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="8"
                        strokeDasharray={`${(analytics.pendingPercentage / 100) * 251.2} 251.2`}
                        strokeDashoffset={`-${((analytics.approvedPercentage + analytics.deniedPercentage) / 100) * 251.2}`}
                        className="transition-all duration-1000 ease-out group-hover:stroke-[12] group-hover:drop-shadow-lg"
                        style={{
                          filter: 'drop-shadow(0 0 0 rgba(245, 158, 11, 0))',
                          transition: 'all 0.7s ease-out'
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center group-hover:scale-110 transition-all duration-300 ease-out">
                      <div className="text-center">
                        <div className="text-xl font-bold text-gray-900 group-hover:text-lg transition-all duration-300">{analytics.finalizedPercentage}%</div>
                        <div className="text-xs text-gray-500 group-hover:text-xs transition-all duration-300">Finalized</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decision Breakdown - Three Stats in a Row */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {/* Approved */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium text-gray-700">Approved</span>
                  </div>
                  <div className="text-lg font-bold text-green-600">{analytics.approvedPercentage}%</div>
                  <div className="text-xs text-gray-500">{analytics.approvedDecisions} {analytics.approvedDecisions === 1 ? 'decision' : 'decisions'}</div>
                </div>

                {/* Denied */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm font-medium text-gray-700">Denied</span>
                  </div>
                  <div className="text-lg font-bold text-red-600">{analytics.deniedPercentage}%</div>
                  <div className="text-xs text-gray-500">{analytics.deniedDecisions} {analytics.deniedDecisions === 1 ? 'decision' : 'decisions'}</div>
                </div>

                {/* Pending */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-sm font-medium text-gray-700">Pending</span>
                  </div>
                  <div className="text-lg font-bold text-yellow-600">{analytics.pendingPercentage}%</div>
                  <div className="text-xs text-gray-500">{analytics.pendingDecisions} {analytics.pendingDecisions === 1 ? 'decision' : 'decisions'}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
      
      {/* History Dialog */}
      <Dialog open={!!selectedPatient && dialogType === "view"} onOpenChange={() => { setSelectedPatient(null); setDialogType(null); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Decision Details</DialogTitle>
          </DialogHeader>
          <HistoryDialog 
            selectedDecision={selectedPatient} 
            setSelectedDecision={setSelectedPatient} 
            onHistoryUpdate={fetchDashboardData}
            onNavigateToPatient={onNavigateToPatient}
            showPatientButton={false}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
