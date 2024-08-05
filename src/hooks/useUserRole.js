import { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const useUserRole = () => {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const db = getFirestore();
          const userDoc = await getDoc(doc(db, 'users', user.uid));

          if (userDoc.exists()) {
            setRole(userDoc.data().role);
          } else {
            setRole('user'); // Default role if no role is set
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setRole('user'); // Default to 'user' on error
        }
      } else {
        setRole(null); // No user is signed in
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { role, loading };
};

export default useUserRole;
