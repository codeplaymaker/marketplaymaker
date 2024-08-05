// StorageComponent.js
import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { storage } from '../firebase';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';

const StorageComponent = () => {
  const { user } = useAuth();
  const [fileUrl, setFileUrl] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (user) {
      const storageRef = ref(storage, 'path/to/your/file');
      getDownloadURL(storageRef)
        .then((url) => {
          setFileUrl(url);
          console.log('File available at', url);
        })
        .catch((error) => {
          console.error('Error accessing file:', error);
        });
    }
  }, [user]);

  const handleFileUpload = async () => {
    if (user && file) {
      const storageRef = ref(storage, `uploads/${user.uid}/${file.name}`);
      try {
        const snapshot = await uploadBytes(storageRef, file);
        console.log('Uploaded a blob or file!', snapshot);
        const downloadUrl = await getDownloadURL(storageRef);
        setFileUrl(downloadUrl);
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleFileUpload}>Upload File</button>
      {fileUrl && <img src={fileUrl} alt="Uploaded file" />}
    </div>
  );
};

export default StorageComponent;
