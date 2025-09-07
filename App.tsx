import React, { useState, useCallback, useMemo } from 'react';
import type { UploadedImage } from './types';
import { MAX_IMAGES } from './constants';
import { generateScene, enhanceImage } from './services/geminiService';
import ImageSlot from './components/ImageSlot';
import ImageEditorModal from './components/ImageEditorModal';
import HelpModal from './components/HelpModal';
import Spinner from './components/Spinner';
import { SparklesIcon, DownloadIcon, SwitchIcon, QuestionMarkIcon } from './components/icons';

const App: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>(
    Array.from({ length: MAX_IMAGES }, (_, i) => ({
      id: i + 1,
      file: null,
      base64: null,
      annotatedBase64: null,
      mimeType: null,
    }))
  );
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [showResult, setShowResult] = useState<boolean>(true);
  
  const [editingImageId, setEditingImageId] = useState<number | null>(null);
  const imageToEdit = useMemo(() => images.find(img => img.id === editingImageId) || null, [images, editingImageId]);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  const handleImageChange = (id: number, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setImages(prevImages =>
        prevImages.map(img =>
          img.id === id ? { id, file, base64: base64String, annotatedBase64: null, mimeType: file.type } : img
        )
      );
    };
    reader.readAsDataURL(file);
  };
  
  const handleImageRemove = (id: number) => {
    setImages(prevImages =>
      prevImages.map(img =>
        img.id === id
          ? { id: img.id, file: null, base64: null, annotatedBase64: null, mimeType: null }
          : img
      )
    );
  };

  const handleSaveAnnotation = (id: number, annotatedBase64: string) => {
    setImages(prevImages =>
      prevImages.map(img =>
        img.id === id ? { ...img, annotatedBase64 } : img
      )
    );
    setEditingImageId(null);
  };

  const uploadedImages = useMemo(() => images.filter(img => img.file), [images]);

  const canGenerate = useMemo(() => uploadedImages.length > 0 && prompt.trim().length > 0 && !isLoading, [uploadedImages, prompt, isLoading]);

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    setIsLoading(true);
    setLoadingMessage('Blending your scene... this may take a moment.');
    setError(null);
    setResultImage(null);

    try {
      const result = await generateScene(uploadedImages, prompt);
      setResultImage(result);
      setShowResult(true);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [canGenerate, uploadedImages, prompt]);

  const handleEnhance = useCallback(async (enhancement: string) => {
      if (!resultImage || isLoading) return;
      setIsLoading(true);
      setLoadingMessage(`Applying ${enhancement.toLowerCase()}...`);
      setError(null);
      try {
          const newResult = await enhanceImage(resultImage, `Make the image more ${enhancement}`);
          setResultImage(newResult);
          setShowResult(true);
      } catch (err) {
          console.error(err);
          setError(err instanceof Error ? err.message : 'An unknown error occurred during enhancement.');
      } finally {
          setIsLoading(false);
      }
  }, [resultImage, isLoading]);

  const renderHeader = () => (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center gap-2">
        <SparklesIcon className="w-10 h-10 text-blue-400" />
        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Hyper-Realistic Scene Blender
        </h1>
      </div>
      <p className="mt-4 text-lg text-gray-400 max-w-3xl mx-auto">
        Upload your images, draw annotations to guide the AI, describe the final scene, and create a stunning composition.
      </p>
      <div className="mt-4">
        <button 
          onClick={() => setShowHelpModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors"
        >
          <QuestionMarkIcon />
          How to use
        </button>
      </div>
    </div>
  );
  
  const renderInputSection = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {images.map(image => (
          <ImageSlot 
            key={image.id} 
            image={image} 
            onImageChange={handleImageChange}
            onEdit={(id) => setEditingImageId(id)}
            onImageRemove={handleImageRemove}
          />
        ))}
      </div>
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
            Describe your desired scene
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g., 'Place the person from Image 1 in the chair from Image 2. Use the red circle as the focal point.'"
            rows={4}
            className="w-full bg-gray-700 border-gray-600 rounded-md text-gray-200 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
        <div className="mt-6 text-right">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
          >
            <SparklesIcon className="w-5 h-5" />
            Generate Scene
          </button>
        </div>
      </div>
    </>
  );

  const renderResultSection = () => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Your Creation</h2>
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setShowResult(!showResult)}
                    className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition"
                    title={showResult ? "Show Original Images" : "Show Generated Result"}
                >
                    <SwitchIcon />
                    <span>{showResult ? 'Before' : 'After'}</span>
                </button>
                <a
                    href={`data:${resultImage?.mimeType};base64,${resultImage?.base64}`}
                    download="scene-blender-result.png"
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-all"
                >
                    <DownloadIcon />
                    Download
                </a>
            </div>
        </div>
        <div className="aspect-video w-full bg-gray-900 rounded-md overflow-hidden flex items-center justify-center">
            {showResult && resultImage ? (
                <img src={`data:${resultImage.mimeType};base64,${resultImage.base64}`} alt="Generated Scene" className="max-h-full max-w-full object-contain" />
            ) : (
                <div className="grid grid-cols-2 gap-2 p-2 w-full h-full">
                    {uploadedImages.map(img => (
                        <div key={img.id} className="relative w-full h-full bg-gray-700 rounded-sm">
                            <img src={`data:${img.mimeType};base64,${img.annotatedBase64 || img.base64}`} alt={`Input ${img.id}`} className="w-full h-full object-contain" />
                        </div>
                    ))}
                </div>
            )}
        </div>
        <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-300 mb-2">One-Click Enhancements</h3>
            <div className="flex flex-wrap gap-4">
                <button onClick={() => handleEnhance('Cinematic')} className="flex-1 px-4 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-blue-600 hover:text-white transition">Make it more Cinematic</button>
                <button onClick={() => handleEnhance('Photorealistic')} className="flex-1 px-4 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-purple-600 hover:text-white transition">Boost Photorealism</button>
            </div>
        </div>
        <div className="mt-6 text-center">
            <button onClick={() => setResultImage(null)} className="text-gray-400 hover:text-white transition">
                + Create a new scene
            </button>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {renderHeader()}
        
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-6" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
              <svg className="fill-current h-6 w-6 text-red-400" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96">
            <Spinner />
            <p className="mt-4 text-lg text-gray-300">{loadingMessage}</p>
          </div>
        ) : resultImage ? (
            renderResultSection()
        ) : (
            renderInputSection()
        )}
      </div>

      {showHelpModal && (
        <HelpModal onClose={() => setShowHelpModal(false)} />
      )}

      {imageToEdit && (
        <ImageEditorModal
            image={imageToEdit}
            onClose={() => setEditingImageId(null)}
            onSave={handleSaveAnnotation}
        />
      )}
    </div>
  );
};

export default App;