import React from 'react';
import { CloseIcon } from './icons';

interface HelpModalProps {
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const imageUrl = "https://i.ibb.co/Dgv81Vx8/Screenshot-2025-09-07-093512.png";

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl h-auto relative overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">How to Use Scene Blender</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close help dialog">
            <CloseIcon />
          </button>
        </div>
        <div className="p-4 bg-gray-900">
          <img 
            src={imageUrl} 
            alt="How to use guide: 1. Upload images. 2. Edit and draw on images. 3. Write a prompt. 4. Generate." 
            className="w-full h-auto rounded-md"
          />
        </div>
      </div>
    </div>
  );
};

export default HelpModal;