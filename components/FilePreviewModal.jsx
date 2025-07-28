// components/FilePreviewModal.jsx - Modal for previewing and managing files
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faDownload,
  faShare,
  faTrash,
  faExpand,
  faCompress,
  faPlay,
  faPause,
  faVolumeUp,
  faVolumeMute,
  faSpinner,
  faExclamationTriangle,
  faCheckCircle,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { formatFileSize, getFileAge, trackFileDownload, deleteFileCompletely } from '../utlis/fileOperations';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebaseconfig';

// Image Preview Component
const ImagePreview = ({ file, isFullscreen, onToggleFullscreen }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'w-full h-96'} flex items-center justify-center`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <FontAwesomeIcon icon={faSpinner} className="text-2xl text-gray-400 animate-spin" />
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-red-500">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl" />
          <span className="ml-2">Failed to load image</span>
        </div>
      )}
      
      <img
        src={file.url}
        alt={file.name}
        className={`max-w-full max-h-full object-contain ${loading ? 'invisible' : 'visible'} cursor-pointer`}
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
        onClick={onToggleFullscreen}
      />
      
      {isFullscreen && (
        <button
          onClick={onToggleFullscreen}
          className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors"
        >
          <FontAwesomeIcon icon={faCompress} />
        </button>
      )}
      
      {!isFullscreen && !loading && !error && (
        <button
          onClick={onToggleFullscreen}
          className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70 transition-colors"
        >
          <FontAwesomeIcon icon={faExpand} className="text-sm" />
        </button>
      )}
    </div>
  );
};

// Video Preview Component
const VideoPreview = ({ file }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="relative w-full h-96 bg-black flex items-center justify-center">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <FontAwesomeIcon icon={faSpinner} className="text-2xl text-white animate-spin" />
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-red-500">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl" />
          <span className="ml-2">Failed to load video</span>
        </div>
      )}
      
      <video
        src={file.url}
        controls
        className={`max-w-full max-h-full ${loading ? 'invisible' : 'visible'}`}
        onLoadedData={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

// Audio Preview Component
const AudioPreview = ({ file }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  return (
    <div className="w-full h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center relative overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <FontAwesomeIcon icon={faSpinner} className="text-2xl text-white animate-spin" />
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl" />
          <span className="ml-2">Failed to load audio</span>
        </div>
      )}
      
      <div className="flex items-center space-x-4 text-white">
        <div className="text-4xl">🎵</div>
        <div>
          <p className="font-medium">{file.name}</p>
          <p className="text-sm opacity-75">Audio File</p>
        </div>
      </div>
      
      <audio
        src={file.url}
        controls
        className="absolute bottom-2 left-2 right-2"
        onLoadedData={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        Your browser does not support the audio tag.
      </audio>
    </div>
  );
};

// PDF Preview Component
const PDFPreview = ({ file }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="relative w-full h-96">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <FontAwesomeIcon icon={faSpinner} className="text-2xl text-gray-400 animate-spin" />
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-red-500 bg-gray-100">
          <div className="text-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl mb-2" />
            <p>PDF preview not available</p>
            <button
              onClick={() => window.open(file.url, '_blank')}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Open in New Tab
            </button>
          </div>
        </div>
      )}
      
      <iframe
        src={`${file.url}#view=FitH`}
        className={`w-full h-full border-0 ${loading ? 'invisible' : 'visible'}`}
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
        title={file.name}
      />
    </div>
  );
};

// Text Preview Component
const TextPreview = ({ file }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchTextContent = async () => {
      try {
        const response = await fetch(file.url);
        if (!response.ok) throw new Error('Failed to fetch');
        
        const text = await response.text();
        setContent(text);
      } catch (error) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchTextContent();
  }, [file.url]);

  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <FontAwesomeIcon icon={faSpinner} className="text-2xl text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-96 flex items-center justify-center text-red-500 bg-gray-100">
        <div className="text-center">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl mb-2" />
          <p>Text preview not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-96 bg-white border rounded overflow-auto">
      <pre className="p-4 text-sm whitespace-pre-wrap font-mono">{content}</pre>
    </div>
  );
};

