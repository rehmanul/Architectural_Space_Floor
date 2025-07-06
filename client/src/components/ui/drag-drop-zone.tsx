
import React, { useState, useRef } from 'react';
import { Upload, FileText, Image, File } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DragDropZoneProps {
  onFilesDrop: (files: File[]) => void;
  acceptedTypes?: string[];
  maxFiles?: number;
  maxSizeBytes?: number;
  className?: string;
}

export function DragDropZone({
  onFilesDrop,
  acceptedTypes = ['.dxf', '.dwg', '.png', '.jpg', '.jpeg', '.pdf'],
  maxFiles = 5,
  maxSizeBytes = 50 * 1024 * 1024, // 50MB
  className
}: DragDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setIsUploading(true);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return acceptedTypes.includes(extension) && file.size <= maxSizeBytes;
    }).slice(0, maxFiles);

    if (validFiles.length > 0) {
      onFilesDrop(validFiles);
    }

    setIsUploading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesDrop(files);
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'dxf':
      case 'dwg':
        return <FileText className="w-8 h-8" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
        return <Image className="w-8 h-8" />;
      default:
        return <File className="w-8 h-8" />;
    }
  };

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200',
        isDragOver
          ? 'border-blue-500 bg-blue-50 scale-105'
          : 'border-gray-300 hover:border-gray-400',
        isUploading && 'opacity-50 pointer-events-none',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-4">
        <div className={cn(
          'transition-transform duration-200',
          isDragOver ? 'scale-110' : 'scale-100'
        )}>
          <Upload className="w-12 h-12 text-gray-400" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-700">
            {isDragOver ? 'Drop files here' : 'Upload floor plans'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Drag and drop files or click to browse
          </p>
        </div>

        <div className="text-xs text-gray-400">
          <p>Supported formats: {acceptedTypes.join(', ')}</p>
          <p>Max file size: {Math.round(maxSizeBytes / (1024 * 1024))}MB</p>
        </div>
      </div>

      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <div className="animate-spin rounded-full w-8 h-8 border-2 border-gray-300 border-t-blue-600" />
        </div>
      )}
    </div>
  );
}
