// utils/imgbbUpload.js - ImgBB image upload utility

/**
 * Upload image to ImgBB and return the URL
 * @param {File} file - Image file to upload
 * @param {string} apiKey - ImgBB API key
 * @returns {Promise<string>} - Image URL from ImgBB
 */
export const uploadToImgBB = async (file, apiKey) => {
  try {
    console.log('Starting ImgBB upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // Validate inputs
    if (!file) {
      throw new Error('No file provided');
    }
    
    if (!apiKey) {
      throw new Error('ImgBB API key is required');
    }

    // Create FormData for the API request
    const formData = new FormData();
    formData.append('image', file);
    formData.append('key', apiKey);
    
    // Optional: Set expiration (0 = never expires)
    formData.append('expiration', '0');

    console.log('Uploading to ImgBB...');

    // Upload to ImgBB
    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    console.log('ImgBB response:', result);

    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || `HTTP error! status: ${response.status}`);
    }

    const imageUrl = result.data.url;
    
    console.log('Image uploaded successfully to ImgBB:', imageUrl);
    
    // Test the uploaded image URL
    await testImageURL(imageUrl);
    
    return imageUrl;

  } catch (error) {
    console.error('ImgBB upload failed:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

/**
 * Test if an image URL is accessible
 * @param {string} url - Image URL to test
 * @returns {Promise<boolean>} - True if image loads successfully
 */
export const testImageURL = (url) => {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('No URL provided'));
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      console.log('✅ Image URL test passed:', url);
      resolve(true);
    };
    img.onerror = (error) => {
      console.error('❌ Image URL test failed:', url, error);
      reject(new Error('Image URL not accessible'));
    };
    
    img.crossOrigin = 'anonymous';
    img.src = url;
    
    // Timeout after 10 seconds
    setTimeout(() => {
      reject(new Error('Image load timeout'));
    }, 10000);
  });
};

/**
 * Validate image file before upload
 * @param {File} file - File to validate
 * @returns {Object} - Validation result
 */
export const validateImageFile = (file) => {
  console.log('Validating image file:', {
    name: file?.name,
    size: file?.size,
    type: file?.type
  });

  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }
  
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'Please select an image file' };
  }
  
  // Check file size (ImgBB free tier has 32MB limit, but we'll keep it reasonable)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { 
      isValid: false, 
      error: `Image size should be less than ${maxSize / (1024 * 1024)}MB` 
    };
  }
  
  // Check file extension
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return { 
      isValid: false, 
      error: 'Please select a valid image format (JPG, PNG, GIF, WebP, BMP)' 
    };
  }
  
  console.log('✅ File validation passed');
  return { isValid: true, error: null };
};

/**
 * Create image preview from file
 * @param {File} file - Image file
 * @returns {Promise<string>} - Data URL for preview
 */
export const createImagePreview = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      console.log('✅ Image preview created');
      resolve(reader.result);
    };
    reader.onerror = () => {
      console.error('❌ Failed to create image preview');
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Generate fallback avatar URL
 * @param {string} name - User name or email
 * @param {number} size - Avatar size
 * @returns {string} - Fallback avatar URL
 */
export const generateFallbackAvatar = (name, size = 40) => {
  const displayName = name || 'User';
  const encodedName = encodeURIComponent(displayName);
  return `https://ui-avatars.com/api/?name=${encodedName}&background=4F46E5&color=fff&size=${size}&bold=true`;
};