import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { normalizeStatusForDatabase, formatStatusForUI } from "@/lib/utils";

export default function HistoryDialog({ selectedDecision, setSelectedDecision, onHistoryUpdate, onNavigateToPatient, showPatientButton = true }: { 
  selectedDecision: any, 
  setSelectedDecision: (decision: any) => void, 
  onHistoryUpdate?: () => void,
  onNavigateToPatient?: (patientId: string) => void,
  showPatientButton?: boolean
}) {
  const { authState } = useAuth();
  const [newStatus, setNewStatus] = useState(selectedDecision?.status || "");
  const [newReasoning, setNewReasoning] = useState(selectedDecision?.reasoning || "");
  const [isEditing, setIsEditing] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState(new Date().toLocaleString());
  const [currentDecisionBy, setCurrentDecisionBy] = useState(selectedDecision?.decision_by || "AI");

  // Map status to button selection using normalized database format
  const getStatusForButtons = (status: string) => {
    return normalizeStatusForDatabase(status);
  };

  // Update state when selectedDecision changes
  useEffect(() => {
    if (selectedDecision) {
      setNewStatus(getStatusForButtons(selectedDecision.status || ""));
      setNewReasoning(selectedDecision.reasoning || "");
      setIsEditing(false);
      setCurrentTimestamp(new Date().toLocaleString());
      setCurrentDecisionBy(selectedDecision.decision_by || "AI");
    }
  }, [selectedDecision]);

  const hasChanges = newStatus !== selectedDecision?.status || 
                    newReasoning !== selectedDecision?.reasoning;

  // Update timestamp and decision_by when status changes
  const handleStatusChange = (status: string) => {
    setNewStatus(status);
    setCurrentTimestamp(new Date().toLocaleString());
    
    // Update decision_by based on changes
    const doctorName = authState.user ? `${authState.user.first_name} ${authState.user.last_name}` : "Unknown";
    
    // Check if this is a user modification (any change from original)
    const isUserModification = getStatusForButtons(selectedDecision?.original_status) !== getStatusForButtons(status) || 
                              selectedDecision?.original_reasoning !== newReasoning;
    
    // Special case: If original was escalate and we're reverting back to AI decision, use ->
    const originalWasEscalate = getStatusForButtons(selectedDecision?.original_status) === "escalate";
    const isRevertingToAI = !isUserModification; // No changes from original = reverting to AI
    const isEscalateRevert = originalWasEscalate && isRevertingToAI;
    
    if (isEscalateRevert) {
      // User reverted back to original AI decision (which was escalate) - use ->
      setCurrentDecisionBy(`AI -> Dr. ${doctorName}`);
    } else if (isUserModification) {
      // User modified the decision - use + for any change
      setCurrentDecisionBy(`AI + Dr. ${doctorName}`);
    } else {
      // No change from original - back to AI
      setCurrentDecisionBy("AI");
    }
  };

  return (
<Dialog open={!!selectedDecision} onOpenChange={(open) => !open && setSelectedDecision(null)}>
        {selectedDecision && (
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Decision Details</DialogTitle>
              <DialogDescription>
                {selectedDecision.action_type || 'Unknown'} decision from {selectedDecision.timestamp?.slice(0, 10) || 'Unknown date'}
              </DialogDescription>
            </DialogHeader>
                          <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-medium">Decision Information</h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Patient</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{selectedDecision.patient_id || 'N/A'}</span>
                          {selectedDecision.patient_id && onNavigateToPatient && showPatientButton && (
                            <div className="group relative">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                onClick={() => {
                                  if (onNavigateToPatient && selectedDecision.patient_id) {
                                    onNavigateToPatient(selectedDecision.patient_id);
                                  }
                                }}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                View Patient Profile
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Date:</span>
                        <span className="text-sm font-medium">{selectedDecision.timestamp?.slice(0, 10) || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Type:</span>
                        <span className="text-sm font-medium">{selectedDecision.action_type || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Medication:</span>
                        <span className="text-sm font-medium">{selectedDecision.medication || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Decision Outcome</h3>
                    <div className="mt-2 space-y-2">
                      {selectedDecision.action_type === "Prescription Refill" && selectedDecision.status && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Decision:</span>
                                 {selectedDecision.decision_by?.includes("AI") || selectedDecision.decision_by === "AI" ? (
       <div className="flex gap-2">
         <Button 
           size="sm" 
           variant={newStatus === "escalate" ? "default" : "outline"}
           className={newStatus === "escalate" ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-300" : ""}
           onClick={() => handleStatusChange("escalate")}
         >
           Escalate
         </Button>
         <Button 
           size="sm" 
           variant={newStatus === "approve" ? "default" : "outline"}
           className={newStatus === "approve" ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-300" : ""}
           onClick={() => handleStatusChange("approve")}
         >
           Approve
         </Button>
         <Button 
           size="sm" 
           variant={newStatus === "deny" ? "default" : "outline"}
           className={newStatus === "deny" ? "bg-red-100 text-red-800 hover:bg-red-100 border-red-300" : ""}
           onClick={() => handleStatusChange("deny")}
         >
           Deny
         </Button>

       </div>
                          ) : (
                        <Badge
                          className={
                                normalizeStatusForDatabase(selectedDecision.status) === "approve"
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                                  : normalizeStatusForDatabase(selectedDecision.status) === "deny"
                                ? "bg-red-100 text-red-800 hover:bg-red-100"
                                    : normalizeStatusForDatabase(selectedDecision.status) === "escalate"
                                  ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                  : "bg-blue-100 text-blue-800 hover:bg-blue-100"
                          }
                        >
                              {formatStatusForUI(selectedDecision.status)}
                        </Badge>
                          )}
                        </div>
                      )}
                      {selectedDecision.action_type === "ICD Prediction" && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">ICD Codes:</span>
                          <div className="flex flex-wrap gap-1 justify-end">
                            {selectedDecision.icd_codes
                              ? selectedDecision.icd_codes.split(',').map((code: string) => (
                                  <Badge key={code.trim()} variant="outline">{code.trim()}</Badge>
                                ))
                              : <span className="text-sm text-muted-foreground">No ICD codes</span>
                            }
                          </div>
                      </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Decision By:</span>
                        <span className="text-sm font-medium">
                          {currentDecisionBy || 'N/A'} 
                        </span>
                      </div>


                    </div>
                  </div>
                </div>


            

              {/* Reasoning Section */}
              {selectedDecision.reasoning && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Reasoning</h3>
                    <div className="flex items-center gap-2">
                      {(selectedDecision.original_status || selectedDecision.original_reasoning) && selectedDecision.action_type === "Prescription Refill" && (
                        <div className="group relative">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="text-gray-400 hover:text-gray-600 p-1 h-8 w-8"
                            onClick={() => {
                              setNewStatus(getStatusForButtons(selectedDecision.original_status || ""));
                              setNewReasoning(selectedDecision.original_reasoning || "");
                              setCurrentTimestamp(new Date().toLocaleString());
                              // Use handleStatusChange to properly set decision_by
                              handleStatusChange(getStatusForButtons(selectedDecision.original_status || ""));
                            }}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            Revert to AI
                          </div>
                        </div>
                      )}
                      {(selectedDecision.decision_by?.includes("AI") || selectedDecision.decision_by === "AI") && selectedDecision.action_type === "Prescription Refill" && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            if (isEditing) {
                              // Cancel edit - revert to original values
                              setNewStatus(getStatusForButtons(selectedDecision.status || ""));
                              setNewReasoning(selectedDecision.reasoning || "");
                              setCurrentTimestamp(selectedDecision.timestamp ? new Date(selectedDecision.timestamp).toLocaleString() : new Date().toLocaleString());
                              setCurrentDecisionBy(selectedDecision.decision_by || "AI");
                            }
                            setIsEditing(!isEditing);
                          }}
                        >
                          {isEditing ? "Cancel Edit" : "Edit"}
                        </Button>
                      )}
                    </div>
                  </div>
                  {isEditing ? (
                    <div className="mt-2">
                      <textarea
                        className="w-full p-3 border rounded-md"
                        rows={4}
                        value={newReasoning}
                        onChange={(e) => setNewReasoning(e.target.value)}
                        placeholder="Update the reasoning..."
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border p-4">
                      <p className="text-sm">{newReasoning}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Save Changes Button */}
              <div className="flex justify-end">
                {hasChanges && (selectedDecision.decision_by?.includes("AI") || selectedDecision.decision_by === "AI") && (
                  <Button 
                    onClick={async () => {
                      try {
                        // Determine the new status based on the original AI decision and reasoning
                        let newStatusValue;                        
                        // Always store in database format (simple)
                        newStatusValue = normalizeStatusForDatabase(newStatus);

                        const doctorName = authState.user ? `${authState.user.first_name} ${authState.user.last_name}` : "Unknown";
                        let decisionBy;
                        
                        // Check if this is a user modification (any change from original)
                        const isUserModification = getStatusForButtons(selectedDecision.original_status) !== getStatusForButtons(newStatus) || 
                                                  selectedDecision.original_reasoning !== newReasoning;
                        
                        // Special case: If original was escalate and current is escalate, use ->
                        const originalWasEscalate = getStatusForButtons(selectedDecision?.original_status) === "escalate";
                        const currentIsEscalate = getStatusForButtons(newStatus) === "escalate";
                        const isEscalateRevert = originalWasEscalate && currentIsEscalate;
                        
                        if (isEscalateRevert) {
                            // User reverted back to original escalate - use ->
                            decisionBy = `AI -> Dr. ${doctorName}`;
                        } else if (isUserModification) {
                            // User modified the decision - use + for any change
                            decisionBy = `AI + Dr. ${doctorName}`;
                        } else {
                            // No change from original - back to AI
                            decisionBy = "AI";
                        }

                        const updateData = {
                            status: newStatusValue,
                            reasoning: newReasoning,
                            decision_by: decisionBy
                        };



                        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/v1/history/${selectedDecision.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(updateData),
                          credentials: "include",
                        });

                        if (!response.ok) {
                          throw new Error(`Failed to update: ${response.statusText}`);
                        }

                        
                        // Refresh the history list to show updated data
                        if (onHistoryUpdate) {
                          onHistoryUpdate();
                        }
                        
                        // Close the dialog
                        setSelectedDecision(null);
                      } catch (error) {
                        console.error("Error updating history:", error);
                        alert("Failed to save changes. Please try again.");
                      }
                    }}
                  >
                    Save Changes
                </Button>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium">Decision Timeline</h3>
                <div className="mt-2 space-y-4">
                  {/* Initial AI Decision */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                        1
                      </div>
                      <div className="h-full w-0.5 bg-border"></div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">AI Analysis</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedDecision.timestamp ? new Date(selectedDecision.timestamp).toLocaleString() : 'Unknown time'}
                      </div>
                      <p className="mt-1 text-sm">
                        Initial AI analysis performed. Decision: {formatStatusForUI(selectedDecision.original_status || selectedDecision.status)}
                      </p>
                    </div>
                  </div>

                  {/* Doctor Review (only if decision was actually changed) */}
                  {(getStatusForButtons(selectedDecision.original_status) !== getStatusForButtons(newStatus) || 
                    selectedDecision.original_reasoning !== newReasoning) && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-8 w-8 rounded-full bg-yellow-500 flex items-center justify-center text-white">
                          2
                        </div>
                        <div className="h-full w-0.5 bg-border"></div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Doctor Review</div>
                        <div className="text-xs text-muted-foreground">
                          {currentTimestamp}
                        </div>
                        <p className="mt-1 text-sm">
                          {(() => {
                            const statusChanged = getStatusForButtons(selectedDecision.original_status) !== getStatusForButtons(newStatus);
                            const reasoningChanged = selectedDecision.original_reasoning !== newReasoning;
                            
                            if (statusChanged && reasoningChanged) {
                              return `Status changed from ${selectedDecision.original_status} to ${newStatus} and reasoning modified`;
                            } else if (statusChanged) {
                              return `Status changed from ${selectedDecision.original_status} to ${newStatus}`;
                            } else if (reasoningChanged) {
                              return "Reasoning modified";
                            } else {
                              return "Decision reviewed";
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Final Status */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                        {(getStatusForButtons(selectedDecision.original_status) !== getStatusForButtons(newStatus) || 
                          selectedDecision.original_reasoning !== newReasoning) ? "3" : "2"}
                      </div>
                    </div>
                    <div>
                        <div className="text-sm font-medium">Final Status</div>
                      <div className="text-xs text-muted-foreground">
                          {currentTimestamp}
                      </div>
                      <p className="mt-1 text-sm">
                          {newStatus === "escalate" 
                            ? "Decision escalated for further review"
                            : newStatus === "approve"
                              ? "Prescription refill approved"
                              : newStatus === "deny"
                                ? "Prescription refill denied"
                                : `Status: ${formatStatusForUI(selectedDecision.status)}`
                          }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
  );
}