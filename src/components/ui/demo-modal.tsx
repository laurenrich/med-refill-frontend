import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Users, CheckCircle } from 'lucide-react';
import { usePatients } from '@/context/PatientContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

interface DemoModalProps {
  onClose: () => void;
}

export function DemoModal({ onClose }: DemoModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const { triggerGlobalUpdate } = usePatients();

  const loadDemoData = async () => {
    setLoading(true);
    setError("");
    try {
      const demoPatients = [
        {
          patient_id: "P001",
          name: "Jane Doe",
          medication: "Levothyroxine 50mcg",
          refill_request_date: "2025-05-25",
          last_filled: "2025-04-22",
          last_visit: "2024-02-24",
          labs: "TSH = 2.4, T4 normal",
          diagnosis: "Hypothyroidism",
          refill_notes: "Routine refill, no recent adverse events, within visit window.",
          icd_notes: "Patient presents with vomiting. Symptoms started 2 days ago. Vitals stable. No prior history of this condition. Assessment: likely vomiting, unspecified.",
          age: 48,
          gender: "Female",
          allergies: "Penicillin",
          comorbidities: "Obesity, Hyperlipidemia",
          refill_history: "First time refill"
        },
        {
          patient_id: "P002",
          name: "John Smith",
          medication: "Omeprazole 20mg",
          refill_request_date: "2025-06-01",
          last_filled: "2025-04-29",
          last_visit: "2025-03-15",
          labs: "No active GI symptoms",
          diagnosis: "GERD",
          refill_notes: "Labs outdated, unclear if condition is controlled.",
          icd_notes: "Patient presents with joint pain. Symptoms started 2 days ago. Vitals stable. No prior history of this condition. Assessment: likely pain in unspecified joint.",
          age: 45,
          gender: "Male",
          allergies: "NSAIDs",
          comorbidities: "Obesity, Hyperlipidemia",
          refill_history: "Missed last 2 refills"
        },
        {
          patient_id: "P003",
          name: "Bob Johnson",
          medication: "Sertraline 50mg",
          refill_request_date: "2025-06-02",
          last_filled: "2025-04-10",
          last_visit: "2024-06-27",
          labs: "N/A",
          diagnosis: "Depression",
          refill_notes: "Recent ER visit suggests need for provider input before refill.",
          icd_notes: "Patient presents with headache. Symptoms started 2 days ago. Vitals stable. No prior history of this condition. Assessment: likely headache.",
          age: 40,
          gender: "Male",
          allergies: "NSAIDs",
          comorbidities: "Depression, Anxiety",
          refill_history: "Missed last 2 refills"
        },
        {
          patient_id: "P004",
          name: "Mary Davis",
          medication: "Hydrochlorothiazide 25mg",
          refill_request_date: "2025-05-30",
          last_filled: "2025-04-04",
          last_visit: "2024-02-27",
          labs: "Stable electrolytes",
          diagnosis: "Hypertension",
          refill_notes: "Patient seen last month, BP well-controlled, compliant with regimen.",
          icd_notes: "Patient presents with abdominal pain. Symptoms started 2 days ago. Vitals stable. No prior history of this condition. Assessment: likely abdominal pain, unspecified.",
          age: 68,
          gender: "Female",
          allergies: "Sulfa drugs",
          comorbidities: "None",
          refill_history: "Frequently requests early refills"
        },
        {
          patient_id: "P005",
          name: "Alex Taylor",
          medication: "Zolpidem 10mg",
          refill_request_date: "2025-06-09",
          last_filled: "2025-04-28",
          last_visit: "2024-08-04",
          labs: "N/A",
          diagnosis: "Insomnia",
          refill_notes: "Labs outdated, unclear if condition is controlled.",
          icd_notes: "Patient presents with chest pain. Symptoms started 2 days ago. Vitals stable. No prior history of this condition. Assessment: likely chest pain, unspecified.",
          age: 26,
          gender: "Male",
          allergies: "Sulfa drugs",
          comorbidities: "Heart Failure",
          refill_history: "Consistently refills on time"
        }
      ];

      const response = await fetch(`${API_BASE}/api/v1/patients/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demoPatients),
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      triggerGlobalUpdate();
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(`Demo data load failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 bg-white shadow-[0_8px_25px_rgba(0,0,0,0.1)] rounded-2xl overflow-hidden">
      <CardHeader className="pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
            <Play className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900">Load Demo Data</CardTitle>
            <CardDescription className="text-gray-600 mt-1">Load sample patient data to explore the application features</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Demo Data Preview */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">What you'll get:</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Users className="h-4 w-4 text-blue-500" />
              <span>5 sample patients with complete medical profiles</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Ready for batch processing and analysis</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Different patient statuses to demonstrate workflow</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1 h-12 bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200"
          >
            Cancel
          </Button>
          <Button 
            onClick={loadDemoData}
            disabled={loading}
            className="flex-1 h-12 bg-green-600 hover:bg-green-700 transition-all duration-200"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Loading...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Load Demo Data
              </>
            )}
          </Button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
              </div>
              <div className="text-sm text-red-700">{error}</div>
            </div>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl border border-green-200 bg-green-50">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-3 h-3 text-green-600" />
              </div>
              <div className="text-sm text-green-700">Demo data loaded successfully! You can now explore the application features.</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 