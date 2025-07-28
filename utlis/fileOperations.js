// utils/fileOperations.js - File operations and metadata management
import { doc, updateDoc, increment, deleteDoc, getDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebaseconfig';

/**
 * Update file download count and last accessed time
 * @param {string} metadataId - File metadata document ID
 * @param {string} userEmail - User downloading the file
 * @returns {Promise<boolean>} - Success status
 */
export const trackFileDownload = async (metadataId, userEmail) => {
  try {
    if (!metadataId) return false;
    
    const metadataRef = doc(db, 'file-metadata', metadataId);
    
    await updateDoc(metadataRef, {
      downloadCount: increment(1),
      lastAccessed: new Date(),
      [`accessedBy.${userEmail.replace('.', '_')}`]: new Date()
    });
    
    console.log('✅ File download tracked:', metadataId);
    return true;
  } catch (error) {
    console.error('Failed to track file download:', error);
    return false;
  }
};

/**
 * Update virus scan status for a file
 * @param {string} metadataId - File metadata document ID
 * @param {string} status - Scan status ('pending', 'clean', 'infected', 'error')
 * @param {Object} scanResults - Optional scan results
 * @returns {Promise<boolean>} - Success status
 */
export const updateVirusScanStatus = async (metadataId, status, scanResults = null) => {
  try {
    if (!metadataId) return false;
    
    const metadataRef = doc(db, 'file-metadata', metadataId);
    const updateData = {
      virusScanStatus: status,
      lastScanned: new Date()
    };
    
    if (scanResults) {
      updateData.scanResults = scanResults;
    }
    
    await updateDoc(metadataRef, updateData);
    
    console.log('✅ Virus scan status updated:', { metadataId, status });
    return true;
  } catch (error) {
    console.error('Failed to update virus scan status:', error);
    return false;
  }
};

/**
 * Delete file and its metadata
 * @param {string} metadataId - File metadata document ID
 * @param {string} storageRef - Storage reference path
 * @param {string} userEmail - User requesting deletion
 * @returns {Promise<boolean>} - Success status
 */
export const deleteFileCompletely = async (metadataId, storageRef, userEmail) => {
  try {
    // First check if user has permission to delete
    if (metadataId) {
      const metadataDoc = await getDoc(doc(db, 'file-metadata', metadataId));
      if (metadataDoc.exists()) {
        const metadata = metadataDoc.data();
        if (metadata.uploadedBy !== userEmail) {
          throw new Error('Not authorized to delete this file');
        }
      }
    }
    
    // Delete from storage
    if (storageRef) {
      const fileRef = ref(storage, storageRef);
      await deleteObject(fileRef);
      console.log('✅ File deleted from storage:', storageRef);
    }
    
    // Delete metadata
    if (metadataId) {
      await deleteDoc(doc(db, 'file-metadata', metadataId));
      console.log('✅ File metadata deleted:', metadataId);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to delete file completely:', error);
    return false;
  }
};

/**
 * Get file metadata with additional computed properties
 * @param {string} metadataId - File metadata document ID
 * @returns {Promise<Object|null>} - Enhanced file metadata
 */
export const getEnhancedFileMetadata = async (metadataId) => {
  try {
    if (!metadataId) return null;
    
    const metadataDoc = await getDoc(doc(db, 'file-metadata', metadataId));
    
    if (!metadataDoc.exists()) {
      return null;
    }
    
    const metadata = metadataDoc.data();
    
    // Add computed properties
    const enhanced = {
      ...metadata,
      id: metadataDoc.id,
      // Calculate age
      ageInDays: metadata.uploadedAt ? 
        Math.floor((new Date() - metadata.uploadedAt.toDate()) / (1000 * 60 * 60 * 24)) : 0,
      // Format file size
      formattedSize: formatFileSize(metadata.fileSize),
      // Check if file is old (30+ days)
      isOld: metadata.uploadedAt ? 
        (new Date() - metadata.uploadedAt.toDate()) > (30 * 24 * 60 * 60 * 1000) : false,
      // Check if file is popular (10+ downloads)
      isPopular: (metadata.downloadCount || 0) >= 10,
      // Security status
      isSafe: metadata.virusScanStatus === 'clean',
      isPending: metadata.virusScanStatus === 'pending',
      isInfected: metadata.virusScanStatus === 'infected'
    };
    
    return enhanced;
  } catch (error) {
    console.error('Failed to get enhanced file metadata:', error);
    return null;
  }
};

/**
 * Clean up old file metadata (for automated cleanup)
 * @param {number} daysOld - Files older than this many days
 * @param {number} maxInactivity - Files not accessed for this many days
 * @returns {Promise<Object>} - Cleanup results
 */
export const cleanupOldFiles = async (daysOld = 90, maxInactivity = 30) => {
  try {
    const results = {
      processed: 0,
      deleted: 0,
      errors: 0,
      savedSpace: 0
    };
    
    // This would typically be run as a cloud function
    // For now, it's a utility that can be called manually
    
    console.log('File cleanup would process files older than', daysOld, 'days or inactive for', maxInactivity, 'days');
    
    // In a real implementation, you would:
    // 1. Query file-metadata collection for old files
    // 2. Check lastAccessed dates
    // 3. Delete files that meet criteria
    // 4. Update results
    
    return results;
  } catch (error) {
    console.error('Failed to cleanup old files:', error);
    return { processed: 0, deleted: 0, errors: 1, savedSpace: 0 };
  }
};

/**
 * Generate file thumbnail URL for supported types
 * @param {Object} fileMetadata - File metadata object
 * @returns {string|null} - Thumbnail URL or null
 */
export const generateThumbnailUrl = (fileMetadata) => {
  if (!fileMetadata) return null;
  
  const { fileType, fileName } = fileMetadata;
  
  // For images, we might have stored thumbnails
  if (fileType?.startsWith('image/')) {
    // Return thumbnail path if it exists
    return fileMetadata.thumbnailUrl || null;
  }
  
  // For videos, we might generate thumbnails
  if (fileType?.startsWith('video/')) {
    return fileMetadata.thumbnailUrl || null;
  }
  
  // For other file types, return null (use file type icon instead)
  return null;
};

/**
 * Check if file can be previewed in browser
 * @param {Object} fileMetadata - File metadata object
 * @returns {boolean} - True if file can be previewed
 */
export const canPreviewFile = (fileMetadata) => {
  if (!fileMetadata) return false;
  
  const { fileType } = fileMetadata;
  
  // Image files can be previewed
  if (fileType?.startsWith('image/')) {
    return true;
  }
  
  // PDF files can be previewed
  if (fileType === 'application/pdf') {
    return true;
  }
  
  // Text files can be previewed
  if (fileType?.startsWith('text/')) {
    return true;
  }
  
  // Video files can be previewed
  if (fileType?.startsWith('video/')) {
    return true;
  }
  
  // Audio files can be previewed
  if (fileType?.startsWith('audio/')) {
    return true;
  }
  
  return false;
};

/**
 * Get file preview URL or embed code
 * @param {Object} fileMetadata - File metadata object
 * @returns {Object} - Preview configuration
 */
export const getFilePreviewConfig = (fileMetadata) => {
  if (!fileMetadata || !canPreviewFile(fileMetadata)) {
    return { canPreview: false };
  }
  
  const { fileType, fileName, url } = fileMetadata;
  
  if (fileType?.startsWith('image/')) {
    return {
      canPreview: true,
      type: 'image',
      url: url,
      component: 'img'
    };
  }
  
  if (fileType === 'application/pdf') {
    return {
      canPreview: true,
      type: 'pdf',
      url: url,
      component: 'iframe',
      embedUrl: `${url}#view=FitH`
    };
  }
  
  if (fileType?.startsWith('video/')) {
    return {
      canPreview: true,
      type: 'video',
      url: url,
      component: 'video'
    };
  }
  
  if (fileType?.startsWith('audio/')) {
    return {
      canPreview: true,
      type: 'audio',
      url: url,
      component: 'audio'
    };
  }
  
  if (fileType?.startsWith('text/')) {
    return {
      canPreview: true,
      type: 'text',
      url: url,
      component: 'iframe'
    };
  }
  
  return { canPreview: false };
};

/**
 * Format file size to human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file age in human readable format
 * @param {Date} uploadDate - Upload date
 * @returns {string} - Human readable age
 */
export const getFileAge = (uploadDate) => {
  if (!uploadDate) return 'Unknown';
  
  const now = new Date();
  const diffTime = Math.abs(now - uploadDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
};

/**
 * Check if user can access file
 * @param {Object} fileMetadata - File metadata
 * @param {string} userEmail - User's email
 * @param {Array} chatUsers - Users in the chat
 * @returns {boolean} - True if user can access file
 */
export const canAccessFile = (fileMetadata, userEmail, chatUsers = []) => {
  if (!fileMetadata || !userEmail) return false;
  
  // File uploader can always access
  if (fileMetadata.uploadedBy === userEmail) {
    return true;
  }
  
  // Users in the same chat can access
  if (chatUsers.includes(userEmail)) {
    return true;
  }
  
  return false;
};

/**
 * Generate file sharing link (if implemented)
 * @param {string} metadataId - File metadata ID
 * @param {number} expirationHours - Hours until link expires
 * @returns {string} - Sharing link
 */
export const generateSharingLink = (metadataId, expirationHours = 24) => {
  // This would generate a temporary sharing link
  // For now, return a placeholder
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/shared/${metadataId}?expires=${Date.now() + (expirationHours * 60 * 60 * 1000)}`;
};

/**
 * Validate file sharing link
 * @param {string} linkId - Link identifier
 * @param {number} expirationTimestamp - Expiration timestamp
 * @returns {boolean} - True if link is valid
 */
export const validateSharingLink = (linkId, expirationTimestamp) => {
  if (!linkId || !expirationTimestamp) return false;
  
  const now = Date.now();
  return now < expirationTimestamp;
};

/**
 * Get file statistics for a chat
 * @param {string} chatId - Chat ID
 * @returns {Promise<Object>} - File statistics
 */
export const getChatFileStats = async (chatId) => {
  try {
    // This would query the file-metadata collection
    // For now, return placeholder data
    return {
      totalFiles: 0,
      totalSize: 0,
      fileTypes: {},
      mostActiveUploader: null,
      oldestFile: null,
      newestFile: null,
      averageFileSize: 0
    };
  } catch (error) {
    console.error('Failed to get chat file stats:', error);
    return null;
  }
};

/**
 * Compress image file before upload (client-side)
 * @param {File} file - Image file to compress
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<File>} - Compressed file
 */
export const compressImage = (file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      resolve(file); // Return original if not an image
      return;
    }
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          resolve(compressedFile);
        } else {
          resolve(file); // Return original if compression fails
        }
      }, file.type, quality);
    };
    
    img.onerror = () => resolve(file); // Return original if loading fails
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Extract metadata from file
 * @param {File} file - File to analyze
 * @returns {Promise<Object>} - Extracted metadata
 */
export const extractFileMetadata = async (file) => {
  const metadata = {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified),
    extension: file.name.split('.').pop()?.toLowerCase()
  };
  
  // For images, try to get dimensions
  if (file.type.startsWith('image/')) {
    try {
      const dimensions = await getImageDimensions(file);
      metadata.width = dimensions.width;
      metadata.height = dimensions.height;
      metadata.aspectRatio = dimensions.width / dimensions.height;
    } catch (error) {
      console.log('Could not extract image dimensions:', error);
    }
  }
  
  // For videos, could extract duration, etc.
  // For audio, could extract duration, bitrate, etc.
  
  return metadata;
};

/**
 * Get image dimensions
 * @param {File} file - Image file
 * @returns {Promise<Object>} - Width and height
 */
const getImageDimensions = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Create file preview modal data
 * @param {Object} file - File object
 * @returns {Object} - Modal configuration
 */
export const createFilePreviewModal = (file) => {
  const previewConfig = getFilePreviewConfig(file);
  
  return {
    isOpen: true,
    file: file,
    title: file.name,
    canPreview: previewConfig.canPreview,
    previewType: previewConfig.type,
    previewUrl: previewConfig.url,
    component: previewConfig.component,
    embedUrl: previewConfig.embedUrl,
    downloadUrl: file.url,
    fileSize: formatFileSize(file.size),
    uploadDate: file.uploadedAt ? getFileAge(file.uploadedAt) : 'Unknown',
    uploader: file.uploadedBy
  };
};

export default {
  trackFileDownload,
  updateVirusScanStatus,
  deleteFileCompletely,
  getEnhancedFileMetadata,
  cleanupOldFiles,
  generateThumbnailUrl,
  canPreviewFile,
  getFilePreviewConfig,
  formatFileSize,
  getFileAge,
  canAccessFile,
  generateSharingLink,
  validateSharingLink,
  getChatFileStats,
  compressImage,
  extractFileMetadata,
  createFilePreviewModal
};