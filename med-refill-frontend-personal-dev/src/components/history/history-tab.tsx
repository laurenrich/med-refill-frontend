import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Clock, FileText } from "lucide-react";
import HistoryDialog from "@/components/history/history-dialog";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

interface PatientHistoryProps {
  patientId?: string;
  onNavigateToPatient?: (patientId: string) => void;
  activeTab?: string;
  initialFilter?: string | null;
  onFilterChange?: (filter: string | null) => void;
  onHistoryUpdate?: () => void;
  showPatientButton?: boolean;
}

export function PatientHistory({ patientId, onNavigateToPatient, activeTab, initialFilter, onFilterChange, onHistoryUpdate, showPatientButton }: PatientHistoryProps) {

  const [history, setHistory] = useState<any[]>([]);
  
  // Use ref to persist dialog state across re-renders
  const dialogStateRef = useRef<{
    selected: any;
    primaryFilter: string;
    secondaryFilter: string;
  }>({
    selected: null,
    primaryFilter: "all",
    secondaryFilter: "all"
  });

  const [selected, setSelected] = useState<any>(dialogStateRef.current.selected);
  const [primaryFilter, setPrimaryFilter] = useState<string>(dialogStateRef.current.primaryFilter);
  const [secondaryFilter, setSecondaryFilter] = useState<string>(dialogStateRef.current.secondaryFilter);

  // Update ref when state changes
  const updateSelected = (newSelected: any) => {
    setSelected(newSelected);
    dialogStateRef.current.selected = newSelected;
  };

  const updatePrimaryFilter = (newFilter: string) => {
    setPrimaryFilter(newFilter);
    dialogStateRef.current.primaryFilter = newFilter;
  };

  const updateSecondaryFilter = (newFilter: string) => {
    setSecondaryFilter(newFilter);
    dialogStateRef.current.secondaryFilter = newFilter;
  };

  const refreshHistory = () => {
    const url = `${API_BASE}/api/v1/history${patientId ? `?patient_id=${patientId}` : ""}`;
    fetch(url, { credentials: "include" })
              .then(res => {
          return res.json();
        })
        .then(data => {
          let processedData = Array.isArray(data) ? data : [];
          
          if (patientId) {
            processedData = processedData.filter(item => item.patient_id === patientId);
          }
          
          // Sort by timestamp with most recent first
          processedData.sort((a: any, b: any) => {
            const dateA = new Date(a.timestamp || 0);
            const dateB = new Date(b.timestamp || 0);
            return dateB.getTime() - dateA.getTime(); // Newest first
          });
          
          setHistory(processedData);
        })
      .catch(error => {
        console.error("Error fetching history:", error);
        setHistory([]);
      });
  };

  useEffect(() => {
    refreshHistory();
  }, [patientId]);

  // Listen for global history updates
  useEffect(() => {
    const handleHistoryUpdate = () => {
      refreshHistory();
    };

    window.addEventListener('historyUpdated', handleHistoryUpdate);
    return () => {
      window.removeEventListener('historyUpdated', handleHistoryUpdate);
    };
  }, []);

  // Update selected item when history data changes
  useEffect(() => {
    if (selected && history.length > 0) {
      // Find the updated version of the selected item
      const updatedSelected = history.find(item => item.id === selected.id);
      if (updatedSelected) {
        updateSelected(updatedSelected);
      }
    }
  }, [history]);

  // Handle initial filter from dashboard navigation
  useEffect(() => {
    if (initialFilter && activeTab === "history") {
      if (initialFilter === "pending") {
        // Set primary filter to "Prescription Refill" for pending reviews
        updatePrimaryFilter("Prescription Refill");
        updateSecondaryFilter("review");
        // Clear the initial filter after applying it
        onFilterChange?.(null);
      } else if (initialFilter === "refill") {
        // Set primary filter to "Prescription Refill" for all refill decisions
        updatePrimaryFilter("Prescription Refill");
        updateSecondaryFilter("all");
        // Clear the initial filter after applying it
        onFilterChange?.(null);
      } else if (initialFilter === "icd") {
        // Set primary filter to "ICD Prediction" for all ICD predictions
        updatePrimaryFilter("ICD Prediction");
        updateSecondaryFilter("all");
        // Clear the initial filter after applying it
        onFilterChange?.(null);
      } else if (initialFilter === "all") {
        // Show all activity (no filters)
        updatePrimaryFilter("all");
        updateSecondaryFilter("all");
        // Clear the initial filter after applying it
        onFilterChange?.(null);
      }
    }
  }, [initialFilter, activeTab]);

  // Filter history based on selected filters
  const getFilteredHistory = () => {
    let filtered = history;
    
    // Primary filter: All, Refill, or ICD
    if (primaryFilter !== "all") {
      filtered = filtered.filter(h => h.action_type === primaryFilter);
    }
    
    // Secondary filter: Apply based on primary filter type
    if (secondaryFilter !== "all") {
      if (primaryFilter === "Prescription Refill") {
        filtered = filtered.filter(h => {
          const status = h.status?.toLowerCase();
          switch (secondaryFilter) {
            case "approved":
              return status === "approved" || status === "approve";
            case "denied":
              return status === "denied" || status === "deny";
            case "review":
              return status === "pending" || status === "escalated" || status === "escalate";
            default:
              return true;
          }
        });
      } else if (primaryFilter === "ICD Prediction") {
        filtered = filtered.filter(h => {
          const status = h.status?.toLowerCase();
          switch (secondaryFilter) {
            case "found":
              return status === "found";
            case "no-codes":
              return status === "no codes found";
            default:
              return true;
          }
        });
      }
    }
    
    return filtered;
  };

  const filteredHistory = getFilteredHistory();
  

  // Get counts for each filter option
  const getRefillCounts = () => {
    const refillHistory = history.filter(h => h.action_type === "Prescription Refill");
    return {
      all: refillHistory.length,
      approved: refillHistory.filter(h => {
        const status = h.status?.toLowerCase();
        return status === "approved" || status === "approve";
      }).length,
      denied: refillHistory.filter(h => {
        const status = h.status?.toLowerCase();
        return status === "denied" || status === "deny";
      }).length,
      review: refillHistory.filter(h => {
        const status = h.status?.toLowerCase();
        return status === "pending" || status === "escalated" || status === "escalate";
      }).length,
    };
  };

  const refillCounts = getRefillCounts();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Patient History
          </CardTitle>
          <CardDescription>
            View and manage patient history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => {
                  updatePrimaryFilter("all");
                  updateSecondaryFilter("all");
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  primaryFilter === "all"
                    ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All Results ({history.length})
              </button>
              <button
                onClick={() => {
                  updatePrimaryFilter("Prescription Refill");
                  updateSecondaryFilter("all");
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  primaryFilter === "Prescription Refill"
                    ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Refill Decisions ({refillCounts.all})
              </button>
              <button
                onClick={() => {
                  updatePrimaryFilter("ICD Prediction");
                  updateSecondaryFilter("all");
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  primaryFilter === "ICD Prediction"
                    ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                ICD Predictions ({history.filter(h => h.action_type === "ICD Prediction").length})
              </button>
            </div>

            {primaryFilter === "Prescription Refill" && (
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setSecondaryFilter("all")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    secondaryFilter === "all"
                      ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  All Refills ({refillCounts.all})
                </button>
                <button
                  onClick={() => updateSecondaryFilter("approved")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    secondaryFilter === "approved"
                      ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Approved ({refillCounts.approved})
                </button>
                <button
                  onClick={() => updateSecondaryFilter("denied")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    secondaryFilter === "denied"
                      ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Denied ({refillCounts.denied})
                </button>
                <button
                  onClick={() => updateSecondaryFilter("review")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    secondaryFilter === "review"
                      ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Clock className="h-4 w-4 text-yellow-500" />
                  Review Required ({refillCounts.review})
                </button>
              </div>
            )}

            {primaryFilter === "ICD Prediction" && (
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setSecondaryFilter("all")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    secondaryFilter === "all"
                      ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  All ICD ({history.filter(h => h.action_type === "ICD Prediction").length})
                </button>
                <button
                  onClick={() => updateSecondaryFilter("found")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    secondaryFilter === "found"
                      ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <FileText className="h-4 w-4 text-blue-500" />
                  Found ({history.filter(h => h.action_type === "ICD Prediction" && h.status === "Found").length})
                </button>
                <button
                  onClick={() => updateSecondaryFilter("no-codes")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    secondaryFilter === "no-codes"
                      ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  No Codes Found ({history.filter(h => h.action_type === "ICD Prediction" && h.status === "No Codes Found").length})
                </button>
              </div>
            )}
          </div>

          <div className="pt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Medication</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Decision By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((h) => (
                  <TableRow
                    key={h.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => updateSelected(h)}
                  >
                    <TableCell>{new Date(h.timestamp).toLocaleDateString()}</TableCell>
                    <TableCell>{h.patient_id}</TableCell>
                    <TableCell>{h.action_type}</TableCell>
                    <TableCell>{h.medication}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                               {(() => {
         const status = h.status?.toLowerCase();
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
                          const status = h.status?.toLowerCase();
                          if (status === "approve") return "Approved";
                          if (status === "deny") return "Denied";
                          if (status === "escalate") return "Pending";
                          return h.status ? h.status.charAt(0).toUpperCase() + h.status.slice(1) : "";
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>{h.decision_by || "AI"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); updateSelected(h); }}>
                          <FileText className="h-4 w-4 mr-2" />
                      </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </div>
        </CardContent>
      </Card>
      {activeTab === "history" && (
        <Dialog open={!!selected} onOpenChange={open => !open && updateSelected(null)}>
          <HistoryDialog 
            selectedDecision={selected} 
            setSelectedDecision={updateSelected} 
            onHistoryUpdate={() => {
              refreshHistory();
              onHistoryUpdate?.();
            }}
            onNavigateToPatient={onNavigateToPatient}
            showPatientButton={showPatientButton}
          />
        </Dialog>
      )}
    </div>
  );
}