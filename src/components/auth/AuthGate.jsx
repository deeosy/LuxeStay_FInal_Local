import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/stores/useAuthStore';

const AuthGate = ({ children }) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [initialized, user, navigate]);

  if (!initialized) {
    return null;
  }

  if (!user) {
    return null;
  }

  return children;
};

export default AuthGate;
