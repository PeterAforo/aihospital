import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Loader2 } from 'lucide-react';
import { portalService } from '../services/portal.service';

const TENANT_ID = import.meta.env.VITE_TENANT_ID || '';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [mrn, setMrn] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setIsLoading(true);
    try {
      const result = await portalService.register(TENANT_ID, mrn, phone, password);
      setSuccess(result.message || 'Registration successful! You can now login.');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 mb-4">
            <Heart className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Register for Portal Access</h1>
          <p className="text-gray-500 mt-1">Use your MRN and phone number to verify your identity</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {success ? (
            <div className="text-center">
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>
              <button onClick={() => navigate('/login')} className="text-primary-600 font-medium hover:underline">
                Go to Login
              </button>
            </div>
          ) : (
            <>
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medical Record Number (MRN)</label>
                  <input type="text" value={mrn} onChange={(e) => setMrn(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="e.g. MRN-2024-0001" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (on file)</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="e.g. 0241234567" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Create Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Min 6 characters" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Re-enter password" required />
                </div>
                <button type="submit" disabled={isLoading}
                  className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isLoading ? <><Loader2 size={18} className="animate-spin" /> Registering...</> : 'Register'}
                </button>
              </form>
              <div className="mt-6 text-center">
                <button onClick={() => navigate('/login')} className="text-sm text-primary-600 font-medium hover:underline">
                  Already have access? Sign in
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
