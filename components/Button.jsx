import React from 'react'

const Button = ({ onClick, children, type = "button", disabled = false, className = "", variant = "default" }) => {
  const baseClasses = "block mx-auto shadow-lg outline-0 transition-all px-6 py-2 my-8 rounded-md";
  
  const variantClasses = {
    default: "shadow-gray-800 bg-dPri hover:bg-lPri hover:scale-x-105",
    primary: "shadow-blue-800 bg-blue-500 hover:bg-blue-600 text-white",
    secondary: "shadow-gray-600 bg-gray-500 hover:bg-gray-600 text-white"
  };
  
  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";
  
  const finalClasses = `${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`;

  return (
    <button 
      type={type}
      onClick={disabled ? undefined : (onClick ? () => onClick() : undefined)} 
      className={finalClasses}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default Button