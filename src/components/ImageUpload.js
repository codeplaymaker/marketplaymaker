import React, { useState } from 'react';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import styled from 'styled-components';

const UploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const UploadButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #000;
  color: #fff;
  border: none;
  cursor: pointer;
  margin-top: 1rem;
  border-radius: 4px;
  transition: background-color 0.3s;

  &:hover:not(:disabled) {
    background-color: #333;
  }

  &:disabled {
    background-color: #999;
    cursor: not-allowed;
  }
`;

const ErrorText = styled.p`
  color: #d32f2f;
  font-size: 0.85rem;
  margin-top: 0.5rem;
`;

const ProgressText = styled.p`
  color: #666;
  font-size: 0.85rem;
  margin-top: 0.5rem;
`;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const ImageUpload = ({ onUpload }) => {
  const [image, setImage] = useState(null);
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setError('');
    const file = e.target.files[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP).');
      setImage(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File is too large. Maximum size is 5MB.');
      setImage(null);
      return;
    }

    setImage(file);
  };

  const handleUpload = async () => {
    if (!image) {
      setError('Please select a file first.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${image.name}`;
      const storageRef = ref(storage, `images/${uniqueName}`);
      const snapshot = await uploadBytes(storageRef, image);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      setUrl(downloadUrl);
      onUpload(downloadUrl);
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <UploadContainer>
      <label htmlFor="image-upload" style={{ cursor: 'pointer' }}>
        Choose Image
        <input
          id="image-upload"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleChange}
          style={{ display: 'block', marginTop: '0.5rem' }}
        />
      </label>
      <UploadButton onClick={handleUpload} disabled={!image || uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
      </UploadButton>
      {error && <ErrorText role="alert">{error}</ErrorText>}
      {uploading && <ProgressText>Uploading image...</ProgressText>}
      {url && <img src={url} alt="Uploaded preview" style={{ width: '100px', marginTop: '1rem', objectFit: 'contain' }} />}
    </UploadContainer>
  );
};

export default ImageUpload;
