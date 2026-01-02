import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (isValid: boolean) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'con123!@#') {
      onLogin(true);
      setError('');
    } else {
      setError('Invalid username or password');
      onLogin(false);
    }
  };

  console.log('LoginPage Rendering');

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#161811] text-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-[#1A1D15] rounded-xl border border-[#2A2E24] shadow-2xl">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-[#c0f425]">ASOForge Login</h1>
          <p className="text-gray-400">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-900/50 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-gray-300">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-[#11130e] border border-[#2A2E24] rounded-lg focus:ring-2 focus:ring-[#c0f425] focus:border-transparent outline-none text-white placeholder-gray-600 transition-all"
              placeholder="Enter username"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#11130e] border border-[#2A2E24] rounded-lg focus:ring-2 focus:ring-[#c0f425] focus:border-transparent outline-none text-white placeholder-gray-600 transition-all"
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-[#c0f425] hover:bg-[#a3d615] text-black font-bold rounded-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-[#c0f425] focus:ring-offset-[#161811]"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
