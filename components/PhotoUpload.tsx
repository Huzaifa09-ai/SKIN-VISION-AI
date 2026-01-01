
import React, { useRef } from 'react';

interface PhotoUploadProps {
  onPhotoSelect: (base64: string) => void;
  isLoading: boolean;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ onPhotoSelect, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        onPhotoSelect(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl shadow-sm border border-emerald-50 mb-8">
      <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
        <i className="fa-solid fa-camera-retro text-4xl text-emerald-600"></i>
      </div>
      <h2 className="text-xl font-semibold text-slate-800 mb-2">Analyze Your Skin</h2>
      <p className="text-slate-500 text-center mb-8 max-w-xs">
        Take a clear selfie in natural light for the most accurate analysis.
      </p>
      
      <input
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className={`w-full py-4 rounded-2xl font-semibold text-white transition-all shadow-lg active:scale-95 ${
          isLoading 
            ? 'bg-slate-300 cursor-not-allowed' 
            : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <i className="fa-solid fa-spinner animate-spin"></i>
            Analyzing...
          </span>
        ) : (
          "Take a Selfie"
        )}
      </button>
      
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
        <i className="fa-solid fa-shield-halved"></i>
        <span>Photos are processed securely and not stored.</span>
      </div>
    </div>
  );
};

export default PhotoUpload;
