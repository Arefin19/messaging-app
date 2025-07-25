// utils/getOtherUser.js
const getOtherUser = (users, currentUserEmail) => {
    // Check if inputs are valid
    if (!Array.isArray(users) || !users.length) return null;
    if (typeof currentUserEmail !== 'string') return users[0]; // Fallback to first user
    
    // Clean and compare emails
    const currentEmail = currentUserEmail.toLowerCase().trim();
    return users.find(user => 
      user && typeof user === 'string' && 
      user.toLowerCase().trim() !== currentEmail
    );
  };
  
  export default getOtherUser;