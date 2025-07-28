// components/Login.jsx - Updated with ImgBB integration
import React, { useState } from 'react';
import Head from 'next/head';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMessage, faUser, faCamera, faSpinner } from '@fortawesome/free-solid-svg-icons';
import Button from '../components/Button';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, db } from '../firebaseconfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/router';
import { 
  uploadToImgBB, 
  validateImageFile, 
  createImagePreview, 
  generateFallbackAvatar 
} from '../utlis/imgbbUpload';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [profilePic, setProfilePic] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [error, setError] = useState(null);
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const router = useRouter();

    // ImgBB API key - You need to get this from https://api.imgbb.com/
    const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY || 'YOUR_IMGBB_API_KEY_HERE';

    const addProgress = (message) => {
        console.log('PROGRESS:', message);
        setUploadProgress(prev => prev + '\n' + message);
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setError(null);
        setUploadProgress('');
        setIsLoading(true);
        
        try {
            if (isLogin) {
                addProgress('Attempting to login...');
                await signInWithEmailAndPassword(auth, email, password);
                addProgress('Login successful');
                router.push('/');
            } else {
                addProgress('Starting signup process...');
                
                // Validate inputs
                if (!username.trim()) {
                    throw new Error('Username is required');
                }
                if (username.length < 3) {
                    throw new Error('Username must be at least 3 characters');
                }

                if (!IMGBB_API_KEY || IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY_HERE') {
                    throw new Error('ImgBB API key is not configured. Please add NEXT_PUBLIC_IMGBB_API_KEY to your environment variables.');
                }
                
                // Create user account
                addProgress('Creating user account...');
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                addProgress(`User account created successfully. UID: ${user.uid}`);
                
                let finalPhotoURL = null;
                
                // Handle profile picture upload to ImgBB
                if (profilePic) {
                    try {
                        addProgress('Starting profile picture upload to ImgBB...');
                        addProgress(`File details: ${profilePic.name}, ${(profilePic.size / 1024).toFixed(1)}KB, ${profilePic.type}`);
                        
                        // Validate file again before upload
                        const validation = validateImageFile(profilePic);
                        if (!validation.isValid) {
                            throw new Error(validation.error);
                        }
                        
                        addProgress('Uploading to ImgBB...');
                        finalPhotoURL = await uploadToImgBB(profilePic, IMGBB_API_KEY);
                        addProgress(`✅ Image uploaded successfully to ImgBB: ${finalPhotoURL}`);
                        
                    } catch (uploadError) {
                        console.error('ImgBB upload failed:', uploadError);
                        addProgress(`❌ ImgBB upload failed: ${uploadError.message}`);
                        
                        // Use fallback avatar if upload fails
                        setError('Profile picture upload failed, but account was created. Using default avatar.');
                        finalPhotoURL = generateFallbackAvatar(username, 200);
                        addProgress(`Using fallback avatar: ${finalPhotoURL}`);
                    }
                } else {
                    // Generate fallback avatar if no image selected
                    finalPhotoURL = generateFallbackAvatar(username, 200);
                    addProgress(`No profile picture selected. Using fallback avatar: ${finalPhotoURL}`);
                }
                
                // Update Firebase Auth profile
                addProgress('Updating Firebase Auth profile...');
                await updateProfile(user, {
                    displayName: username,
                    photoURL: finalPhotoURL
                });
                addProgress('✅ Firebase Auth profile updated successfully');
                
                // Create/Update Firestore user document with ImgBB URL
                addProgress('Creating Firestore user document...');
                try {
                    const userDocRef = doc(db, 'users', user.uid);
                    await setDoc(userDocRef, {
                        uid: user.uid,
                        email: user.email.toLowerCase(),
                        displayName: username,
                        photoURL: finalPhotoURL,
                        profilePictureSource: profilePic ? 'imgbb' : 'fallback',
                        isOnline: true,
                        lastSeen: serverTimestamp(),
                        createdAt: serverTimestamp(),
                        emailVerified: user.emailVerified
                    }, { merge: true });
                    
                    addProgress('✅ Firestore user document created successfully');
                } catch (firestoreError) {
                    console.error('Firestore document creation failed:', firestoreError);
                    addProgress(`⚠️ Firestore document creation failed: ${firestoreError.message}`);
                    // Continue anyway as this isn't critical for auth
                }
                
                // Wait for profile update to propagate
                addProgress('Waiting for profile update to propagate...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Force reload user profile
                addProgress('Reloading Firebase Auth profile...');
                await user.reload();
                
                // Get fresh user data
                const updatedUser = auth.currentUser;
                addProgress(`Updated profile check:`);
                addProgress(`- Name: ${updatedUser.displayName}`);
                addProgress(`- Photo: ${updatedUser.photoURL}`);
                addProgress(`- Email: ${updatedUser.email}`);
                
                // Verify the profile was updated correctly
                if (updatedUser.displayName === username && updatedUser.photoURL === finalPhotoURL) {
                    addProgress('✅ Profile update verification successful');
                } else {
                    addProgress('⚠️ Profile update verification failed');
                    addProgress(`Expected: name="${username}", photo="${finalPhotoURL}"`);
                    addProgress(`Actual: name="${updatedUser.displayName}", photo="${updatedUser.photoURL}"`);
                }
                
                // Set up auth state listener for navigation
                addProgress('Setting up navigation...');
                const unsubscribe = onAuthStateChanged(auth, (authUser) => {
                    if (authUser && authUser.displayName) {
                        addProgress('✅ Auth state confirmed, navigating to home...');
                        unsubscribe(); // Clean up listener
                        setTimeout(() => {
                            setIsLoading(false);
                            router.push('/');
                        }, 1000);
                    }
                });
                
                // Fallback navigation after 8 seconds
                setTimeout(() => {
                    addProgress('⏰ Fallback navigation triggered');
                    unsubscribe();
                    setIsLoading(false);
                    router.push('/');
                }, 8000);
                
                return; // Don't set loading to false yet
            }
        } catch (err) {
            console.error('Authentication error:', err);
            addProgress(`❌ Fatal Error: ${err.message}`);
            
            // Handle specific Firebase Auth errors
            const errorMessages = {
                'auth/email-already-in-use': 'This email is already registered. Please use a different email or try logging in.',
                'auth/weak-password': 'Password should be at least 6 characters long.',
                'auth/invalid-email': 'Please enter a valid email address.',
                'auth/user-not-found': 'No account found with this email. Please check your email or sign up.',
                'auth/wrong-password': 'Incorrect password. Please try again.',
                'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
                'auth/network-request-failed': 'Network error. Please check your internet connection.',
            };
            
            setError(errorMessages[err.code] || err.message);
        } finally {
            if (isLogin) {
                setIsLoading(false);
            }
            // For signup, loading will be set to false after navigation
        }
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            console.log('File selected:', {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: new Date(file.lastModified)
            });
            
            // Validate file
            const validation = validateImageFile(file);
            if (!validation.isValid) {
                setError(validation.error);
                return;
            }

            setProfilePic(file);
            setError(null);
            
            // Create preview
            try {
                const preview = await createImagePreview(file);
                setPreviewImage(preview);
                console.log('✅ Preview created successfully');
            } catch (previewError) {
                console.error('❌ Failed to create preview:', previewError);
                setError('Failed to process image file');
            }
        }
    };

    const switchAuthMode = () => {
        setIsLogin(!isLogin);
        setError(null);
        setUploadProgress('');
        setUsername('');
        setProfilePic(null);
        setPreviewImage(null);
    };

    const clearImage = () => {
        setProfilePic(null);
        setPreviewImage(null);
        setError(null);
        // Reset the file input
        const fileInput = document.getElementById('profilePic');
        if (fileInput) fileInput.value = '';
    };

    return (
        <>
            <Head>
                <title>Chat App | {isLogin ? 'Login' : 'Sign Up'}</title>
            </Head>
            <main className='w-full font-disp h-screen flex justify-center flex-col items-center bg-gradient-to-br from-mSec to-dSec'>
                <div className='lg:px-20 lg:pb-12 px-10 py-8 bg-gray-700 text-white text-lg shadow-xl shadow-gray-800 rounded-3xl text-center max-w-lg w-full mx-4'>
                    {/* Title */}
                    <h1 className="my-4 lg:text-3xl text-2xl mb-10">Chat App By Prio</h1>
                    
                    {/* Profile Picture Upload (Signup only) */}
                    {!isLogin && (
                        <div className='flex justify-center mb-6'>
                            <div className='relative'>
                                <label htmlFor="profilePic" className="cursor-pointer group">
                                    <div className="w-24 h-24 rounded-full bg-dPri flex items-center justify-center overflow-hidden border-4 border-gray-700 hover:border-gray-500 transition-all">
                                        {previewImage ? (
                                            <img 
                                                src={previewImage} 
                                                alt="Profile preview" 
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <FontAwesomeIcon 
                                                icon={faUser} 
                                                className="text-4xl text-white"
                                            />
                                        )}
                                    </div>
                                    <div className="absolute bottom-0 right-0 bg-lPri p-2 rounded-full group-hover:bg-dPri transition-all">
                                        <FontAwesomeIcon 
                                            icon={faCamera} 
                                            className="text-white text-sm"
                                        />
                                    </div>
                                </label>
                                
                                {/* Clear image button */}
                                {previewImage && (
                                    <button
                                        type="button"
                                        onClick={clearImage}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                                    >
                                        ×
                                    </button>
                                )}
                                
                                <input 
                                    id="profilePic"
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    )}

                    {/* Message Icon (Login only) */}
                    {isLogin && (
                        <div className='flex justify-center mb-6'>
                            <div className='p-6 bg-dPri rounded-full hover:bg-lPri transition-all'>
                                <FontAwesomeIcon icon={faMessage} className='text-4xl text-white' />
                            </div>
                        </div>
                    )}

                    {/* Auth Form */}
                    <form onSubmit={handleAuth} className='mt-6 space-y-4'>
                        {!isLogin && (
                            <div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder='Username'
                                    className='p-2 w-full bg-transparent outline-0 border-b-2 border-dPri hover:border-lPri focus:border-lPri transition-all text-white placeholder-gray-300'
                                    required
                                    minLength="3"
                                    maxLength="20"
                                    disabled={isLoading}
                                />
                            </div>
                        )}

                        <div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder='Email'
                                className='p-2 w-full bg-transparent outline-0 border-b-2 border-dPri hover:border-lPri focus:border-lPri transition-all text-white placeholder-gray-300'
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder='Password'
                                className='p-2 w-full bg-transparent outline-0 border-b-2 border-dPri hover:border-lPri focus:border-lPri transition-all text-white placeholder-gray-300'
                                required
                                minLength="6"
                                disabled={isLoading}
                            />
                        </div>

                        {error && (
                            <div className='text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-400/30'>
                                {error}
                            </div>
                        )}

                        

                        <Button 
                            type="submit" 
                            className="w-full mt-6 py-3 bg-dPri hover:bg-lPri text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className='flex items-center justify-center'>
                                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-3" />
                                    {isLogin ? 'Signing in...' : 'Creating account...'}
                                </span>
                            ) : isLogin ? 'Login' : 'Sign Up'}
                        </Button>
                    </form>

                    <div className='mt-6 text-sm'>
                        <button 
                            onClick={switchAuthMode}
                            className="text-lPri hover:text-dPri underline cursor-pointer disabled:opacity-50"
                            type="button"
                            disabled={isLoading}
                        >
                            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
                        </button>
                    </div>

                    {/* API Key notice */}
                    {!isLogin && (!IMGBB_API_KEY || IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY_HERE') && (
                        <div className="mt-4 text-xs text-yellow-400 bg-yellow-900/20 p-2 rounded border border-yellow-400/30">
                            ⚠️ ImgBB API key not configured. Profile pictures will use fallback avatars.
                            <br />
                            Get your free API key from <a href="https://api.imgbb.com/" target="_blank" rel="noopener noreferrer" className="underline">api.imgbb.com</a>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
};

export default Login;