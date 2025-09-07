import React, { useRef } from 'react';
import type { UploadedImage } from '../types';
import { UploadIcon, EditIcon, TrashIcon } from './icons';

interface ImageSlotProps {
  image: UploadedImage;
  onImageChange: (id: number, file: File) => void;
  onEdit: (id: number) => void;
  onImageRemove: (id: number) => void;
}

const ImageSlot: React.FC<ImageSlotProps> = ({ image, onImageChange, onEdit, onImageRemove }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onImageChange(image.id, event.target.files[0]);
    }
  };

  const handleClick = () => {
    if (!image.base64) {
      fileInputRef.current?.click();
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); event.stopPropagation();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      onImageChange(image.id, event.dataTransfer.files[0]);
    }
  };
  
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); event.stopPropagation();
  };

  const displayImageSrc = image.annotatedBase64 
    ? `data:${image.mimeType};base64,${image.annotatedBase64}`
    : image.base64 
    ? `data:${image.mimeType};base64,${image.base64}`
    : null;

  return (
    <div className="w-full aspect-square relative rounded-lg bg-gray-800 border-2 border-dashed border-gray-600 flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-400 transition-all duration-300 overflow-hidden group"
      onDrop={handleDrop} onDragOver={handleDragOver}>
      
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
      
      {displayImageSrc ? (
        <img
            src={displayImageSrc}
            alt={`Input ${image.id}`}
            className="w-full h-full object-contain"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-center cursor-pointer" onClick={handleClick}>
          <UploadIcon className="w-10 h-10 mx-auto" />
          <p className="mt-2 text-sm">Click or drop image here</p>
        </div>
      )}

      <div className="absolute top-2 left-2 bg-gray-900 bg-opacity-70 text-white text-xs font-bold px-2 py-1 rounded">
        Image {image.id}
      </div>
      
      {image.base64 && (
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center gap-4">
            <button
                onClick={() => onEdit(image.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                aria-label={`Edit Image ${image.id}`}
            >
                <EditIcon />
                Edit
            </button>
            <button
                onClick={() => onImageRemove(image.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"
                aria-label={`Remove Image ${image.id}`}
            >
                <TrashIcon />
                Remove
            </button>
        </div>
      )}
    </div>
  );
};

export default ImageSlot;