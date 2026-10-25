import { useEffect, useState } from 'react';
import { getIdTokenResult } from 'firebase/auth';
import { useAuthStore } from '@/stores';

/** Chỉ điều khiển hiển thị nút menu; Firestore Rules luôn là lớp phân quyền thật. */
export function useOwnerAccess(): boolean {
  const user = useAuthStore(s => s.user);
  const isDemo = useAuthStore(s => s.isDemo);
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    let alive = true;
    setIsOwner(false);
    if (user && !isDemo) {
      void getIdTokenResult(user).then(token => {
        if (alive) setIsOwner(token.claims.admin === true && token.claims.owner === true);
      }).catch(() => { if (alive) setIsOwner(false); });
    }
    return () => { alive = false; };
  }, [user, isDemo]);
  return isOwner;
}
