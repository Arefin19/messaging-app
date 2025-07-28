// components/FileUpload.jsx - Enhanced file upload components

import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFile,
  faImage,
  faVideo,
  faMusic,
  faFileArchive,
  faCode,
  faFilePdf,
  faFileWord,
  faFileExcel,
  faFilePowerpoint,
  faTimes,
  faDownload,
  faEye,
  faSpinner,
  faCloudUpload,
  faPlus
} from '@fortawesome/free-solid-svg-icons';
import { 
  validateFile, 
  formatFileSize, 
  getFileTypeDisplay, 
  canPreviewFile,
  FILE_TYPES 
} from '../utils/fileUpload';

/**
 * File Preview Component - Shows selected files before upload
 */
export const FilePreview = ({ 
  file, 
  fileInfo, 
  onRemove, 
  uploadProgress = null, 
  isUploading = false,
  error = null 
}) => {
  const [preview, setPreview] = useState(null);

  React.useEffect(() => {
    if (file && fileInfo?.config?.category === 'image') {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  }, [file, fileInfo]);

  if (!file || !fileInfo) return null;

  const { icon, color } = getFileTypeDisplay(fileInfo.fileType);

  return (
    <div className="relative inline-block mr-2 mb-2 group">
      <div className={`w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex flex-col items-center justify-center p-2 ${
        isUploading ? 'opacity-60' : ''
      } ${error ? 'border-red-300 bg-red-50' : ''}`}>
        
        {/* Image preview */}
        {preview ? (
          <img 
            src={preview} 
            alt="Preview" 
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <>
            {/* File icon */}
            <div className={`text-${color}-500 text-xl mb-1`}>
              {icon}
            </div>
            
            {/* File extension */}
            <div className="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
              {file.name.split('.').pop()}
            </div>
          </>
        )}
        
        {/* Upload progress overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <FontAwesomeIcon icon={faSpinner} className="text-white animate-spin mb-1" />
              <div className="text-xs text-white">
                {uploadProgress || 'Uploading...'}
              </div>
            </div>
          </div>
        )}
        
        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 bg-red-500 bg-opacity-20 rounded-lg flex items-center justify-center">
            <div className="text-xs text-red-600 text-center p-1">
              Error
            </div>
          </div>
        )}
      </div>
      
      {/* File info */}
      <div className="mt-1 text-center">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-20">
          {file.name}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formatFileSize(file.size)}
        </div>
      </div>
      
      {/* Remove button */}
      {!isUploading && (
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
          title="Remove file"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      )}
      
      {/* Error tooltip */}
      {error && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {error}
        </div>
      )}
    </div>
  );
};

/**
 * File Upload Button Component
 */
