import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { useAuthStore, useThemeStore, useDataStore } from './stores';

export function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const user = useAuthStore((state) => state.user);
  const initializeUserData = useDataStore((state) => state.initializeUserData);
  const clearData = useDataStore((state) => state.clearData);

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => {
      unsubscribe();
    };
  }, [initializeAuth]);

  useEffect(() => {
    if (user?.uid) {
      initializeUserData(user.uid);
    } else {
      clearData();
    }
  }, [user?.uid, initializeUserData, clearData]);

  return <RouterProvider router={router} />;
}

export default App;
