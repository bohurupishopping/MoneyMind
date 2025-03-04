import React from 'react';
import { AuthForm } from '../../components/auth/AuthForm';
import { useAuth } from '../../contexts/AuthContext';
import { LibraryBig } from 'lucide-react';

export function ResetPasswordPage() {
  const { resetPassword } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col justify-center items-center p-4">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-white rounded-full shadow-lg mb-4">
          <LibraryBig className="h-10 w-10 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-bold text-white">ArthoSutra</h1>
        <p className="text-white text-opacity-80 mt-2">Reset Your Password</p>
      </div>
      
      <AuthForm mode="reset" onSubmit={resetPassword} />
    </div>
  );
}