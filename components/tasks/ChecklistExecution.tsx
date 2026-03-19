"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Check, X, Camera, UploadCloud, ArrowRight, ArrowLeft, MapPin, Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "../ui/progress";
import CameraCapture from "./CameraCapture";
import { Map, MapTileLayer, MapMarker, MapPopup } from "../ui/map";
import { useMapEvents } from "react-leaflet";

// Small helper component to listen for clicks on the Leaflet map
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface ChecklistExecutionProps {
  session: any;
  template: any;
  onFinish: () => void;
  onCancel: () => void;
  onGoToReports?: () => void;
}

export default function ChecklistExecution({ session, template, onFinish, onCancel, onGoToReports }: ChecklistExecutionProps) {
  const [items, setItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // State for current response (active item)
  const [answer, setAnswer] = useState<"yes" | "no" | "n_a" | null>(null);
  const [notes, setNotes] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationPermission, setLocationPermission] = useState<PermissionState | "unknown">("unknown");

  // Storage for all accumulated answers before final submit
  const [accumulatedResponses, setAccumulatedResponses] = useState<Record<string, { answer: "yes" | "no" | "n_a", notes: string, evidenceFile: File | null, location: { lat: number; lng: number } | null }>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [loadingText, setLoadingText] = useState("Piling up all of the images...");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchItems();
  }, [session.checklist_id]);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("checklist_id", session.checklist_id)
      .order("order_index", { ascending: true });

    if (error) {
      toast.error("Failed to load checklist items.");
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const currentItem = items[currentIndex];
  // Determine if we're on the summary screen or uploading screen. If items.length is > 0 and currentIndex === items.length, we display the summary.
  const isCompleteArray = items.length && currentIndex === items.length;

  // Restore state when moving back and forth
  useEffect(() => {
    if (currentItem && accumulatedResponses[currentItem.id]) {
      const saved = accumulatedResponses[currentItem.id];
      setAnswer(saved.answer);
      setNotes(saved.notes);
      setEvidenceFile(saved.evidenceFile);
      setLocation(saved.location);
    } else {
      resetState();
    }
  }, [currentIndex, currentItem, accumulatedResponses]);


  const handleNext = async () => {
    if (!answer) {
      toast.error("Please select Yes or No.");
      return;
    }

    if (answer === "no" && currentItem.requires_media_on_no && !evidenceFile) {
      toast.error("Media evidence is required for a 'No' answer on this item.");
      return;
    }

    // Save locally
    setAccumulatedResponses(prev => ({
      ...prev,
      [currentItem.id]: { answer, notes, evidenceFile, location }
    }));

    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Reached the end - Trigger bulk upload.
      setCurrentIndex(prev => prev + 1); // move to loading screen
      await submitAllData({ ...accumulatedResponses, [currentItem.id]: { answer, notes, evidenceFile, location } });
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const submitAllData = async (finalResponses: Record<string, { answer: "yes" | "no" | "n_a", notes: string, evidenceFile: File | null, location: { lat: number; lng: number } | null }>) => {
    setIsSubmitting(true);
    setLoadingText("Piling up all of the images...");
    try {
      // For each item, upload evidence if present and insert response.
      for (const item of items) {
        const resp = finalResponses[item.id];
        if (!resp) continue; // safety check

        // 1. Save Response
        const { data: responseData, error: responseErr } = await supabase
          .from("task_responses")
          .insert({
            session_id: session.id,
            item_id: item.id,
            answer: resp.answer,
            notes: resp.notes
          })
          .select()
          .single();

        if (responseErr) throw responseErr;

        // 2. Upload Evidence if present
        if (resp.evidenceFile) {
          const formData = new FormData();
          formData.append("file", resp.evidenceFile);

          const uploadRes = await fetch("/api/tasks/upload", {
            method: "POST",
            body: formData,
          });

          if (!uploadRes.ok) {
            const errData = await uploadRes.json();
            throw new Error(errData.error || "Upload failed");
          }

          const { url, fileName } = await uploadRes.json();

          // 3. Save evidence record (with optional location)
          const { error: evidenceErr } = await supabase
            .from("task_evidence")
            .insert({
              response_id: responseData.id,
              file_url: url,
              file_name: fileName,
              file_type: resp.evidenceFile.type,
              ...(resp.location ? { latitude: resp.location.lat, longitude: resp.location.lng } : {})
            });

          if (evidenceErr) throw evidenceErr;
        }
      }

      setLoadingText("Finalizing inspection...");
      // Complete session
      await supabase
        .from("task_sessions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", session.id)
        .eq("org_id", session.org_id);

      setIsFinished(true);
    } catch (err: any) {
      console.error(err);
      toast.error("Error saving responses: " + err.message);
      // Let user retry if it failed. go back to last question.
      setCurrentIndex(items.length - 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setAnswer(null);
    setNotes("");
    setEvidenceFile(null);
    setLocation(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setIsLocating(false);
        setLocationPermission("granted");
        toast.success("Location captured!");
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
           setLocationPermission("denied");
           toast.error("Location access denied. Please allow location access in your browser settings to pin evidence.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
           toast.error("Location information is unavailable. Try moving to an area with better GPS signal.");
        } else if (err.code === err.TIMEOUT) {
           toast.error("Location request timed out. Please try again.");
        } else {
           toast.error(`Could not get location: ${err.message}`);
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // Check permission status via Permissions API
  const updatePermissionStatus = async () => {
    if (!navigator.permissions || !navigator.permissions.query) return;
    try {
      const result = await navigator.permissions.query({ name: "geolocation" as any });
      setLocationPermission(result.state);
      result.onchange = () => {
        setLocationPermission(result.state);
      };
    } catch (e) {
      console.warn("Permissions API not supported for geolocation query", e);
    }
  };

  useEffect(() => {
    if (answer === "no" && locationPermission === "unknown") {
      updatePermissionStatus();
    }
  }, [answer]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      try {
        const ab = await file.arrayBuffer();
        setEvidenceFile(new File([ab], file.name, { type: file.type }));
      } catch (err) {
        setEvidenceFile(file);
      }
    }
  };

  if (loading) return <div className="p-8 text-center text-primary/70 font-semibold mt-10"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" /> Loading inspection steps...</div>;
  if (!items.length) return <div className="p-8 text-center">No items in this checklist.</div>;

  // 1. Submitting/Loading State (Between hitting "Next" on the last question and finishing)
  if (isSubmitting && currentIndex === items.length) {
    return (
      <div className="flex flex-col min-h-screen bg-transparent items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500 delay-100 p-8 rounded-[32px] bg-card shadow-2xl scale-[1.02] max-w-sm w-full">
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            <UploadCloud className="absolute inset-0 m-auto text-primary w-10 h-10 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">{loadingText}</h3>
          <p className="text-sm text-muted-foreground">Please wait while we sync everything to the cloud.</p>
        </div>
      </div>
    );
  }

  // 2. Finished Summary State
  if (isFinished) {
    const passedCount = Object.values(accumulatedResponses).filter(r => r.answer === "yes").length;
    const issuesCount = Object.values(accumulatedResponses).filter(r => r.answer === "no").length;

    return (
      <div className="flex flex-col min-h-screen bg-transparent items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center animate-in slide-in-from-bottom-8 fade-in duration-500 w-full max-w-md">

          <Card className="w-full shadow-2xl rounded-[32px] border-none overflow-hidden bg-card flex flex-col items-center text-center pt-10 pb-8 px-6">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-[28px] font-bold text-foreground mb-2 tracking-tight">Inspection Complete!</h2>
            <p className="text-muted-foreground mb-8 max-w-[250px]">All data has been successfully saved and synced.</p>

            <div className="grid grid-cols-2 gap-4 w-full mb-8">
              <div className="bg-green-50 dark:bg-green-900/30 rounded-2xl p-4 border border-green-100 dark:border-green-800 flex flex-col items-center">
                <span className="text-3xl font-black text-green-600 mb-1">{passedCount}</span>
                <span className="text-xs font-bold text-green-800 dark:text-green-400 uppercase tracking-widest">Passed</span>
              </div>
              <div className="bg-red-50 dark:bg-red-900/30 rounded-2xl p-4 border border-red-100 dark:border-red-800 flex flex-col items-center">
                <span className="text-3xl font-black text-red-600 mb-1">{issuesCount}</span>
                <span className="text-xs font-bold text-red-800 dark:text-red-400 uppercase tracking-widest">Issues</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button
                onClick={onFinish}
                variant="outline"
                className="flex-1 py-6 rounded-full text-base sm:text-lg font-bold transition-transform hover:bg-muted"
                size="lg"
              >
                Close Task
              </Button>

              {onGoToReports ? (
                <Button
                  onClick={onGoToReports}
                  className="flex-1 py-6 rounded-full text-base sm:text-lg font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform bg-primary hover:bg-primary/90 text-white"
                  size="lg"
                >
                  Go to Reports
                </Button>
              ) : (
                <Button
                  onClick={onFinish}
                  className="flex-1 py-6 rounded-full text-base sm:text-lg font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform bg-primary hover:bg-primary/90 text-white"
                  size="lg"
                >
                  Close Task
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // 3. Main Form State
  return (
    <div className="flex flex-col min-h-screen bg-transparent items-center p-4 md:p-6 pb-32">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-foreground/10 blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-64 h-64 rounded-full bg-foreground/10 blur-3xl opacity-50" />
      </div>

      {/* Header */}
      <div className="relative z-10 w-full max-w-md flex flex-col mb-6 mt-2">
        <div className="flex items-center justify-between text-white/90">
          {currentIndex === 0 ? (
            <Button variant="ghost" onClick={onCancel} className="gap-2 text-white hover:text-white hover:bg-white/20 rounded-full px-4 -ml-2">
              <X className="w-4 h-4" /> Cancel
            </Button>
          ) : (
            <Button variant="ghost" onClick={handleBack} className="gap-2 text-white hover:text-white hover:bg-white/20 rounded-full px-4 -ml-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          )}

          <span className="text-sm font-medium bg-black/10 px-3 py-1 rounded-full">
            {currentIndex + 1} / {items.length}
          </span>
        </div>

        {/* Progress Bar under header */}
        <div className="w-full h-1.5 bg-black/10 rounded-full mt-4 overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-300 ease-out"
            style={{ width: `${((currentIndex) / items.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Flashcard Container */}
      <div className="relative z-10 w-full max-w-md flex-1 flex flex-col pt-4">

        {/* Flashcard Stack */}
        <div className="relative w-full">
          {/* Background card 2 */}
          <div className="absolute top-4 left-6 right-6 bottom-0 bg-card/20 rounded-[32px] -z-20 transform translate-y-4" />
          {/* Background card 1 */}
          <div className="absolute top-2 left-3 right-3 bottom-0 bg-card/40 rounded-[32px] -z-10 transform translate-y-2" />

          {/* Main Interactive Card */}
          <Card className="w-full shadow-2xl rounded-[32px] border-none overflow-hidden bg-card flex flex-col">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
              <h2 className="text-2xl md:text-[28px] font-bold leading-snug text-foreground tracking-tight">
                {currentItem.text}
              </h2>
              {currentItem.description && (
                <p className="mt-4 text-sm text-muted-foreground">{currentItem.description}</p>
              )}
            </CardContent>

            <div className="grid grid-cols-2 divide-x divide-border border-t border-border bg-card">
              <button
                onClick={() => setAnswer("no")}
                className={`group p-6 flex flex-col items-center justify-center gap-2 transition-all ${answer === "no"
                  ? "bg-red-50 dark:bg-red-950/40 text-red-600 font-bold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                  }`}
              >
                <div className={`p-3 rounded-full transition-colors ${answer === "no" ? "bg-red-100 dark:bg-red-900/50" : "bg-muted group-hover:bg-accent"}`}>
                  <X className="w-6 h-6" />
                </div>
                <span className="text-sm">No</span>
              </button>
              <button
                onClick={() => { setAnswer("yes"); setEvidenceFile(null); }}
                className={`group p-6 flex flex-col items-center justify-center gap-2 transition-all ${answer === "yes"
                  ? "bg-green-50 dark:bg-green-950/40 text-green-600 font-bold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                  }`}
              >
                <div className={`p-3 rounded-full transition-colors ${answer === "yes" ? "bg-green-100 dark:bg-green-900/50" : "bg-muted group-hover:bg-accent"}`}>
                  <Check className="w-6 h-6" />
                </div>
                <span className="text-sm">Yes</span>
              </button>
            </div>
          </Card>
        </div>

        {/* Conditional "No" Details (Drag & Drop) */}
        {answer === "no" && (
          <div className="mt-6 w-full animate-in slide-in-from-top-4 fade-in duration-300">
            <Card className="rounded-[24px] border-none shadow-xl bg-card overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <h4 className="flex items-center text-red-600 font-bold text-sm gap-2">
                  <Camera className="w-4 h-4" />
                  {currentItem.requires_media_on_no ? "Media Evidence Required" : "Optional Media Evidence"}
                </h4>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all ${isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/50 hover:bg-muted"
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return; // Exit early to prevent infinite loops when clearing the input

                      try {
                        const ab = await file.arrayBuffer();
                        setEvidenceFile(new File([ab], file.name, { type: file.type }));
                      } catch (err) {
                        setEvidenceFile(file);
                      }

                      // Clear the input value so the same file can be selected again if needed
                      e.target.value = "";
                    }}
                    className="hidden"
                  />

                  {evidenceFile ? (
                    <div className="flex flex-col items-center text-center gap-2 w-full">
                      <div className="p-3 bg-green-100 dark:bg-green-900/50 text-green-600 rounded-full">
                        <Check className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-foreground break-all">{evidenceFile.name}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEvidenceFile(null)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 mt-1 h-8"
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full shadow-sm"
                          onClick={() => setIsCameraOpen(true)}
                        >
                          <Camera className="w-4 h-4 mr-2" /> Take Photo
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full shadow-sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <UploadCloud className="w-4 h-4 mr-2" /> Upload
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">or drag & drop file here</p>
                    </div>
                  )}
                </div>

                {/* Location Pin */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" /> Pin Location
                    </label>
                    {location && (
                      <Button variant="ghost" size="sm" onClick={() => setLocation(null)} className="h-6 text-xs text-red-500 hover:text-red-600 px-2">
                        Clear Pin
                      </Button>
                    )}
                  </div>

                  <div className="rounded-xl overflow-hidden border border-border shadow-sm">
                    <div className="h-[220px] w-full relative">
                      <Map
                        center={location ? [location.lat, location.lng] : [14.5995, 120.9842]}
                        zoom={location ? 16 : 6}
                        className="h-full w-full rounded-none min-h-0"
                      >
                        <MapTileLayer />
                        <MapClickHandler onMapClick={(lat, lng) => setLocation({ lat, lng })} />
                        {location && (
                          <MapMarker position={[location.lat, location.lng]}>
                            <MapPopup>
                              <p className="text-xs font-semibold">Evidence Location</p>
                              <p className="text-[10px] text-muted-foreground">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>
                            </MapPopup>
                          </MapMarker>
                        )}
                      </Map>
                    </div>
                    {location ? (
                      <div className="bg-green-50 dark:bg-green-950/40 px-3 py-2 flex items-center justify-between text-green-700 dark:text-green-400 border-t border-green-100 dark:border-green-800">
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-green-700 dark:text-green-400 hover:text-green-800 hover:bg-green-100 dark:hover:bg-green-900/60 px-2 gap-1"
                          onClick={handleGetLocation}
                          disabled={isLocating}
                        >
                          {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                          Re-locate
                        </Button>
                      </div>
                    ) : locationPermission === "denied" ? (
                      <div className="bg-red-50 dark:bg-red-950/40 px-3 py-2 flex flex-col gap-1 text-red-700 dark:text-red-400 border-t border-red-100 dark:border-red-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <X className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold">Location Access Denied</span>
                          </div>
                          <Button 
                            type="button"
                            variant="link" 
                            className="h-auto p-0 text-[10px] text-red-600 underline"
                            onClick={handleGetLocation}
                          >
                            Try Again
                          </Button>
                        </div>
                        <p className="text-[10px] opacity-80 leading-tight">Please enable location access in your browser settings and refresh the page to use GPS pinning.</p>
                      </div>
                    ) : (
                      <div className="bg-muted px-3 py-2 flex items-center justify-between text-muted-foreground border-t border-border">
                        <span className="text-xs">{locationPermission === "prompt" ? "GPS permission required" : "Tap the map or use GPS"}</span>
                        <Button
                          type="button"
                          variant={locationPermission === "prompt" ? "secondary" : "ghost"}
                          size="sm"
                          className={`h-6 text-xs gap-1 px-2 ${locationPermission === "prompt" ? "bg-primary text-white hover:bg-primary/90" : "hover:bg-accent"}`}
                          onClick={handleGetLocation}
                          disabled={isLocating}
                        >
                          {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                          {isLocating ? "Locating..." : locationPermission === "prompt" ? "Allow Location" : "Use GPS"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                    Additional Notes
                  </label>
                  <Textarea
                    placeholder="Describe what you found..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="resize-none bg-muted border-border focus-visible:ring-primary rounded-xl"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Note for Yes */}
        {answer === "yes" && (
          <div className="mt-6 w-full animate-in slide-in-from-top-4 fade-in duration-300">
            <Card className="rounded-[24px] border-none shadow-xl bg-card overflow-hidden">
              <CardContent className="p-5 space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                  Notes (Optional)
                </label>
                <Textarea
                  placeholder="Any observations?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none bg-muted border-border focus-visible:ring-primary rounded-xl"
                  rows={2}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Inline Bottom Action */}
      {answer && (
        <div className="w-full max-w-md mt-8 animate-in slide-in-from-bottom-4 duration-300">
          <Button
            className="w-full py-6 rounded-full text-lg font-bold gap-2 shadow-lg hover:scale-[1.02] transition-transform bg-primary hover:bg-primary/90 text-white"
            size="lg"
            onClick={handleNext}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : currentIndex === items.length - 1 ? "Complete Inspection" : "Next Item"}
          </Button>
        </div>
      )}

      {isCameraOpen && (
        <CameraCapture
          onCapture={(file) => {
            setEvidenceFile(file);
            setIsCameraOpen(false);
          }}
          onCancel={() => setIsCameraOpen(false)}
        />
      )}
    </div>
  );
}
