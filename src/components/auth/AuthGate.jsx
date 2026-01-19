import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/stores/useAuthStore';
import { toast } from "sonner";

const AuthGate = ({ children }) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const hasToastShown = useRef(false);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    if (!user) {
      if (!hasToastShown.current) {
        toast.error("Please sign in to access your account.");
        hasToastShown.current = true;
      }
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
