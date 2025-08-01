import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, Clock, CheckCircle, AlertCircle, FileText, Loader2, Users, Heart, BookOpen } from "lucide-react"
import HistoryDialog from "@/components/history/history-dialog"

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

interface PatientDashboardProps {
  onNavigateToPatient?: (patientId: string) => void;
  onNavigateToHistory?: (filter?: string) => void;
}

export function PatientDashboard({ onNavigateToPatient, onNavigateToHistory }: PatientDashboardProps) {
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [dialogType, setDialogType] = useState<"view" | "history" | null>(null);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
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

    const fetchDashboardData = async () => {
    console.log("Fetching dashboard data...");
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
                ? item.timestamp.toISOString().split('T')[0]
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
        const today = new Date().toISOString().split('T')[0];
        const todayHistory = processedHistory.filter((item: any) => 
          item.timestamp && new Date(item.timestamp).toISOString().split('T')[0] === today
        );

        // Fetch total patients count
        let totalPatients = 0;
        try {
          const patientsRes = await fetch(`${API_BASE}/api/v1/patients`, { credentials: "include" });
          if (patientsRes.ok) {
            const patients = await patientsRes.json();
            totalPatients = Array.isArray(patients) ? patients.length : 0;
          }
        } catch (err) {
          console.error("Failed to fetch total patients:", err);
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
          patientsAnalyzedToday: totalPatients,
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
    fetchDashboardData();
  }, []);

  // Listen for global history updates
  useEffect(() => {
    const handleHistoryUpdate = () => {
      fetchDashboardData();
    };

    window.addEventListener('historyUpdated', handleHistoryUpdate);
    return () => {
      window.removeEventListener('historyUpdated', handleHistoryUpdate);
    };
  }, []);

  if (loading) {
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
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onNavigateToHistory?.("all")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.patientsAnalyzedToday}</div>
            <p className="text-xs text-gray-500">All patients in database</p>
          </CardContent>
        </Card>
        <Card 
          className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onNavigateToHistory?.("refill")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Refill Decisions</CardTitle>
            <Heart className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.prescriptionDecisions}</div>
            <p className="text-xs text-gray-500">Total decisions made</p>
          </CardContent>
        </Card>
        <Card 
          className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onNavigateToHistory?.("icd")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">ICD Predictions</CardTitle>
            <BookOpen className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.icdPredictions}</div>
            <p className="text-xs text-gray-500">Total predictions made</p>
          </CardContent>
        </Card>
        <Card 
          className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onNavigateToHistory?.("pending")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.pendingReviews}</div>
            <p className="text-xs text-gray-500">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Recent Activity</CardTitle>
            <CardDescription className="text-gray-500">Your 5 most recent decisions and predictions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              

              <div className="rounded-md border border-gray-200">
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 transition-colors">
                        <th className="h-10 px-4 text-left font-medium text-gray-600 whitespace-nowrap">Patient ID</th>
                        <th className="h-10 px-4 text-left font-medium text-gray-600">Action Type</th>
                        <th className="h-10 px-4 text-left font-medium text-gray-600">Status</th>
                        <th className="h-10 px-4 text-left font-medium text-gray-600">Date</th>
                        <th className="h-10 px-4 text-left font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentHistory.slice(0, 5).map((item, index) => {
                        const getRelativeDate = (timestamp: string) => {
                          if (!timestamp) return "Unknown";
                          
                          const itemDate = new Date(timestamp);
                          const today = new Date();
                          const yesterday = new Date(today);
                          yesterday.setDate(yesterday.getDate() - 1);
                          
                          // Reset time to compare just dates
                          const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
                          const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                          const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
                          
                          if (itemDateOnly.getTime() === todayOnly.getTime()) {
                            return "Today";
                          } else if (itemDateOnly.getTime() === yesterdayOnly.getTime()) {
                            return "Yesterday";
                          } else {
                            // Calculate days ago
                            const timeDiff = todayOnly.getTime() - itemDateOnly.getTime();
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
                        
                        const date = getRelativeDate(item.timestamp);
                        
                        return (
                          <tr key={`${item.patient_id}-${item.action_type}-${index}`} className="border-b transition-colors">
                            <td className="p-4 align-middle font-medium">{item.patient_id}</td>
                            <td className="p-4 align-middle">{item.action_type}</td>
                            <td className="p-4 align-middle">
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const status = item.status?.toLowerCase();
                                  if (status === "approved" || status === "approve" || status.includes("approved")) {
                                    return <CheckCircle className="h-4 w-4 text-green-500" />;
                                  } else if (status === "denied" || status === "deny" || status.includes("denied")) {
                                    return <AlertCircle className="h-4 w-4 text-red-500" />;
                                  } else if (status === "escalated" || status === "escalate" || status === "pending") {
                                    return <Clock className="h-4 w-4 text-yellow-500" />;
                                  } else {
                                    return <FileText className="h-4 w-4 text-blue-500" />;
                                  }
                                })()}
                                {(() => {
                                  const status = item.status?.toLowerCase();
                                  if (status === "approve") return "Approved";
                                  if (status === "deny") return "Denied";
                                  if (status === "escalate") return "Pending";
                                  return item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : "";
                                })()}
                              </div>
                            </td>
                            <td className="p-4 align-middle">{date}</td>
                            <td className="p-4 align-middle">
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => { 
                                  setSelectedPatient(item);
                                  setDialogType("view"); 
                                }}>
                                  <ArrowUpRight className="mr-2 h-4 w-4" />
                                  View
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3 border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Decision Analytics</CardTitle>
            <CardDescription className="text-gray-500">AI decision performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Decisions Finalized</div>
                    <div className="text-2xl font-bold">{analytics.finalizedPercentage}%</div>
                    <div className="text-xs text-muted-foreground">Total finalized decisions</div>
                    <div className="h-4 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${analytics.finalizedPercentage}%` }}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Escalation Rate</div>
                    <div className="text-2xl font-bold">{analytics.pendingPercentage}%</div>
                    <div className="text-xs text-muted-foreground">Require human review</div>
                    <div className="h-4 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-yellow-500" style={{ width: `${analytics.pendingPercentage}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="pt-4">
                  <div className="text-sm font-medium mb-2">Decision Distribution</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">Approved</div>
                      <div className="text-sm font-medium">{analytics.approvedPercentage}%</div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${analytics.approvedPercentage}%` }}></div>
                    </div>
                  </div>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">Denied</div>
                      <div className="text-sm font-medium">{analytics.deniedPercentage}%</div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: `${analytics.deniedPercentage}%` }}></div>
                    </div>
                  </div>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">Pending Review</div>
                      <div className="text-sm font-medium">{analytics.pendingPercentage}%</div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-yellow-500" style={{ width: `${analytics.pendingPercentage}%` }}></div>
                    </div>
                  </div>
                </div>
          </CardContent>
        </Card>
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
