import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Clock, FileText, ChevronRight } from "lucide-react";
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
            Request History
          </CardTitle>
          <CardDescription>
            View and manage patient request history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  updatePrimaryFilter("all");
                  updateSecondaryFilter("all");
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 ${
                  primaryFilter === "all"
                    ? 'bg-blue-100 text-blue-600 shadow-sm' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Results ({history.length})
              </button>
              <button
                onClick={() => {
                  updatePrimaryFilter("Prescription Refill");
                  updateSecondaryFilter("all");
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 ${
                  primaryFilter === "Prescription Refill"
                    ? 'bg-blue-100 text-blue-600 shadow-sm' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Refill Decisions ({refillCounts.all})
              </button>
              <button
                onClick={() => {
                  updatePrimaryFilter("ICD Prediction");
                  updateSecondaryFilter("all");
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 ${
                  primaryFilter === "ICD Prediction"
                    ? 'bg-blue-100 text-blue-600 shadow-sm' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ICD Predictions ({history.filter(h => h.action_type === "ICD Prediction").length})
              </button>
            </div>

            {primaryFilter === "Prescription Refill" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSecondaryFilter("all")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 ${
                    secondaryFilter === "all"
                      ? 'bg-blue-100 text-blue-600 shadow-sm' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Refills ({refillCounts.all})
                </button>
                <button
                  onClick={() => updateSecondaryFilter("approved")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2 ${
                    secondaryFilter === "approved"
                      ? 'bg-blue-100 text-blue-600 shadow-sm' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Approved ({refillCounts.approved})
                </button>
                <button
                  onClick={() => updateSecondaryFilter("denied")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2 ${
                    secondaryFilter === "denied"
                      ? 'bg-blue-100 text-blue-600 shadow-sm' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Denied ({refillCounts.denied})
                </button>
                <button
                  onClick={() => updateSecondaryFilter("review")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2 ${
                    secondaryFilter === "review"
                      ? 'bg-blue-100 text-blue-600 shadow-sm' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Clock className="h-4 w-4 text-yellow-500" />
                  Review Required ({refillCounts.review})
                </button>
              </div>
            )}

            {primaryFilter === "ICD Prediction" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSecondaryFilter("all")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 ${
                    secondaryFilter === "all"
                      ? 'bg-blue-100 text-blue-600 shadow-sm' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All ICD ({history.filter(h => h.action_type === "ICD Prediction").length})
                </button>
                <button
                  onClick={() => updateSecondaryFilter("found")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2 ${
                    secondaryFilter === "found"
                      ? 'bg-blue-100 text-blue-600 shadow-sm' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FileText className="h-4 w-4 text-blue-500" />
                  Found ({history.filter(h => h.action_type === "ICD Prediction" && h.status === "Found").length})
                </button>
                <button
                  onClick={() => updateSecondaryFilter("no-codes")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2 ${
                    secondaryFilter === "no-codes"
                      ? 'bg-blue-100 text-blue-600 shadow-sm' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  No Codes Found ({history.filter(h => h.action_type === "ICD Prediction" && h.status === "No Codes Found").length})
                </button>
              </div>
            )}
          </div>

          <div className="pt-2">
            {/* Timeline History */}
            <div className="space-y-6">
              {(() => {
                // Group history by date
                const groupedHistory = filteredHistory.reduce((groups: any, h) => {
                  const date = new Date(h.timestamp).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  });
                  if (!groups[date]) {
                    groups[date] = [];
                  }
                  groups[date].push(h);
                  return groups;
                }, {});

                return Object.entries(groupedHistory).map(([date, entries]: [string, any]) => (
                  <div key={date} className="mb-6">
                    {/* Date Header */}
                    <div className="px-6 py-3 border-b border-gray-200 mb-4">
                      <h3 className="text-sm text-gray-700 font-medium">{date}</h3>
                    </div>
                    
                    {/* Timeline Entries */}
                    <div className="pl-6 space-y-3">
                      {entries.map((h: any, index: number) => (
                        <div
                          key={h.id}
                          className="p-4 rounded-xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.1)] hover:bg-gray-50 transition-all duration-200 cursor-pointer"
                          onClick={() => updateSelected(h)}
                        >
                          <div className="flex items-center justify-between">
                            {/* Left: Time and Icon */}
                            <div className="flex items-center gap-3">
                                                          {/* Time */}
                            <div className="text-sm text-gray-500 font-medium min-w-[60px] text-center">
                              {new Date(h.timestamp).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: true,
                                timeZone: 'America/New_York'
                              })}
                            </div>
                              
                              {/* Icon */}
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                {(() => {
                                  const status = h.status?.toLowerCase();
                                  if (status === "approved" || status === "approve" || status.includes("approved")) {
                                    return <CheckCircle className="h-4 w-4 text-green-600" />;
                                  } else if (status === "denied" || status === "deny" || status.includes("denied")) {
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
                            
                            {/* Right: Status Badge and Expansion Icon */}
                            <div className="flex items-center gap-3">
                              {(() => {
                                const status = h.status?.toLowerCase();
                                if (status === "approved" || status === "approve" || status.includes("approved")) {
                                  return (
                                    <span className="bg-green-100 text-green-800 flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium">
                                      <CheckCircle className="h-3 w-3" />
                                      Approved
                                    </span>
                                  );
                                } else if (status === "denied" || status === "deny" || status.includes("denied")) {
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
                              
                              {/* Expansion Icon */}
                              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                <ChevronRight className="h-3 w-3 text-gray-500" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
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