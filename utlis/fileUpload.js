// utils/fileUpload.js - Enhanced file upload utility for Firebase Storage and ImgBB
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebaseconfig';
import { addDoc, collection, doc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
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
 * Upload file to Firebase Storage
 * @param {File} file - File to upload
 * @param {string} chatId - Chat ID for organizing files
 * @param {string} userEmail - User's email
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} - Upload result with download URL and metadata
 */
export const uploadFileToStorage = async (file, chatId, userEmail, onProgress = null) => {
  try {
    console.log('Starting Firebase Storage upload:', {
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

    // Create unique filename to prevent conflicts
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${safeName}`;
    
    // Create storage reference
    const storageRef = ref(storage, `chat-files/${chatId}/${fileName}`);
    
    // Set metadata
    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedBy: userEmail,
        originalName: file.name,
        chatId: chatId,
        uploadTimestamp: timestamp.toString()
      }
    };

    // Start upload with resumable upload
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);
    
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        // Progress function
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress: ${progress.toFixed(1)}%`);
          
          if (onProgress) {
            onProgress({
              progress: progress,
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              state: snapshot.state
            });
          }
        },
        // Error function
        (error) => {
          console.error('Firebase Storage upload failed:', error);
          reject(new Error(`Upload failed: ${error.message}`));
        },
        // Complete function
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            const result = {
              url: downloadURL,
              name: file.name,
              size: file.size,
              type: file.type,
              uploadedBy: userEmail,
              uploadedAt: new Date(),
              category: validation.category,
              storageRef: uploadTask.snapshot.ref.fullPath
            };
            
            console.log('✅ File uploaded successfully to Firebase Storage:', {
              name: result.name,
              url: result.url,
              size: result.size
            });
            
            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to get download URL: ${error.message}`));
          }
        }
      );
    });

  } catch (error) {
    console.error('Firebase Storage upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Create file metadata document in Firestore
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
      fileName: fileData.name,
      fileSize: fileData.size,
      fileType: fileData.type,
      uploadedBy: fileData.uploadedBy,
      uploadedAt: serverTimestamp(),
      chatId: chatId,
      downloadCount: 0,
      virusScanStatus: 'pending',
      storageRef: fileData.storageRef,
      category: fileData.category.category
    };
    
    const docRef = await addDoc(metadataRef, metadataDoc);
    console.log('✅ File metadata created:', docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error('Failed to create file metadata:', error);
    // Don't throw here - file upload can succeed without metadata
    console.warn('Continuing without metadata creation');
    return null;
  }
};

/**
 * Delete file from storage and metadata
 * @param {string} storagePath - Storage reference path
 * @param {string} metadataId - Metadata document ID
 * @returns {Promise<boolean>} - Success status
 */
export const deleteFile = async (storagePath, metadataId) => {
  try {
    // Delete from storage
    if (storagePath) {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    }
    
    // Delete metadata (if provided)
    if (metadataId) {
      await deleteDoc(doc(db, 'file-metadata', metadataId));
    }
    
    console.log('✅ File deleted successfully');
    return true;
  } catch (error) {
    console.error('Failed to delete file:', error);
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
 * Generate thumbnail for image files
 * @param {File} file - Image file
 * @param {number} maxWidth - Maximum width for thumbnail
 * @param {number} maxHeight - Maximum height for thumbnail
 * @returns {Promise<string>} - Base64 thumbnail data URL
 */
export const generateThumbnail = (file, maxWidth = 150, maxHeight = 150) => {
  return new Promise((resolve, reject) => {
    if (!isImageFile(file.name)) {
      reject(new Error('File is not an image'));
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and export
      ctx.drawImage(img, 0, 0, width, height);
      const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
      
      resolve(thumbnail);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Batch upload multiple files
 * @param {FileList} files - Files to upload
 * @param {string} chatId - Chat ID
 * @param {string} userEmail - User's email
 * @param {Function} onProgress - Progress callback for each file
 * @param {Function} onFileComplete - Callback when each file completes
 * @returns {Promise<Array>} - Array of upload results
 */
export const batchUploadFiles = async (files, chatId, userEmail, onProgress = null, onFileComplete = null) => {
  const results = [];
  const errors = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      console.log(`Uploading file ${i + 1}/${files.length}: ${file.name}`);
      
      const result = await uploadFileToStorage(
        file, 
        chatId, 
        userEmail, 
        (progress) => {
          if (onProgress) {
            onProgress({
              fileIndex: i,
              fileName: file.name,
              ...progress,
              overallProgress: ((i + progress.progress / 100) / files.length) * 100
            });
          }
        }
      );
      
      // Create metadata (optional - don't fail if this fails)
      try {
        const metadataId = await createFileMetadata(result, chatId);
        if (metadataId) {
          result.metadataId = metadataId;
        }
      } catch (metadataError) {
        console.warn('Metadata creation failed, but file upload succeeded:', metadataError);
      }
      
      results.push(result);
      
      if (onFileComplete) {
        onFileComplete(result, i, null);
      }
      
      console.log(`✅ File ${i + 1}/${files.length} uploaded successfully`);
      
    } catch (error) {
      console.error(`❌ Failed to upload file ${i + 1}/${files.length}:`, error);
      errors.push({ file: file.name, error: error.message });
      
      if (onFileComplete) {
        onFileComplete(null, i, error);
      }
    }
  }
  
  return {
    results,
    errors,
    successCount: results.length,
    errorCount: errors.length
  };
};