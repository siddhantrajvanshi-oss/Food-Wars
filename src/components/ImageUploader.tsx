import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  Image as ImageIcon,
  Sparkles,
  ArrowLeft,
  X,
  FileCheck,
  ChefHat,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { Recipe } from '../types';

interface ImageUploaderProps {
  recipe: Recipe;
  pantryIngredients: string;
  onSubmitForScoring: (photoBase64: string | undefined, photoMimeType: string | undefined, reflection: string) => Promise<void>;
  onBackToRecipe: () => void;
  isLoading: boolean;
  error?: string | null;
}

// Sample dish photos (clean SVGs/data URLs) for quick testing of multimodal grading
const SAMPLE_DISH_OPTIONS = [
  {
    name: 'Vibrant Sautéed Skillet Plate',
    mimeType: 'image/jpeg',
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    desc: 'Colorful bowl with sautéed greens, beans, and seeds',
  },
  {
    name: 'Rustic Stew & Warm Flatbread',
    mimeType: 'image/jpeg',
    url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80',
    desc: 'Warm spiced curry with caramelized aromatics',
  },
  {
    name: 'Golden Sizzled Vegetable Medley',
    mimeType: 'image/jpeg',
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
    desc: 'Crisp vegetables with light dressing and herbs',
  },
];

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  recipe,
  pantryIngredients,
  onSubmitForScoring,
  onBackToRecipe,
  isLoading,
  error,
}) => {
  const [photoBase64, setPhotoBase64] = useState<string | undefined>(undefined);
  const [photoMimeType, setPhotoMimeType] = useState<string | undefined>(undefined);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [reflection, setReflection] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      alert('Please upload a PNG, JPEG, or WebP image.');
      return;
    }

    setFileName(file.name);
    setPhotoMimeType(file.type);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPhotoBase64(result);
      setPreviewUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSampleSelect = async (sample: typeof SAMPLE_DISH_OPTIONS[0]) => {
    try {
      setPreviewUrl(sample.url);
      setFileName(sample.name);
      setPhotoMimeType(sample.mimeType);

      // Convert remote sample image to base64 for multimodal submission
      const resp = await fetch(sample.url);
      const blob = await resp.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBase64(reader.result as string);
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.warn('Could not load sample image to base64, using fallback reference', e);
      setPreviewUrl(sample.url);
      setFileName(sample.name);
    }
  };

  const removePhoto = () => {
    setPhotoBase64(undefined);
    setPhotoMimeType(undefined);
    setPreviewUrl(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Button enabled once an image or reflection is provided
  const isEnabled = (Boolean(photoBase64) || Boolean(previewUrl) || reflection.trim().length > 0) && !isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEnabled) return;
    onSubmitForScoring(photoBase64, photoMimeType, reflection);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 py-2">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToRecipe}
          className="inline-flex items-center gap-1.5 text-sm text-[#4C6055] hover:text-[#1C2B24] transition-colors cursor-pointer font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Recipe Checklist
        </button>

        <span className="text-xs font-semibold uppercase tracking-wider text-[#C97B4A] bg-[#FBEFE7] px-2.5 py-1 rounded-md border border-[#F3DAC8]">
          Stage 4: Dish Submission
        </span>
      </div>

      {/* Main Submission Card */}
      <div className="card-shell p-6 md:p-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#1C2B24]">
            Present Your Finished Challenge Meal
          </h2>
          <p className="text-sm text-[#4C6055] leading-relaxed">
            Upload a photo of your plated <strong className="text-[#1C2B24]">{recipe.dishName}</strong> and share
            your sensory reflections. The AI mentor will evaluate your dish objectively across ingredient efficiency,
            vegetable balance, and cultural technique.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload Area */}
          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wider text-[#1C2B24]">
              1. Plated Dish Photo (PNG, JPEG, or WebP)
            </label>

            {!previewUrl ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-[#2F5D50] bg-[#E7EFEA]'
                    : 'border-[#D9CFBE] bg-[#FAF8F3] hover:bg-[#F5F1E8]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />

                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-[#2F5D50] border border-[#E2DBD0]">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-[#1C2B24]">
                      Click to upload plate photo
                    </span>{' '}
                    <span className="text-sm text-[#4C6055]">or drag and drop</span>
                  </div>
                  <span className="text-xs text-[#4C6055]">
                    Supports PNG, JPG, or WebP up to 15MB
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl border border-[#E2DBD0] overflow-hidden bg-black/5">
                <img
                  src={previewUrl}
                  alt="Plated dish preview"
                  className="w-full max-h-72 object-cover"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors cursor-pointer"
                  title="Remove photo"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="p-3 bg-white border-t border-[#E2DBD0] flex items-center justify-between text-xs text-[#1C2B24]">
                  <span className="font-semibold truncate max-w-xs">{fileName}</span>
                  <span className="text-[#2F5D50] font-medium flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5" />
                    Ready for AI Evaluation
                  </span>
                </div>
              </div>
            )}

            {/* Quick Sample Photos for Testing */}
            {!previewUrl && (
              <div className="space-y-1.5 pt-1">
                <span className="text-xs text-[#4C6055] font-medium flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-[#C97B4A]" />
                  Testing without a camera? Pick a sample finished dish:
                </span>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_DISH_OPTIONS.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSampleSelect(sample)}
                      className="text-xs bg-white hover:bg-[#FAF8F3] text-[#1C2B24] border border-[#D9CFBE] rounded-md px-2.5 py-1.5 transition-colors cursor-pointer text-left flex items-center gap-1.5"
                    >
                      <span>🍲</span>
                      <span>{sample.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reflection Input */}
          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase tracking-wider text-[#1C2B24]">
              2. Cook&apos;s Reflection
            </label>
            <p className="text-xs text-[#4C6055]">
              How did it turn out? Note your thoughts on taste, texture, spices, or any impromptu
              swaps you made at the stove.
            </p>
            <textarea
              rows={4}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="e.g. The sauce was rich and nicely coated the veggies! The onions caramelized nicely, and the cumin brought out a wonderful smokiness. Next time I might add an extra pinch of chili."
              className="input-field w-full text-sm leading-relaxed"
            />
          </div>

          {/* Error notice */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Action or Loading State */}
          {isLoading ? (
            <div className="p-6 rounded-xl bg-[#FAF8F3] border border-[#E2DBD0] text-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#2F5D50] border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="font-bold text-[#1C2B24] text-base">
                AI Mentor is analyzing presentation, efficiency, and nutritional balance...
              </div>
              <p className="text-xs text-[#4C6055] max-w-md mx-auto">
                Inspecting color vibrancy, vegetable presence, plating technique, and adherence to
                authentic culinary traditions.
              </p>
            </div>
          ) : (
            <button
              type="submit"
              disabled={!isEnabled}
              className="btn-primary w-full py-3.5 text-base shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5 text-[#C97B4A]" />
              <span>Submit Dish for Challenge Score</span>
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
