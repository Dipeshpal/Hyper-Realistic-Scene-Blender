import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { UploadedImage } from '../types';
import { PenIcon, CircleIcon, SquareIcon, EraserIcon, UndoIcon, MoveIcon, CloseIcon } from './icons';

type DrawingTool = 'pen' | 'circle' | 'box' | 'eraser' | 'move';
interface SelectionRect { x: number; y: number; width: number; height: number; }

interface ImageEditorModalProps {
  image: UploadedImage;
  onClose: () => void;
  onSave: (id: number, annotatedBase64: string) => void;
}

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ image, onClose, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Refs for drawing state
  const isDrawing = useRef(false);
  const isSelecting = useRef(false);
  const isMoving = useRef(false);
  const startCoords = useRef({ x: 0, y: 0 });
  const snapshot = useRef<ImageData | null>(null);
  const selectionRect = useRef<SelectionRect | null>(null);
  const selectedImageData = useRef<ImageData | null>(null);
  const moveStartOffset = useRef({ x: 0, y: 0 });

  // Component state
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('pen');
  const [drawingColor, setDrawingColor] = useState<string>('#ff0000');
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [canvasPosition, setCanvasPosition] = useState({ top: 0, left: 0 });

  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const newHistory = history.slice(0, historyIndex + 1);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([...newHistory, imageData]);
    setHistoryIndex(newHistory.length);
  }, [history, historyIndex]);

  const setupCanvas = useCallback(() => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;

    if (!img || !canvas || !container || !img.complete || img.naturalWidth === 0) {
        return;
    }

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imageNaturalWidth = img.naturalWidth;
    const imageNaturalHeight = img.naturalHeight;

    const imageAspectRatio = imageNaturalWidth / imageNaturalHeight;
    const containerAspectRatio = containerWidth / containerHeight;

    let renderedWidth, renderedHeight, renderedTop, renderedLeft;

    if (imageAspectRatio > containerAspectRatio) {
        renderedWidth = containerWidth;
        renderedHeight = containerWidth / imageAspectRatio;
        renderedLeft = 0;
        renderedTop = (containerHeight - renderedHeight) / 2;
    } else {
        renderedHeight = containerHeight;
        renderedWidth = containerHeight * imageAspectRatio;
        renderedLeft = (containerWidth - renderedWidth) / 2;
        renderedTop = 0;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const lastKnownState = history[historyIndex];
    
    if (canvas.width !== renderedWidth || canvas.height !== renderedHeight) {
        canvas.width = renderedWidth;
        canvas.height = renderedHeight;
        
        if (lastKnownState) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = lastKnownState.width;
            tempCanvas.height = lastKnownState.height;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
                tempCtx.putImageData(lastKnownState, 0, 0);
                ctx.drawImage(tempCanvas, 0, 0, renderedWidth, renderedHeight);
            }
        }
    }
    
    setCanvasPosition({ top: renderedTop, left: renderedLeft });
    
    if (history.length === 0 && canvas.width > 0) {
         const initialImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
         setHistory([initialImageData]);
         setHistoryIndex(0);
    }
  }, [history, historyIndex]);

  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;

    if (img.complete) {
        setupCanvas();
    } else {
        img.addEventListener('load', setupCanvas);
    }
    
    window.addEventListener('resize', setupCanvas);
    
    return () => {
        img.removeEventListener('load', setupCanvas);
        window.removeEventListener('resize', setupCanvas);
    }
  }, [setupCanvas]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    const prevState = history[newIndex];
    ctx.putImageData(prevState, 0, 0);
    selectionRect.current = null;
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const pos = getMousePos(e);
    startCoords.current = pos;
    snapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (drawingTool === 'move') {
        if (selectionRect.current && pos.x > selectionRect.current.x && pos.x < selectionRect.current.x + selectionRect.current.width && pos.y > selectionRect.current.y && pos.y < selectionRect.current.y + selectionRect.current.height) {
            isMoving.current = true;
            selectedImageData.current = ctx.getImageData(selectionRect.current.x, selectionRect.current.y, selectionRect.current.width, selectionRect.current.height);
            ctx.clearRect(selectionRect.current.x, selectionRect.current.y, selectionRect.current.width, selectionRect.current.height);
            moveStartOffset.current = { x: pos.x - selectionRect.current.x, y: pos.y - selectionRect.current.y };
        } else {
            isSelecting.current = true;
            selectionRect.current = null;
        }
    } else {
        isDrawing.current = true;
        ctx.beginPath();
        ctx.lineWidth = drawingTool === 'eraser' ? 20 : 5;
        ctx.strokeStyle = drawingColor;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalCompositeOperation = drawingTool === 'eraser' ? 'destination-out' : 'source-over';
        if(drawingTool === 'pen' || drawingTool === 'eraser') {
            ctx.moveTo(pos.x, pos.y);
        }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !snapshot.current) return;
    const currentPos = getMousePos(e);

    if (isDrawing.current) {
        ctx.putImageData(snapshot.current, 0, 0);
        if (drawingTool === 'pen' || drawingTool === 'eraser') {
            ctx.lineTo(currentPos.x, currentPos.y);
            ctx.stroke();
        } else if (drawingTool === 'circle') {
            ctx.beginPath();
            const radius = Math.sqrt(Math.pow(currentPos.x - startCoords.current.x, 2) + Math.pow(currentPos.y - startCoords.current.y, 2));
            ctx.arc(startCoords.current.x, startCoords.current.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
        } else if (drawingTool === 'box') {
            ctx.strokeRect(startCoords.current.x, startCoords.current.y, currentPos.x - startCoords.current.x, currentPos.y - startCoords.current.y);
        }
    } else if (isSelecting.current) {
        ctx.putImageData(snapshot.current, 0, 0);
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(startCoords.current.x, startCoords.current.y, currentPos.x - startCoords.current.x, currentPos.y - startCoords.current.y);
        ctx.setLineDash([]);
    } else if (isMoving.current && selectedImageData.current) {
        ctx.putImageData(snapshot.current, 0, 0);
        ctx.putImageData(selectedImageData.current, currentPos.x - moveStartOffset.current.x, currentPos.y - moveStartOffset.current.y);
    }
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    if (isDrawing.current) {
        isDrawing.current = false;
        ctx.globalCompositeOperation = 'source-over';
        saveState();
    } else if (isSelecting.current) {
        isSelecting.current = false;
        const currentPos = getMousePos(e);
        selectionRect.current = {
            x: Math.min(startCoords.current.x, currentPos.x),
            y: Math.min(startCoords.current.y, currentPos.y),
            width: Math.abs(currentPos.x - startCoords.current.x),
            height: Math.abs(currentPos.y - startCoords.current.y),
        };
    } else if (isMoving.current) {
        isMoving.current = false;
        saveState();
    }
  };
  
  const handleSave = () => {
    const editorCanvas = canvasRef.current;
    const baseImg = imageRef.current;
    if (!editorCanvas || !baseImg || !image.mimeType) return;
    
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = baseImg.naturalWidth;
    finalCanvas.height = baseImg.naturalHeight;
    const finalCtx = finalCanvas.getContext('2d');
    
    if (!finalCtx) return;
    
    // 1. Draw original full-resolution image
    finalCtx.drawImage(baseImg, 0, 0);
    
    // 2. Draw the annotation canvas on top, scaling it to fit
    finalCtx.drawImage(editorCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
    
    const newBase64 = finalCanvas.toDataURL(image.mimeType).split(',')[1];
    onSave(image.id, newBase64);
  };

  const tools: { name: DrawingTool, icon: React.FC<{ className?: string }> }[] = [
    { name: 'pen', icon: PenIcon },
    { name: 'circle', icon: CircleIcon },
    { name: 'box', icon: SquareIcon },
    { name: 'eraser', icon: EraserIcon },
    { name: 'move', icon: MoveIcon },
  ];
  
  const imageSrc = image.annotatedBase64 
    ? `data:${image.mimeType};base64,${image.annotatedBase64}`
    : `data:${image.mimeType};base64,${image.base64}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Edit Image {image.id}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
                <CloseIcon />
            </button>
        </div>
        <div className="flex-grow p-4 relative flex items-center justify-center min-h-0">
            <div className="relative w-full h-full">
                <img
                    ref={imageRef}
                    src={imageSrc}
                    alt={`Editing image ${image.id}`}
                    className="w-full h-full object-contain pointer-events-none"
                    crossOrigin="anonymous"
                />
                <canvas
                    ref={canvasRef}
                    style={{ top: canvasPosition.top, left: canvasPosition.left }}
                    className={`absolute ${drawingTool === 'move' ? 'cursor-move' : 'cursor-crosshair'}`}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                />
            </div>
        </div>
        <div className="p-4 border-t border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
                {tools.map(({ name, icon: Icon }) => (
                    <button key={name} onClick={() => setDrawingTool(name)} className={`p-2 rounded-md ${drawingTool === name ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`} title={`Select ${name} tool`}>
                        <Icon className="w-5 h-5" />
                    </button>
                ))}
                <input type="color" value={drawingColor} onChange={e => setDrawingColor(e.target.value)} className="w-9 h-9 p-0.5 bg-transparent border-none rounded-md cursor-pointer" title="Select color"/>
                <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed" title="Undo">
                    <UndoIcon className="w-5 h-5" />
                </button>
            </div>
            <div>
                <button onClick={onClose} className="px-6 py-2 text-gray-300 font-semibold rounded-md hover:bg-gray-700 mr-2">Cancel</button>
                <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Save</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditorModal;