// File Info Component
const FileInfo = ({ file, onDelete, canDelete }) => {
  const [user] = useAuthState(auth);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!canDelete || deleting) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete "${file.name}"?`);
    if (!confirmed) return;
    
    setDeleting(true);
    const success = await onDelete();
    if (!success) {
      setDeleting(false);
    }
  };

  const handleDownload = async () => {
    // Track download
    if (file.metadataId && user?.email) {
      await trackFileDownload(file.metadataId, user.email);
    }
    
    // Trigger download
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate" title={file.name}>
            {file.name}
          </h3>
          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
            <span>{formatFileSize(file.size)}</span>
            <span>•</span>
            <span>{file.category || 'Unknown'}</span>
            {file.uploadedAt && (
              <>
                <span>•</span>
                <span>{getFileAge(file.uploadedAt)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Security Status */}
      {file.virusScanStatus && (
        <div className="flex items-center space-x-2">
          {file.virusScanStatus === 'clean' && (
            <>
              <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400">Verified Safe</span>
            </>
          )}
          {file.virusScanStatus === 'pending' && (
            <>
              <FontAwesomeIcon icon={faSpinner} className="text-yellow-500 animate-spin" />
              <span className="text-sm text-yellow-600 dark:text-yellow-400">Security Scan Pending</span>
            </>
          )}
          {file.virusScanStatus === 'infected' && (
            <>
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400">Security Risk Detected</span>
            </>
          )}
        </div>
      )}

      {/* Upload Info */}
      {file.uploadedBy && (
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
          <FontAwesomeIcon icon={faInfoCircle} className="text-gray-400" />
          <span>Uploaded by {file.uploadedBy === user?.email ? 'you' : file.uploadedBy}</span>
        </div>
      )}

      {/* Download Count */}
      {file.downloadCount > 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Downloaded {file.downloadCount} time{file.downloadCount !== 1 ? 's' : ''}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2 pt-2">
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <FontAwesomeIcon icon={faDownload} />
          <span>Download</span>
        </button>
        
        <button
          onClick={() => window.open(file.url, '_blank')}
          className="flex items-center justify-center px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <FontAwesomeIcon icon={faShare} />
        </button>
        
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center justify-center px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg transition-colors"
          >
            {deleting ? (
              <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
            ) : (
              <FontAwesomeIcon icon={faTrash} />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

// Main File Preview Modal Component
const FilePreviewModal = ({ 
  isOpen, 
  onClose, 
  file, 
  onDelete,
  canDelete = false 
}) => {
  const [user] = useAuthState(auth);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isOpen || !file) return null;

  const handleDelete = async () => {
    if (!file.metadataId || !file.storageRef) return false;
    
    const success = await deleteFileCompletely(
      file.metadataId, 
      file.storageRef, 
      user?.email
    );
    
    if (success && onDelete) {
      onDelete(file);
      onClose();
    }
    
    return success;
  };

  const renderPreview = () => {
    if (!file.type) return null;

    if (file.type.startsWith('image/')) {
      return (
        <ImagePreview 
          file={file} 
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        />
      );
    }

    if (file.type.startsWith('video/')) {
      return <VideoPreview file={file} />;
    }

    if (file.type.startsWith('audio/')) {
      return <AudioPreview file={file} />;
    }

    if (file.type === 'application/pdf') {
      return <PDFPreview file={file} />;
    }

    if (file.type.startsWith('text/')) {
      return <TextPreview file={file} />;
    }

    // Default: show file info only
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-6xl mb-4">📄</div>
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
          Preview not available
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Click download to view this file
        </p>
      </div>
    );
  };

  if (isFullscreen) {
    return renderPreview();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate flex-1 mr-4">
            {file.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Preview */}
          <div className="w-full">
            {renderPreview()}
          </div>

          {/* File Information */}
          <FileInfo 
            file={file} 
            onDelete={handleDelete}
            canDelete={canDelete && file.uploadedBy === user?.email}
          />
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;