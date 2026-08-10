"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Circle, Eraser, Minus, Pencil, Redo2, Undo2 } from "@/components/icons";

type DrawTool = "pen" | "circle" | "arrow";

interface ImageAnnotatorProps {
  open: boolean;
  imageFile: File | null;
  onClose: () => void;
  onSave: (annotatedFile: File) => void;
}

interface Stroke {
  tool: DrawTool;
  color: string;
  lineWidth: number;
  points: { x: number; y: number }[];
}

export default function ImageAnnotator({
  open,
  imageFile,
  onClose,
  onSave,
}: ImageAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<DrawTool>("pen");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !imageFile) return;
    setStrokes([]);
    setRedoStack([]);
    setCurrentStroke(null);
    setImageLoaded(false);
    const url = URL.createObjectURL(imageFile);
    const img = new Image();
    img.onload = () => {
      setImageEl(img);
      setImageLoaded(true);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [open, imageFile]);

  const getCanvasPoint = (
    e: React.PointerEvent<HTMLCanvasElement>
  ): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const drawStroke = useCallback(
    (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
      if (stroke.points.length < 1) return;
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const pts = stroke.points;
      if (stroke.tool === "pen") {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
        return;
      }

      if (pts.length < 2) return;
      const start = pts[0];
      const end = pts[pts.length - 1];

      if (stroke.tool === "circle") {
        const rx = Math.abs(end.x - start.x) / 2;
        const ry = Math.abs(end.y - start.y) / 2;
        const cx = (start.x + end.x) / 2;
        const cy = (start.y + end.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(rx, 8), Math.max(ry, 8), 0, 0, Math.PI * 2);
        ctx.stroke();
        return;
      }

      if (stroke.tool === "arrow") {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const head = 14;
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
          end.x - head * Math.cos(angle - Math.PI / 6),
          end.y - head * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          end.x - head * Math.cos(angle + Math.PI / 6),
          end.y - head * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }
    },
    []
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageEl;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    [...strokes, ...(currentStroke ? [currentStroke] : [])].forEach((s) =>
      drawStroke(ctx, s)
    );
  }, [strokes, currentStroke, imageEl, drawStroke]);

  useEffect(() => {
    if (!imageLoaded || !imageEl || !containerRef.current) return;
    const container = containerRef.current;
    const maxW = Math.min(container.clientWidth, 720);
    const ratio = imageEl.height / imageEl.width;
    const w = maxW;
    const h = w * ratio;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = w;
    canvas.height = h;
    redraw();
  }, [imageLoaded, imageEl, redraw, open]);

  useEffect(() => {
    redraw();
  }, [strokes, currentStroke, redraw]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getCanvasPoint(e);
    setCurrentStroke({
      tool,
      color: "#dc2626",
      lineWidth: tool === "pen" ? 3 : 4,
      points: [pt],
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentStroke) return;
    const pt = getCanvasPoint(e);
    setCurrentStroke((prev) =>
      prev
        ? {
            ...prev,
            points:
              prev.tool === "pen"
                ? [...prev.points, pt]
                : [prev.points[0], pt],
          }
        : null
    );
  };

  const handlePointerUp = () => {
    if (!currentStroke) return;
    setStrokes((s) => [...s, currentStroke]);
    setRedoStack([]);
    setCurrentStroke(null);
  };

  const handleUndo = () => {
    setStrokes((s) => {
      if (s.length === 0) return s;
      const last = s[s.length - 1];
      setRedoStack((r) => [...r, last]);
      return s.slice(0, -1);
    });
  };

  const handleRedo = () => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const last = r[r.length - 1];
      setStrokes((s) => [...s, last]);
      return r.slice(0, -1);
    });
  };

  const handleClear = () => {
    setStrokes([]);
    setRedoStack([]);
    setCurrentStroke(null);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageFile) return;
    setIsSaving(true);
    try {
      redraw();
      await new Promise((r) => requestAnimationFrame(r));
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
      );
      if (!blob) throw new Error("Could not export image");
      const name = imageFile.name.replace(/\.[^.]+$/, "") + "-annotated.jpg";
      onSave(new File([blob], name, { type: "image/jpeg" }));
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-base">Annotate photo</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2 px-4 py-2 border-b bg-muted/40">
          <Button
            type="button"
            size="sm"
            variant={tool === "pen" ? "default" : "outline"}
            onClick={() => setTool("pen")}
            className="gap-1"
          >
            <Pencil className="w-3.5 h-3.5" /> Draw
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tool === "circle" ? "default" : "outline"}
            onClick={() => setTool("circle")}
            className="gap-1"
          >
            <Circle className="w-3.5 h-3.5" /> Circle
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tool === "arrow" ? "default" : "outline"}
            onClick={() => setTool("arrow")}
            className="gap-1"
          >
            <Minus className="w-3.5 h-3.5 rotate-45" /> Arrow
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleUndo}>
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleRedo}>
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleClear}>
            <Eraser className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div ref={containerRef} className="p-4 flex justify-center bg-zinc-100 dark:bg-zinc-900 min-h-[200px]">
          {!imageLoaded ? (
            <p className="text-sm text-muted-foreground py-12">Loading image…</p>
          ) : (
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto touch-none cursor-crosshair rounded-lg shadow-md bg-white"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          )}
        </div>
        <div className="flex gap-2 p-4 border-t justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || !imageLoaded}>
            {isSaving ? "Saving…" : "Apply annotations"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
