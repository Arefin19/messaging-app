// utils/fileUpload.js - File upload utility using localStorage
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseconfig';

/**
 * File type categories and their allowed extensions
 */
export const FILE_CATEGORIES = {
  IMAGES: {
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'],
    maxSize: 5 * 1024 * 1024, // 5MB
    icon: '🖼️'
  },
  VIDEOS: {
    extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'],
    maxSize: 50 * 1024 * 1024, // 50MB
    icon: '🎥'
  },
  AUDIO: {
    extensions: ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'],
    maxSize: 20 * 1024 * 1024, // 20MB
    icon: '🎵'
  },
  DOCUMENTS: {
    extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'],
    maxSize: 10 * 1024 * 1024, // 10MB
    icon: '📄'
  },
  ARCHIVES: {
    extensions: ['zip', 'rar', '7z', 'tar', 'gz'],
    maxSize: 25 * 1024 * 1024, // 25MB
    icon: '📦'
  },
  CODE: {
    extensions: ['js', 'html', 'css', 'py', 'java', 'cpp', 'c', 'php', 'json', 'xml'],
    maxSize: 5 * 1024 * 1024, // 5MB
    icon: '💻'
  }
};

/**
 * Get file category based on extension
 * @param {string} fileName - Name of the file
 * @returns {Object} - File category info
 */
export const getFileCategory = (fileName) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  for (const [category, info] of Object.entries(FILE_CATEGORIES)) {
    if (info.extensions.includes(extension)) {
      return {
        category,
        ...info
      };
    }
  }
  
  return {
    category: 'OTHER',
    extensions: [],
    maxSize: 15 * 1024 * 1024, // 15MB
    icon: '📎'
  };
};

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @returns {Object} - Validation result
 */
export const validateFile = (file) => {
  console.log('Validating file:', {
    name: file?.name,
    size: file?.size,
    type: file?.type
  });

  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }
  
  const fileCategory = getFileCategory(file.name);
  
  // Check file size
  if (file.size > fileCategory.maxSize) {
    return { 
      isValid: false, 
      error: `File size should be less than ${(fileCategory.maxSize / (1024 * 1024)).toFixed(1)}MB for ${fileCategory.category.toLowerCase()} files` 
    };
  }
  
  // Check for empty files
  if (file.size === 0) {
    return { isValid: false, error: 'File is empty' };
  }
  
  // Check filename length
  if (file.name.length > 255) {
    return { isValid: false, error: 'Filename is too long (max 255 characters)' };
  }
  
  console.log('✅ File validation passed for:', fileCategory.category);
  return { 
    isValid: true, 
    error: null, 
    category: fileCategory 
  };
};

/**
 * Convert file to base64 string
 * @param {File} file - File to convert
 * @returns {Promise<string>} - Base64 string
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * Generate unique file ID
 * @returns {string} - Unique file ID
 */
const generateFileId = () => {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Store file in localStorage
 * @param {File} file - File to store
 * @param {string} chatId - Chat ID for organizing files
 * @param {string} userEmail - User's email
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} - File data with localStorage reference
 */
export const uploadFileToStorage = async (file, chatId, userEmail, onProgress = null) => {
  try {
    console.log('Starting localStorage file storage:', {
      fileName: file.name,
      fileSize: file.size,
      chatId,
      userEmail
    });

    // Validate file first
    const validation = validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Report progress start
    if (onProgress) {
      onProgress({ progress: 0 });
    }

    // Convert file to base64
    const base64Data = await fileToBase64(file);
    
    // Report progress
    if (onProgress) {
      onProgress({ progress: 50 });
    }

    // Generate unique file ID
    const fileId = generateFileId();
    
    // Create file data object
    const fileData = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      data: base64Data,
      uploadedBy: userEmail,
      uploadedAt: new Date().toISOString(),
      chatId: chatId,
      category: validation.category
    };

    // Store in localStorage
    try {
      const storageKey = `chatFile_${fileId}`;
      const dataString = JSON.stringify(fileData);
      localStorage.setItem(storageKey, dataString);
      
      // Also maintain an index of files for this chat
      const chatFilesKey = `chatFiles_${chatId}`;
      const existingFiles = JSON.parse(localStorage.getItem(chatFilesKey) || '[]');
      existingFiles.push({
        fileId: fileId,
        fileName: file.name,
        uploadedAt: fileData.uploadedAt,
        uploadedBy: userEmail
      });
      localStorage.setItem(chatFilesKey, JSON.stringify(existingFiles));
      
    } catch (storageError) {
      throw new Error('Failed to store file in localStorage. File might be too large.');
    }

    // Report completion
    if (onProgress) {
      onProgress({ progress: 100 });
    }

    const result = {
      id: fileId,
      url: `localStorage://${fileId}`, // Custom URL format for localStorage
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedBy: userEmail,
      uploadedAt: new Date(),
      category: validation.category,
      storageType: 'localStorage'
    };
    
    console.log('✅ File stored successfully in localStorage:', {
      name: result.name,
      id: result.id,
      size: result.size
    });
    
    return result;

  } catch (error) {
    console.error('localStorage file storage error:', error);
    throw new Error(`Failed to store file: ${error.message}`);
  }
};

