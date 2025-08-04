e,
        complete: async (results: any) => {
          console.log("CSV Parse Results:", results);
          console.log("Found columns:", results.meta.fields);
          console.log("Required columns:", requiredColumns);
          
          const missing = requiredColumns.filter(col => !results.meta.fields?.includes(col));
          console.log("Missing columns:", missing);
          
          if (missing.length) {
            console.log("CSV Validation Failed - Missing columns:", missing);
            setError(`Missing columns: ${missing.join(", ")}`);
            return;
          }
          console.log("Current user:", authState.user);
          console.log("User ID being used:", authState.user?.id || 1);
          
          const patients = results.data.map((row: any) => ({
            patient_id: row.patient_id,
            name: row.name,
            medication: row.medication,
            refill_request_date: row.refill_request_date,
            last_filled: row.last_filled,
            last_visit: row.last_visit,
            labs: row.labs,
            diagnosis: row.diagnosis,
            refill_notes: row.refill_notes,
            icd_notes: row.icd_notes,
            age: row.age ? parseInt(row.age) : undefined,
            gender: row.gender,
            allergies: row.allergies,
            comorbidities: row.comorbidities,
            refill_history: row.refill_history,
            user_id: authState.user?.id
          }));
          setUploading(true);
          try {
            const response = await fetch(`${API_BASE}/api/v1/patients/batch`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(patients),
              credentials: "include",
            });
            if (!response.ok) {
              throw new Error(await response.text());
            }
            setSuccess(true);
            setError("");
            // Trigger refresh of patient lists with a small delay
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('historyUpdated'));
            }, 500);
          } catch (err: any) {
            console.log("CSV Upload Error:", err);
            setError(err.message || "Failed to upload patients.");
          } finally {
            setUploading(false);
          }
        },
        error: (err: any) => {
          console.log("Papa Parse Error:", err);
          setError(`CSV Parse Error: ${err.message}`);
        },
      });
    };
  
    return (
      <Card className="max-w-xl mx-auto mt-6">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <UploadCloud className="h-6 w-6 text-blue-600" />
          <div>
            <CardTitle className="text-lg">Upload Patient Data</CardTitle>
            <CardDescription>Import a CSV file of patient records. Download the template for correct formatting.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              Download Template
            </Button>
            <label className="inline-block">
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
              <Button asChild type="button" variant="default">
                <span>Choose CSV File</span>
              </Button>
            </label>
          </div>
          {error && (
            <div className="text-red-500 font-medium border border-red-200 bg-red-50 rounded px-3 py-2">
              {error.includes("Missing columns") ? (
                "Missing required columns. Please use the template above."
              ) : error.includes("CSV Parse Error") ? (
                "Invalid CSV file format."
              ) : error.includes("Failed to upload") ? (
                "Upload failed. Please try again."
              ) : (
                "Error importing CSV. Please check your file and try again."
              )}
            </div>
          )}
          {success && <div className="text-green-600 font-medium border border-green-200 bg-green-50 rounded px-3 py-2">Patients uploaded successfully!</div>}
          {uploading && <div className="text-blue-600 font-medium">Uploading...</div>}

        </CardContent>
      </Card>
    );
  }