export const FileUploadButton = ({ 
  onFileSelect, 
  disabled = false, 
  maxFiles = 5,
  selectedCount = 0,
  acceptedTypes = 'all' // 'all', 'images', 'documents', etc.
}) => {
  const fileInputRef = useRef(null);

  const getAcceptString = (types) => {
    if (types === 'all') {
      return Object.values(FILE_TYPES)
        .flatMap(config => config.extensions)
        .map(ext => `.${ext}`)
        .join(',');
    }
    
    if (types === 'images') {
      return FILE_TYPES.IMAGE.extensions.map(ext => `.${ext}`).join(',');
    }
    
    if (types === 'documents') {
      return [
        ...FILE_TYPES.DOCUMENT.extensions,
        ...FILE_TYPES.SPREADSHEET.extensions,
        ...FILE_TYPES.PRESENTATION.extensions
      ].map(ext => `.${ext}`).join(',');
    }
    
    return types;
  };

  const handleClick = () => {
    if (!disabled && selectedCount < maxFiles) {
      fileInputRef.current?.click();
    }
  };

  const isDisabled = disabled || selectedCount >= maxFiles;

  return (
    <>
      <button 
        className={`p-2 rounded-full transition-colors ${
          isDisabled
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
        onClick={handleClick}
        disabled={isDisabled}
        title={
          selectedCount >= maxFiles 
            ? `Maximum ${maxFiles} files allowed` 
            : 'Add files'
        }
      >
        <FontAwesomeIcon icon={faCloudUpload} />
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptString(acceptedTypes)}
        multiple
        onChange={onFileSelect}
        className="hidden"
      />
    </>
  );
};

/**
 * File Drop Zone Component
 */
export const FileDropZone = ({ 
  onFilesDrop, 
  children, 
  disabled = false,
  className = "",
  acceptedTypes = 'all'
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesDrop(files);
    }
  };

  return (
    <div
      className={`${className} ${
        isDragOver && !disabled
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
          : ''
      } transition-colors duration-200`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      
      {isDragOver && !disabled && (
        <div className="absolute inset-0 border-2 border-dashed border-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <FontAwesomeIcon icon={faCloudUpload} className="text-3xl text-blue-500 mb-2" />
            <p className="text-blue-600 dark:text-blue-400 font-medium">
              Drop files here to upload
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Uploaded File Display Component - Shows files in messages
 */
export const UploadedFileDisplay = ({ 
  fileInfo, 
  onDownload, 
  onPreview, 
  compact = false,
  showPreview = true 
}) => {
  if (!fileInfo) return null;

  const { icon, color } = getFileTypeDisplay(fileInfo.fileType);
  const canPreview = showPreview && canPreviewFile(fileInfo.fileType, fileInfo.name);

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm max-w-xs">
        <span className={`text-${color}-500`}>{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-800 dark:text-gray-200 truncate">
            {fileInfo.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {formatFileSize(fileInfo.size)}
          </div>
        </div>
        <div className="flex gap-1">
          {canPreview && (
            <button
              onClick={() => onPreview?.(fileInfo)}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
              title="Preview"
            >
              <FontAwesomeIcon icon={faEye} className="text-xs" />
            </button>
          )}
          <button
            onClick={() => onDownload?.(fileInfo)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
            title="Download"
          >
            <FontAwesomeIcon icon={faDownload} className="text-xs" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4 max-w-sm">
      <div className="flex items-start gap-3">
        {/* File icon */}
        <div className={`text-${color}-500 text-2xl flex-shrink-0 mt-1`}>
          {icon}
        </div>
        
        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-800 dark:text-gray-200 break-words">
            {fileInfo.name}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {formatFileSize(fileInfo.size)} • {fileInfo.config?.category || 'File'}
          </div>
          {fileInfo.uploadedAt && (
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {new Date(fileInfo.uploadedAt).toLocaleString()}
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex flex-col gap-1">
          {canPreview && (
            <button
              onClick={() => onPreview?.(fileInfo)}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              title="Preview"
            >
              <FontAwesomeIcon icon={faEye} />
            </button>
          )}
          <button
            onClick={() => onDownload?.(fileInfo)}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            title="Download"
          >
            <FontAwesomeIcon icon={faDownload} />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * File Type Selector Component
 */
export const FileTypeSelector = ({ 
  selectedTypes, 
  onTypeChange, 
  className = "" 
}) => {
  const typeOptions = [
    { key: 'all', label: 'All Files', icon: faFile },
    { key: 'images', label: 'Images', icon: faImage },
    { key: 'documents', label: 'Documents', icon: faFilePdf },
    { key: 'videos', label: 'Videos', icon: faVideo },
    { key: 'audio', label: 'Audio', icon: faMusic },
    { key: 'archives', label: 'Archives', icon: faFileArchive },
    { key: 'code', label: 'Code', icon: faCode }
  ];

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {typeOptions.map(option => (
        <button
          key={option.key}
          onClick={() => onTypeChange(option.key)}
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm border transition-colors ${
            selectedTypes.includes(option.key)
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <FontAwesomeIcon icon={option.icon} className="text-xs" />
          {option.label}
        </button>
      ))}
    </div>
  );
};