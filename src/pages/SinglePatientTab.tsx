import { useState } from 'react';

const sampleData = {
    icd_request_data: {
        note: "Patient presents with persistent cough and mild fever.",
        age: "45",
        sex: "Female",
        past_medical_history: "Hypertension, Asthma"
    },
    refill_request_data: {
        refill_request: {
            patient_id: "123456",
            medication: "Lisinopril 10mg",
            refill_request_date: "2024-06-01",
            last_filled: "2024-05-01"
        },
        patient_context: {
            last_visit: "2024-05-15",
            labs: "CBC normal, Cholesterol elevated",
            diagnosis: "Hypertension, Asthma",
            notes: "Patient is responding well to medication.",
            age: "45",
            gender: "Female",
            allergies: "Penicillin",
            comorbidities: "Asthma",
            refill_history: "Lisinopril refilled monthly for past 6 months"
        }
    }
};

const SinglePatientTab: React.FC = () => {
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [action, setAction] = useState<'refill' | 'icd' | null>(null);

    const [form, setForm] = useState({
        icd_request_data: {
            note: '',
            age: '',
            sex: '',
            past_medical_history: '',
        },
        refill_request_data: {
            refill_request: {
                patient_id: '',
                medication: '',
                refill_request_date: '',
                last_filled: '',
            },
            patient_context: {
                last_visit: '',
                labs: '',
                diagnosis: '',
                notes: '',
                age: '',
                gender: '',
                allergies: '',
                comorbidities: '',
                refill_history: '',
            }
        }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const layers = e.target.name.split('.');
        setForm(prev => {
            const updated = { ...prev };
            let obj = updated as any;
            for (let i = 0; i < layers.length - 1; i++) {
                obj[layers[i]] = { ...obj[layers[i]] };
                obj = obj[layers[i]];
            }
            const value = e.target.type === "number" && e.target.value !== "" ? Number(e.target.value) : e.target.value;
            obj[layers[layers.length-1]] = value;
            return updated;
        });
    };

    const handleSampleData = () => {
        setForm(sampleData);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            let endpoint = '';
            let payload: any = {};
            if (action === 'refill') {
                endpoint = '/api/v1/evaluate-refill';
                payload = form.refill_request_data;
            } else if (action === 'icd') {
                endpoint = '/api/v1/predict-icd';
                payload = form.icd_request_data;
            } else {
                throw new Error('No action selected');
            }
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error("Failed to submit request");
            }

            const data = await response.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message || "unknown error");
        } finally {
            setLoading(false);
            setAction(null);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-8">
                <div className="flex justify-end mb-4">
                    <button
                        type="button"
                        className="bg-gray-200 text-gray-800 px-4 py-1 rounded hover:bg-gray-300 text-sm"
                        onClick={handleSampleData}
                    >
                        Fill Sample Data
                    </button>
                </div>
                <h2 className="text-2xl font-bold mb-6 text-blue-700">Refill & Diagnosis Assistant</h2>
                <form className="space-y-8" onSubmit={handleSubmit}>
                    {/* Patient Demographics */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2 text-gray-700">Patient Demographics</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1" htmlFor="patient_id">Patient ID</label>
                            <input
                                id="patient_id"
                                name="refill_request_data.refill_request.patient_id"
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={form.refill_request_data.refill_request.patient_id || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-1" htmlFor="age">Age</label>
                                <input
                                    id="age"
                                    name="icd_request_data.age"
                                    type="number"
                                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={form.icd_request_data.age || ''}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1" htmlFor="sex">Gender/Sex</label>
                                <input
                                    id="sex"
                                    name="icd_request_data.sex"
                                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={form.icd_request_data.sex || ''}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1" htmlFor="last_visit">Date of Last Visit</label>
                            <input
                                id="last_visit"
                                name="refill_request_data.patient_context.last_visit"
                                type="date"
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={form.refill_request_data.patient_context.last_visit || ''}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    {/* Clinical Note & History */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2 text-gray-700">Clinical Note & History</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1" htmlFor="clinical_note">Clinical Note</label>
                            <textarea
                                id="clinical_note"
                                name="icd_request_data.note"
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={form.icd_request_data.note || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1" htmlFor="pmh">Past Medical History</label>
                            <input
                                id="pmh"
                                name="icd_request_data.past_medical_history"
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={form.icd_request_data.past_medical_history || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1" htmlFor="diagnosis">Diagnosis</label>
                            <input
                                id="diagnosis"
                                name="refill_request_data.patient_context.diagnosis"
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={form.refill_request_data.patient_context.diagnosis || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1" htmlFor="comorbidities">Comorbidities</label>
                            <input
                                id="comorbidities"
                                name="refill_request_data.patient_context.comorbidities"
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={form.refill_request_data.patient_context.comorbidities || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1" htmlFor="allergies">Allergies</label>
                            <input
                                id="allergies"
                                name="refill_request_data.patient_context.allergies"
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={form.refill_request_data.patient_context.allergies || ''}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    {/* Lab Results */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2 text-gray-700">Lab Results</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1" htmlFor="labs">Lab Results</label>
                            <input
                                id="labs"
                                name="refill_request_data.patient_context.labs"
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={form.refill_request_data.patient_context.labs || ''}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    {/* Refill Request */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2 text-gray-700">Refill Request</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1" htmlFor="medication">Medication Name</label>
                            <input
                                id="medication"
                                name="refill_request_data.refill_request.medication"
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={form.refill_request_data.refill_request.medication || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-1" htmlFor="refill_request_date">Date of Refill Request</label>
                                <input
                                    id="refill_request_date"
                                    name="refill_request_data.refill_request.refill_request_date"
                                    type="date"
                                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={form.refill_request_data.refill_request.refill_request_date || ''}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1" htmlFor="last_filled">Date of Last Fill</label>
                                <input
                                    id="last_filled"
                                    name="refill_request_data.refill_request.last_filled"
                                    type="date"
                                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={form.refill_request_data.refill_request.last_filled || ''}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1" htmlFor="refill_history">Medication Refill History</label>
                            <input
                                id="refill_history"
                                name="refill_request_data.patient_context.refill_history"
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={form.refill_request_data.patient_context.refill_history || ''}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    {/* Additional Notes */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2 text-gray-700">Additional Notes</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1" htmlFor="notes">Notes</label>
                            <textarea
                                id="notes"
                                name="refill_request_data.patient_context.notes"
                                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={form.refill_request_data.patient_context.notes || ''}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    {/* Buttons */}
                    <div className="flex space-x-4 mt-6">
                        <button
                            type="submit"
                            className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                            disabled={loading}
                            onClick={() => setAction('refill')}
                        >
                            {loading && action === 'refill' ? 'Submitting...' : 'Get Refill Decision'}
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
                            disabled={loading}
                            onClick={() => setAction('icd')}
                        >
                            {loading && action === 'icd' ? 'Submitting...' : 'Get ICD Prediction'}
                        </button>
                    </div>
                </form>
                {error && <div className="mt-4 text-red-600">{error}</div>}
                {result && (
                    <div className="mt-6 p-4 bg-gray-100 rounded">
                        <pre>{JSON.stringify(result, null, 2)}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SinglePatientTab;