/**
 * Retrieve file from localStorage
 * @param {string} fileId - File ID
 * @returns {Object|null} - File data or null if not found
 */
export const getFileFromStorage = (fileId) => {
  try {
    const storageKey = `chatFile_${fileId}`;
    const fileDataString = localStorage.getItem(storageKey);
    
    if (!fileDataString) {
      console.warn('File not found in localStorage:', fileId);
      return null;
    }
    
    return JSON.parse(fileDataString);
  } catch (error) {
    console.error('Error retrieving file from localStorage:', error);
    return null;
  }
};

/**
 * Create file metadata document in Firestore (optional)
 * @param {Object} fileData - File data from upload
 * @param {string} chatId - Chat ID
 * @returns {Promise<string>} - Document ID of the created metadata
 */
export const createFileMetadata = async (fileData, chatId) => {
  try {
    console.log('Creating file metadata:', {
      fileName: fileData.name,
      fileSize: fileData.size,
      fileType: fileData.type,
      uploadedBy: fileData.uploadedBy,
      chatId: chatId
    });

    const metadataRef = collection(db, 'file-metadata');
    
    const metadataDoc = {
      fileId: fileData.id,
      fileName: fileData.name,
      fileSize: fileData.size,
      fileType: fileData.type,
      uploadedBy: fileData.uploadedBy,
      uploadedAt: serverTimestamp(),
      chatId: chatId,
      downloadCount: 0,
      storageType: 'localStorage',
      category: fileData.category.category
    };
    
    const docRef = await addDoc(metadataRef, metadataDoc);
    console.log('✅ File metadata created:', docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error('Failed to create file metadata:', error);
    console.warn('Continuing without metadata creation');
    return null;
  }
};

/**
 * Delete file from localStorage
 * @param {string} fileId - File ID
 * @param {string} chatId - Chat ID
 * @returns {boolean} - Success status
 */
export const deleteFile = (fileId, chatId) => {
  try {
    // Remove file data
    const storageKey = `chatFile_${fileId}`;
    localStorage.removeItem(storageKey);
    
    // Update chat files index
    if (chatId) {
      const chatFilesKey = `chatFiles_${chatId}`;
      const existingFiles = JSON.parse(localStorage.getItem(chatFilesKey) || '[]');
      const updatedFiles = existingFiles.filter(f => f.fileId !== fileId);
      localStorage.setItem(chatFilesKey, JSON.stringify(updatedFiles));
    }
    
    console.log('✅ File deleted successfully from localStorage');
    return true;
  } catch (error) {
    console.error('Failed to delete file from localStorage:', error);
    return false;
  }
};

/**
 * Format file size to human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file icon based on category
 * @param {string} fileName - File name
 * @returns {string} - File icon emoji
 */
export const getFileIcon = (fileName) => {
  const category = getFileCategory(fileName);
  return category.icon;
};

/**
 * Check if file is an image
 * @param {string} fileName - File name
 * @returns {boolean} - True if file is an image
 */
export const isImageFile = (fileName) => {
  const category = getFileCategory(fileName);
  return category.category === 'IMAGES';
};

/**
 * Get download URL for localStorage files
 * @param {string} fileId - File ID
 * @returns {string|null} - Download URL or null if file not found
 */
export const getDownloadUrl = (fileId) => {
  const fileData = getFileFromStorage(fileId);
  if (!fileData) {
    return null;
  }
  
  // Return the base64 data URL
  return fileData.data;
};

/**
 * Download file from localStorage
 * @param {string} fileId - File ID
 * @param {string} fileName - Optional custom filename
 */
export const downloadFileFromStorage = (fileId, fileName = null) => {
  const fileData = getFileFromStorage(fileId);
  if (!fileData) {
    console.error('File not found for download:', fileId);
    return;
  }
  
  try {
    // Create download link
    const link = document.createElement('a');
    link.href = fileData.data;
    link.download = fileName || fileData.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ File download initiated:', fileData.name);
  } catch (error) {
    console.error('Failed to download file:', error);
  }
};

/**
 * Get storage usage info
 * @returns {Object} - Storage usage information
 */
export const getStorageInfo = () => {
  let totalSize = 0;
  let fileCount = 0;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('chatFile_')) {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += value.length;
        fileCount++;
      }
    }
  }
  
  // Convert to approximate file size (base64 is ~33% larger than original)
  const approximateFileSize = Math.round(totalSize * 0.75);
  
  return {
    totalFiles: fileCount,
    storageUsed: totalSize,
    approximateFileSize: approximateFileSize,
    formattedSize: formatFileSize(approximateFileSize)
  };
};

/**
 * Clear all stored files (use with caution)
 * @param {string} chatId - Optional: clear files for specific chat only
 */
export const clearStoredFiles = (chatId = null) => {
  if (chatId) {
    // Clear files for specific chat
    const chatFilesKey = `chatFiles_${chatId}`;
    const chatFiles = JSON.parse(localStorage.getItem(chatFilesKey) || '[]');
    
    chatFiles.forEach(fileInfo => {
      localStorage.removeItem(`chatFile_${fileInfo.fileId}`);
    });
    
    localStorage.removeItem(chatFilesKey);
  } else {
    // Clear all chat files
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('chatFile_') || key.startsWith('chatFiles_'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
  
  console.log('✅ Stored files cleared');
};